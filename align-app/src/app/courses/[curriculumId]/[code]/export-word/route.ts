import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { computeCourseCoverage } from "@/lib/course-coverage";

// POST /courses/{id}/export-word per align-technical-design.md §3/§4 (E5) — AB-15 (instructor,
// own course) / AB-17 (program_admin, within program_admin_curriculum_scope). Word (.docx) only —
// PDF is never mentioned as an output format anywhere in the spec. Area of Improvement is always
// present (AB-18 cut from scope — no toggle to hide it) and references only real, already-reviewed
// data: the latest generateCourseOverview run, never freshly-generated AI text at export time.

export async function GET(_req: Request, { params }: { params: Promise<{ curriculumId: string; code: string }> }) {
  const { curriculumId, code } = await params;

  const user = await getCurrentUser();
  if (!user || user.account_status !== "approved") {
    return new Response("Unauthorized", { status: 401 });
  }

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const courseRef = curriculumRef.collection("courses").doc(code);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    return new Response("Not found", { status: 404 });
  }
  const course = courseSnap.data() as { name: string; instructor_id: string };

  const isOwningInstructor = user.effectiveRole === "instructor" && user.uid === course.instructor_id;
  const isScopedProgramAdmin =
    user.effectiveRole === "program_admin" && (user.program_admin_curriculum_scope ?? []).includes(curriculumId);
  if (!isOwningInstructor && !isScopedProgramAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const [coverage, mappingsSnap, latestOverviewSnap] = await Promise.all([
    computeCourseCoverage(curriculumId, code),
    curriculumRef.collection("clo_plo_mappings").get(),
    courseRef.collection("overview_logs").orderBy("created_at", "desc").limit(1).get(),
  ]);

  const prefix = `${code}_`;
  const ploIdsByClo = new Map<string, string[]>();
  for (const doc of mappingsSnap.docs) {
    if (!doc.id.startsWith(prefix)) continue;
    const { clo_id, plo_id } = doc.data() as { clo_id: string; plo_id: string };
    const list = ploIdsByClo.get(clo_id) ?? [];
    list.push(plo_id);
    ploIdsByClo.set(clo_id, list);
  }

  // "Evidence" section — only real confirmed teaching records (there is no file-attachment
  // feature yet, so no evidence files exist anywhere in the system to reference — per rule #4
  // this document must never invent evidence that doesn't exist).
  let confirmedRecords: { topic: string; weekNo: number; taughtAt: string }[] = [];
  if (coverage.totalTeachingRecordCount > 0) {
    const confirmedMatchesSnap = await adminDb
      .collection("ai_match_results")
      .where("course_id", "==", code)
      .where("state", "==", "confirmed")
      .get();
    const confirmedRecordIds = [...new Set(confirmedMatchesSnap.docs.map((d) => (d.data() as { teaching_record_id: string }).teaching_record_id))];
    const recordSnaps = await Promise.all(confirmedRecordIds.map((id) => adminDb.collection("teaching_records").doc(id).get()));
    confirmedRecords = recordSnaps
      .filter((s) => s.exists && !(s.data() as { is_deleted: boolean }).is_deleted)
      .map((s) => {
        const d = s.data() as { topic: string; week_no: number; taught_at: string };
        return { topic: d.topic, weekNo: d.week_no, taughtAt: d.taught_at };
      })
      .sort((a, b) => a.weekNo - b.weekNo);
  }

  const latestOverview = latestOverviewSnap.docs[0]?.data() as
    | { summary: string; recommendations: string[] }
    | undefined;

  const unmatchedClos = coverage.perClo.filter((c) => !c.isMatched);
  let areaOfImprovementLines: string[];
  if (latestOverview) {
    areaOfImprovementLines = latestOverview.recommendations.length > 0 ? latestOverview.recommendations : ["ไม่พบจุดที่ควรพัฒนาจากข้อมูลที่มี"];
  } else if (unmatchedClos.length > 0) {
    areaOfImprovementLines = unmatchedClos.map((c) => `${c.code} (${c.description}) ยังไม่มีหลักฐานการสอนที่ยืนยันแล้ว`);
  } else {
    areaOfImprovementLines = ["ไม่พบจุดที่ควรพัฒนาจากข้อมูลที่มี"];
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: `เอกสารสรุปความสอดคล้อง CLO/PLO`, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `${code} — ${course.name}` }),
          new Paragraph({ text: `หลักสูตร ${curriculumId}` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "ภาพรวมความสอดคล้อง", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text:
              coverage.totalCloCount === 0
                ? "วิชานี้ยังไม่มี CLO ในระบบ"
                : `${Math.round(coverage.coveragePercent ?? 0)}% (${coverage.matchedCloCount}/${coverage.totalCloCount} CLO มีหลักฐานยืนยันแล้ว)`,
          }),
          ...coverage.perClo.flatMap((c) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${c.code}: `, bold: true }),
                new TextRun({ text: c.description }),
              ],
            }),
            new Paragraph({
              text: `  ผูก PLO: ${(ploIdsByClo.get(c.code) ?? []).join(", ") || "ไม่มี"} · ${
                c.isMatched
                  ? `แมทช์แล้ว ${c.matchFrequency} ครั้ง${c.matchFrequencyPercent !== null ? ` (${Math.round(c.matchFrequencyPercent)}%)` : ""}`
                  : "ยังไม่มีหลักฐาน"
              }`,
            }),
          ]),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "หลักฐานการสอน (จากบันทึกการสอนที่ยืนยันผล AI แล้ว)", heading: HeadingLevel.HEADING_1 }),
          ...(confirmedRecords.length > 0
            ? confirmedRecords.map((r) => new Paragraph({ text: `สัปดาห์ ${r.weekNo} (${r.taughtAt}): ${r.topic}` }))
            : [new Paragraph({ text: "ยังไม่มีบันทึกการสอนที่ยืนยันผล AI แล้ว" })]),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "ข้อเสนอแนะเพื่อการพัฒนา (Area of Improvement)", heading: HeadingLevel.HEADING_1 }),
          ...(latestOverview ? [new Paragraph({ text: latestOverview.summary })] : []),
          ...areaOfImprovementLines.map((line) => new Paragraph({ text: `• ${line}` })),
          new Paragraph({ text: "" }),

          new Paragraph({ text: `สร้างเอกสารเมื่อ ${new Date().toLocaleDateString("th-TH")}`, alignment: "right" }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `ALIGN_${code}_${curriculumId}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

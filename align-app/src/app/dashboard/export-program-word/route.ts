import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { computeProgramCoverage } from "@/lib/program-coverage";

// AUN-QA annual evidence export (program_admin only, AB-14 pattern extended per user request) —
// same Word-only approach as courses/[curriculumId]/[code]/export-word/route.ts (no PDF anywhere
// in the spec). Area of Improvement comes from the latest already-reviewed program_overview_logs
// entry, never freshly-generated AI text at export time — same rationale as the per-course export.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const curriculumId = url.searchParams.get("curriculumId");
  const semester = url.searchParams.get("semester") ?? undefined;
  const academicYear = url.searchParams.get("academicYear") ? Number(url.searchParams.get("academicYear")) : undefined;
  if (!curriculumId) {
    return new Response("Missing curriculumId", { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user || user.account_status !== "approved") {
    return new Response("Unauthorized", { status: 401 });
  }
  if (user.effectiveRole !== "program_admin" || !(user.program_admin_curriculum_scope ?? []).includes(curriculumId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const [curriculumSnap, program, latestOverviewSnap] = await Promise.all([
    curriculumRef.get(),
    computeProgramCoverage(curriculumId, { semester, academicYear }),
    curriculumRef.collection("program_overview_logs").orderBy("created_at", "desc").limit(1).get(),
  ]);
  const curriculumName = (curriculumSnap.data() as { name?: string } | undefined)?.name ?? curriculumId;

  const latestOverview = latestOverviewSnap.docs[0]?.data() as { summary: string; recommendations: string[] } | undefined;
  const lowCoveragePlos = program.plos.filter((p) => p.percent !== null && p.percent < 100);
  let areaOfImprovementLines: string[];
  if (latestOverview) {
    areaOfImprovementLines = latestOverview.recommendations.length > 0 ? latestOverview.recommendations : ["ไม่พบจุดที่ควรพัฒนาจากข้อมูลที่มี"];
  } else if (lowCoveragePlos.length > 0) {
    areaOfImprovementLines = lowCoveragePlos.map((p) => `${p.code} (${p.description}) มีหลักฐานรองรับ ${Math.round(p.percent ?? 0)}% ของ CLO ที่ผูกไว้`);
  } else {
    areaOfImprovementLines = ["ไม่พบจุดที่ควรพัฒนาจากข้อมูลที่มี"];
  }

  const termLabel = semester || academicYear ? `ภาคเรียนที่ ${semester ?? "ทั้งหมด"} ปีการศึกษา ${academicYear ?? "ทั้งหมด"}` : "ทั้งหมดทุกภาค/ปี";

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "เอกสารสรุปความสอดคล้อง CLO/PLO ระดับหลักสูตร (สำหรับหลักฐาน AUN-QA)", heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `หลักสูตร ${curriculumId} — ${curriculumName}` }),
          new Paragraph({ text: termLabel }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "ภาพรวมความสอดคล้องระดับหลักสูตร", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text: program.overallCoveragePercent === null ? "ยังไม่มีข้อมูล" : `${Math.round(program.overallCoveragePercent)}%`,
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "รายวิชา", heading: HeadingLevel.HEADING_1 }),
          ...(program.courses.length > 0
            ? program.courses.map(
                (c) =>
                  new Paragraph({
                    text: `${c.courseId} ${c.courseName}: ${c.coverage.coveragePercent === null ? "ยังไม่มี CLO" : `${Math.round(c.coverage.coveragePercent)}%`}`,
                  }),
              )
            : [new Paragraph({ text: "ยังไม่มีวิชาในหลักสูตรนี้" })]),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "ระดับ PLO", heading: HeadingLevel.HEADING_1 }),
          ...(program.plos.length > 0
            ? program.plos.map(
                (p) =>
                  new Paragraph({
                    text: `${p.code}: ${p.description} — ${p.percent === null ? "ไม่มี CLO ผูกไว้" : `${Math.round(p.percent)}% ของ CLO ที่ผูกไว้มีหลักฐานแล้ว`}`,
                  }),
              )
            : [new Paragraph({ text: "หลักสูตรนี้ยังไม่มี PLO" })]),
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
  const filename = `ALIGN_AUNQA_${curriculumId}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

import { redirect, notFound } from "next/navigation";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { Button, Card, CurriculumTag, Field, InfoNote, Input, PageShell, PageTitle, TextLink } from "@/components/ui";
import { CloCard, type CloCardItem } from "./clo-card";
import { createClo, generateCourseOverview } from "./actions";
import { computeCourseCoverage } from "@/lib/course-coverage";

export const dynamic = "force-dynamic";

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ curriculumId: string; code: string }>;
}) {
  const { curriculumId, code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const courseRef = curriculumRef.collection("courses").doc(code);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) notFound();
  const course = courseSnap.data() as { name: string; instructor_id: string; clo_plo_ready: boolean };

  if (user.effectiveRole !== "instructor" || user.uid !== course.instructor_id) {
    redirect("/courses");
  }

  const prefix = `${code}_`;
  const [closSnap, plosSnap, mappingsSnap] = await Promise.all([
    courseRef.collection("clos").where("is_deleted", "==", false).get(),
    curriculumRef.collection("plos").where("is_deleted", "==", false).get(),
    curriculumRef
      .collection("clo_plo_mappings")
      .orderBy(FieldPath.documentId())
      .startAt(prefix)
      .endAt(`${prefix}`)
      .get(),
  ]);

  const plos = plosSnap.docs.map((d) => ({ code: d.id, description: (d.data() as { description: string }).description }));

  const boundPlosByClo = new Map<string, Set<string>>();
  for (const doc of mappingsSnap.docs) {
    const { clo_id, plo_id } = doc.data() as { clo_id: string; plo_id: string };
    const set = boundPlosByClo.get(clo_id) ?? new Set<string>();
    set.add(plo_id);
    boundPlosByClo.set(clo_id, set);
  }

  const clos: CloCardItem[] = closSnap.docs
    .map((d) => {
      const data = d.data() as { description: string };
      const bound = boundPlosByClo.get(d.id) ?? new Set<string>();
      return {
        code: d.id,
        description: data.description,
        plos: plos.map((p) => ({ code: p.code, bound: bound.has(p.code) })),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const hidden = { curriculum_id: curriculumId, code };

  const [coverage, latestOverviewSnap] = await Promise.all([
    computeCourseCoverage(curriculumId, code),
    courseRef.collection("overview_logs").orderBy("created_at", "desc").limit(1).get(),
  ]);
  const latestOverview = latestOverviewSnap.docs[0]?.data() as
    | { summary: string; recommendations: string[]; coverage_percent: number | null }
    | undefined;

  return (
    <PageShell width="md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PageTitle>จัดการรายวิชา</PageTitle>
          <CurriculumTag id={curriculumId} />
        </div>
        <a href={`/courses/${curriculumId}/${code}/export-word`}>
          <Button type="button" variant="secondary">
            ดาวน์โหลดเอกสาร Word
          </Button>
        </a>
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">
        {code} — {course.name}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-medium text-text-primary">ภาพรวมวิชา</h2>
          {coverage.totalCloCount === 0 ? (
            <InfoNote>ยังไม่มี CLO — เพิ่ม CLO ด้านล่างก่อนจึงจะเห็นภาพรวม</InfoNote>
          ) : (
            <>
              <p className="text-body-sm text-text-primary">
                <span className="font-mono text-h2 font-semibold text-primary-green">
                  {coverage.coveragePercent === null ? "—" : `${Math.round(coverage.coveragePercent)}%`}
                </span>{" "}
                <span className="text-text-secondary">
                  ({coverage.matchedCloCount}/{coverage.totalCloCount} CLO มีหลักฐานยืนยันแล้ว)
                </span>
              </p>
              <div className="flex flex-col gap-1">
                {coverage.perClo.map((c) => (
                  <div key={c.code} className="flex items-center justify-between gap-3 text-body-sm">
                    <span>
                      <span className="font-mono">{c.code}</span> <span className="text-text-secondary">{c.description}</span>
                    </span>
                    <span className={c.isMatched ? "text-status-confirmed" : "text-status-gap"}>
                      {c.isMatched
                        ? `แมทช์แล้ว · ${c.matchFrequency} ครั้ง${c.matchFrequencyPercent !== null ? ` (${Math.round(c.matchFrequencyPercent)}%)` : ""}`
                        : "ยังไม่มีหลักฐาน"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-2 border-t border-border-default pt-3">
            {latestOverview ? (
              <div className="flex flex-col gap-2">
                <p className="text-caption font-medium text-status-info">สรุปจาก AI (อ้างอิงเฉพาะข้อมูลที่ยืนยันแล้ว)</p>
                <p className="text-body-sm text-text-primary">{latestOverview.summary}</p>
                <p className="mt-1 text-caption font-medium text-text-secondary">ข้อเสนอแนะเพื่อการพัฒนา (Area of Improvement)</p>
                {latestOverview.recommendations.length > 0 ? (
                  <ul className="list-disc pl-5 text-body-sm text-text-secondary">
                    {latestOverview.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-text-secondary">ไม่พบจุดที่ควรพัฒนาจากข้อมูลที่มี</p>
                )}
              </div>
            ) : (
              <InfoNote>ยังไม่เคยให้ AI สรุปภาพรวมวิชานี้</InfoNote>
            )}
            <form action={generateCourseOverview} className="mt-2">
              <input type="hidden" name="curriculum_id" value={curriculumId} />
              <input type="hidden" name="code" value={code} />
              <Button type="submit" variant="secondary">
                {latestOverview ? "ให้ AI สรุปใหม่อีกครั้ง" : "ให้ AI สรุปภาพรวมวิชา"}
              </Button>
            </form>
          </div>
        </Card>

        {!course.clo_plo_ready && (
          <InfoNote>ยังไม่มี CLO ที่ผูกกับ PLO — ต้องผูกอย่างน้อย 1 คู่ก่อนจึงบันทึกการสอนได้</InfoNote>
        )}

        {plos.length === 0 && (
          <InfoNote>หลักสูตรนี้ยังไม่มี PLO ในระบบ — ต้องเพิ่ม PLO ระดับหลักสูตรก่อนจึงจะผูก CLO ได้</InfoNote>
        )}

        {clos.map((clo) => (
          <CloCard key={clo.code} clo={clo} hidden={hidden} />
        ))}

        <Card>
          <form action={createClo} className="flex items-end gap-3">
            <input type="hidden" name="curriculum_id" value={curriculumId} />
            <input type="hidden" name="code" value={code} />
            <Field label="เพิ่ม CLO ใหม่">
              <Input type="text" name="description" placeholder="คำอธิบาย CLO" required className="w-96" />
            </Field>
            <Button type="submit" variant="primary">
              เพิ่ม CLO
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8">
        <TextLink href="/courses">&larr; กลับ</TextLink>
      </div>
    </PageShell>
  );
}

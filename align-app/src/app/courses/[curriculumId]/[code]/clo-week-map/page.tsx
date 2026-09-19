import { redirect, notFound } from "next/navigation";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { CurriculumTag, EmptyState, PageShell, PageTitle, TextLink } from "@/components/ui";

export const dynamic = "force-dynamic";

const WEEKS = Array.from({ length: 15 }, (_, i) => i + 1);

export default async function CloWeekMapPage({
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
  const course = courseSnap.data() as { name: string; instructor_id: string };

  if (user.effectiveRole !== "instructor" || user.uid !== course.instructor_id) {
    redirect("/courses");
  }

  const prefix = `${code}_`;
  const [closSnap, recordsSnap, confirmedMatchesSnap, mappingsSnap] = await Promise.all([
    courseRef.collection("clos").where("is_deleted", "==", false).get(),
    adminDb
      .collection("teaching_records")
      .where("course_id", "==", code)
      .where("curriculum_id", "==", curriculumId)
      .where("is_deleted", "==", false)
      .get(),
    adminDb.collection("ai_match_results").where("course_id", "==", code).where("state", "==", "confirmed").get(),
    curriculumRef.collection("clo_plo_mappings").orderBy(FieldPath.documentId()).startAt(prefix).endAt(prefix).get(),
  ]);

  const weekByRecordId = new Map<string, number>();
  for (const doc of recordsSnap.docs) {
    const { week_no } = doc.data() as { week_no: number };
    weekByRecordId.set(doc.id, week_no);
  }

  const boundPlosByClo = new Map<string, Set<string>>();
  for (const doc of mappingsSnap.docs) {
    const { clo_id, plo_id } = doc.data() as { clo_id: string; plo_id: string };
    const set = boundPlosByClo.get(clo_id) ?? new Set<string>();
    set.add(plo_id);
    boundPlosByClo.set(clo_id, set);
  }

  // week -> count per clo
  const weekCountsByClo = new Map<string, Map<number, number>>();
  for (const doc of confirmedMatchesSnap.docs) {
    const { clo_id, teaching_record_id } = doc.data() as { clo_id: string; teaching_record_id: string };
    const week = weekByRecordId.get(teaching_record_id);
    if (week === undefined) continue; // record deleted or not for this course
    const counts = weekCountsByClo.get(clo_id) ?? new Map<number, number>();
    counts.set(week, (counts.get(week) ?? 0) + 1);
    weekCountsByClo.set(clo_id, counts);
  }

  const clos = closSnap.docs
    .map((d) => {
      const data = d.data() as { description: string };
      const counts = weekCountsByClo.get(d.id) ?? new Map<number, number>();
      const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
      return {
        code: d.id,
        description: data.description,
        plos: Array.from(boundPlosByClo.get(d.id) ?? new Set<string>()).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        ),
        counts,
        total,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return (
    <PageShell width="lg">
      <div className="flex items-center gap-3">
        <PageTitle>แผนที่ CLO × สัปดาห์</PageTitle>
        <CurriculumTag id={curriculumId} />
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">
        {code} — {course.name}
      </p>

      <div className="mt-6">
        {clos.length === 0 ? (
          <EmptyState>ยังไม่มี CLO — เพิ่ม CLO ที่หน้าจัดการรายวิชาก่อน</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr>
                  <th className="border border-border-default px-2 py-1.5 text-left text-caption text-text-secondary"></th>
                  {WEEKS.map((w) => (
                    <th
                      key={w}
                      className="border border-border-default px-2 py-1.5 text-center text-caption text-text-secondary"
                    >
                      {w}
                    </th>
                  ))}
                  <th className="border border-border-default px-2 py-1.5 text-center text-caption text-text-secondary">
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody>
                {clos.map((clo) => (
                  <tr key={clo.code}>
                    <td className="border border-border-default px-2 py-1.5 align-top">
                      <div className="font-mono text-text-primary">{clo.code}</div>
                      <div className="text-caption text-text-secondary">{clo.description}</div>
                      <div className="mt-1 text-caption text-text-secondary">
                        {clo.plos.length > 0 ? clo.plos.join(", ") : "ยังไม่ผูก PLO"}
                      </div>
                    </td>
                    {WEEKS.map((w) => {
                      const n = clo.counts.get(w) ?? 0;
                      return (
                        <td key={w} className="border border-border-default px-2 py-1.5 text-center text-text-primary">
                          {n === 0 ? <span className="text-text-disabled">—</span> : n}
                        </td>
                      );
                    })}
                    <td className="border border-border-default px-2 py-1.5 text-center font-semibold text-text-primary">
                      {clo.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <TextLink href={`/courses/${curriculumId}/${code}`}>&larr; กลับไปหน้าจัดการรายวิชา</TextLink>
      </div>
    </PageShell>
  );
}

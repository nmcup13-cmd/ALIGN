import { redirect } from "next/navigation";
import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { computeCourseCoverage } from "@/lib/course-coverage";
import { computeProgramCoverage } from "@/lib/program-coverage";
import { Button, Card, CurriculumTag, EmptyState, InfoNote, PageShell, PageTitle, TextLink } from "@/components/ui";
import { generateProgramOverview } from "./actions";

// AB-11 (instructor) + AB-14 (program_admin) — both compute live on every page load
// (align-tech-stack.md บรรทัด 233 นิยาม "real-time" = คำนวณสดตอนโหลด ไม่ใช่ batch — ไม่ใช่ live-push).
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculum?: string; semester?: string; academicYear?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  if (user.effectiveRole === "program_admin") {
    return <ProgramAdminDashboard scope={user.program_admin_curriculum_scope ?? []} searchParams={await searchParams} />;
  }
  if (user.effectiveRole !== "instructor") redirect("/courses");
  return <InstructorDashboard uid={user.uid} />;
}

async function InstructorDashboard({ uid }: { uid: string }) {
  const coursesSnap = await adminDb.collectionGroup("courses").get();
  const myCourses = coursesSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as { code: string; name: string; curriculum_id: string; instructor_id: string }),
    }))
    .filter((c) => c.instructor_id === uid)
    .map((c) => ({ ...c, curriculumId: c.curriculum_id }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const coverageByCourse = await Promise.all(myCourses.map((c) => computeCourseCoverage(c.curriculumId, c.id)));

  const totalClo = coverageByCourse.reduce((sum, c) => sum + c.totalCloCount, 0);
  const totalMatched = coverageByCourse.reduce((sum, c) => sum + c.matchedCloCount, 0);
  const overallPercent = totalClo > 0 ? (totalMatched / totalClo) * 100 : null;

  return (
    <PageShell width="lg">
      <PageTitle>หน้าแรก</PageTitle>

      <Card className="mt-6 flex flex-col gap-2">
        <h2 className="text-h3 font-medium text-text-primary">% ความสอดคล้องรวมของฉัน</h2>
        {overallPercent === null ? (
          <p className="text-body-sm text-text-secondary">ยังไม่มี CLO ในวิชาที่สอนเลย</p>
        ) : (
          <p className="text-body-sm">
            <span className="font-mono text-h1 font-semibold text-primary-green">{Math.round(overallPercent)}%</span>{" "}
            <span className="text-text-secondary">
              ({totalMatched}/{totalClo} CLO มีหลักฐานยืนยันแล้ว จากทั้งหมด {myCourses.length} วิชา)
            </span>
          </p>
        )}
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        <h2 className="text-h2 font-medium text-text-primary">รายวิชาที่สอน</h2>
        {myCourses.length === 0 ? (
          <EmptyState>ยังไม่มีวิชาที่สอน — ไปที่ &quot;รายวิชาของฉัน&quot; เพื่อเพิ่มวิชาก่อน</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {myCourses.map((c, i) => {
              const coverage = coverageByCourse[i];
              return (
                <li key={`${c.curriculumId}-${c.id}`}>
                  <Link href={`/courses/${c.curriculumId}/${c.id}`}>
                    <Card className="flex items-center justify-between gap-4 hover:border-border-strong">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <CurriculumTag id={c.curriculumId} />
                          <span className="font-mono text-body-sm text-text-secondary">{c.id}</span>
                          <span className="text-body font-medium text-text-primary">{c.name}</span>
                        </div>
                        <span className="text-caption text-text-secondary">
                          {coverage.matchedCloCount}/{coverage.totalCloCount} CLO มีหลักฐานยืนยันแล้ว
                        </span>
                      </div>
                      <span className="font-mono text-h2 font-semibold text-primary-green">
                        {coverage.coveragePercent === null ? "—" : `${Math.round(coverage.coveragePercent)}%`}
                      </span>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <TextLink href="/account-status">&larr; กลับ</TextLink>
      </div>
    </PageShell>
  );
}

async function ProgramAdminDashboard({
  scope,
  searchParams,
}: {
  scope: string[];
  searchParams: { curriculum?: string; semester?: string; academicYear?: string };
}) {
  // Hide tabs for curricula outside program_admin_curriculum_scope entirely — never render a
  // disabled tab for them (align-program-admin-screens.md หน้าจอ 3: "ไม่ใช่แสดงแท็บแล้ว disable
  // เพราะจะ leak การมีอยู่ของข้อมูล").
  if (scope.length === 0) {
    return (
      <PageShell width="lg">
        <PageTitle>แดชบอร์ดภาพรวมหลักสูตร</PageTitle>
        <div className="mt-6">
          <InfoNote>บัญชีนี้ยังไม่ได้รับมอบหมายหลักสูตรใดเลย</InfoNote>
        </div>
      </PageShell>
    );
  }

  const activeCurriculum = scope.includes(searchParams.curriculum ?? "") ? searchParams.curriculum! : scope[0];
  const semester = searchParams.semester;
  const academicYear = searchParams.academicYear ? Number(searchParams.academicYear) : undefined;
  const termLabel = semester || academicYear ? `ภาคเรียนที่ ${semester ?? "ทั้งหมด"} ปีการศึกษา ${academicYear ?? "ทั้งหมด"}` : "ทั้งหมดทุกภาค/ปี";

  const program = await computeProgramCoverage(activeCurriculum, { semester, academicYear });

  const curriculumRef = adminDb.collection("curricula").doc(activeCurriculum);
  const latestOverviewSnap = await curriculumRef.collection("program_overview_logs").orderBy("created_at", "desc").limit(1).get();
  const latestOverview = latestOverviewSnap.docs[0]?.data() as
    | { summary: string; recommendations: string[]; semester: string | null; academic_year: number | null }
    | undefined;

  function tabHref(curriculumId: string) {
    const params = new URLSearchParams();
    params.set("curriculum", curriculumId);
    if (semester) params.set("semester", semester);
    if (academicYear) params.set("academicYear", String(academicYear));
    return `/dashboard?${params.toString()}`;
  }

  return (
    <PageShell width="lg">
      <PageTitle>แดชบอร์ดภาพรวมหลักสูตร</PageTitle>

      <div className="mt-4 flex gap-2 border-b border-border-default">
        {scope.map((c) => (
          <Link
            key={c}
            href={tabHref(c)}
            className={`px-4 py-2 text-body-sm ${c === activeCurriculum ? "border-b-2 border-primary-green font-medium text-text-primary" : "text-text-secondary"}`}
          >
            หลักสูตร {c}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2">
          <input type="hidden" name="curriculum" value={activeCurriculum} />
          <select name="semester" defaultValue={semester ?? ""} className="rounded-sm border border-border-default bg-bg-surface px-2 py-1 text-body-sm">
            <option value="">ทุกภาคเรียน</option>
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
            <option value="summer">ภาคฤดูร้อน</option>
          </select>
          <input
            type="number"
            name="academicYear"
            defaultValue={academicYear ?? ""}
            placeholder="ปีการศึกษา (ทั้งหมด)"
            className="w-40 rounded-sm border border-border-default bg-bg-surface px-2 py-1 text-body-sm"
          />
          <Button type="submit" variant="secondary" className="px-3 py-1">
            กรอง
          </Button>
        </form>
        <a href={`/dashboard/export-program-word?curriculumId=${activeCurriculum}${semester ? `&semester=${semester}` : ""}${academicYear ? `&academicYear=${academicYear}` : ""}`}>
          <Button type="button" variant="secondary" className="px-3 py-1">
            ดาวน์โหลดเอกสาร AUN-QA
          </Button>
        </a>
      </div>

      <Card className="mt-4 flex flex-col gap-2">
        <h2 className="text-h3 font-medium text-text-primary">% ความสอดคล้องรวมของหลักสูตร ({termLabel})</h2>
        <p className="text-body-sm">
          <span className="font-mono text-h1 font-semibold text-primary-green">
            {program.overallCoveragePercent === null ? "—" : `${Math.round(program.overallCoveragePercent)}%`}
          </span>
        </p>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        <h2 className="text-h2 font-medium text-text-primary">รายวิชา</h2>
        {program.courses.length === 0 ? (
          <EmptyState>หลักสูตรนี้ยังไม่มีวิชา</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {program.courses.map((c) => {
              const missing = c.coverage.perClo.filter((clo) => !clo.isMatched).length;
              return (
                <li key={c.courseId}>
                  <Link href={`/courses/${activeCurriculum}/${c.courseId}`}>
                    <Card className="flex items-center justify-between gap-4 hover:border-border-strong">
                      <div className="flex flex-col gap-0.5">
                        <span>
                          <span className="font-mono text-body-sm text-text-secondary">{c.courseId}</span>{" "}
                          <span className="text-body font-medium text-text-primary">{c.courseName}</span>
                        </span>
                        <span className="text-caption text-text-secondary">
                          {missing > 0 ? `CLO ที่ยังขาดหลักฐาน: ${missing}` : "ครบทุก CLO แล้ว"}
                        </span>
                      </div>
                      <span className="font-mono text-h3 font-semibold text-primary-green">
                        {c.coverage.coveragePercent === null ? "—" : `${Math.round(c.coverage.coveragePercent)}%`}
                      </span>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <h2 className="text-h2 font-medium text-text-primary">ระดับ PLO</h2>
        {program.plos.length === 0 ? (
          <InfoNote>หลักสูตรนี้ยังไม่มี PLO</InfoNote>
        ) : (
          <Card className="flex flex-col gap-1">
            {program.plos.map((p) => (
              <div key={p.code} className="flex items-center justify-between gap-3 text-body-sm">
                <span>
                  <span className="font-mono">{p.code}</span> <span className="text-text-secondary">{p.description}</span>
                </span>
                <span className="text-text-secondary">{p.percent === null ? "ไม่มี CLO ผูกไว้" : `${Math.round(p.percent)}%`}</span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Card className="mt-4 flex flex-col gap-2">
        <h2 className="text-h3 font-medium text-text-primary">สรุปจาก AI (สำหรับหลักฐาน AUN-QA)</h2>
        {latestOverview ? (
          <>
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
          </>
        ) : (
          <InfoNote>ยังไม่เคยให้ AI สรุปภาพรวมหลักสูตรนี้</InfoNote>
        )}
        <form action={generateProgramOverview} className="mt-2">
          <input type="hidden" name="curriculum_id" value={activeCurriculum} />
          {semester && <input type="hidden" name="semester" value={semester} />}
          {academicYear && <input type="hidden" name="academic_year" value={academicYear} />}
          <Button type="submit" variant="secondary">
            {latestOverview ? "ให้ AI สรุปใหม่อีกครั้ง" : "ให้ AI สรุปภาพรวมหลักสูตร"}
          </Button>
        </form>
      </Card>

      <div className="mt-8">
        <TextLink href="/account-status">&larr; กลับ</TextLink>
      </div>
    </PageShell>
  );
}

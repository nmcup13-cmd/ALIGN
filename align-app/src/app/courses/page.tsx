import { redirect } from "next/navigation";
import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "../logout-button";
import { updateCourseInstructor } from "./actions";
import { DeleteCourseButton } from "./delete-course-button";
import { Button, Card, CurriculumTag, EmptyState, Input, PageShell, PageTitle, TextLink } from "@/components/ui";

// Reads Firestore per-request — must not be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  // Instructors only ever see their own courses (GET /me/courses) — never another
  // instructor's. program_admin sees every course within their curriculum scope.
  const coursesSnap = await adminDb.collectionGroup("courses").get();
  const courses = coursesSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as {
        code: string;
        name: string;
        curriculum_id: string;
        instructor_id: string;
        clo_plo_ready: boolean;
      }),
    }))
    .filter((c) => user.effectiveRole === "program_admin" || c.instructor_id === user.uid)
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <PageShell width="lg">
      <div className="flex items-center justify-between gap-4">
        <PageTitle>{user.effectiveRole === "program_admin" ? "รายวิชาทั้งหมด" : "รายวิชาของฉัน"}</PageTitle>
        <Link href="/courses/new">
          <Button variant="primary">+ เพิ่มรายวิชาใหม่</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="mt-6">
          <EmptyState>ยังไม่มีรายวิชาในระบบ</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {courses.map((c) => {
            const canDelete = user.effectiveRole === "program_admin" || c.instructor_id === user.uid;
            return (
              <li key={`${c.curriculum_id}-${c.id}`}>
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CurriculumTag id={c.curriculum_id} />
                    <span className="font-mono text-body-sm text-text-secondary">{c.code}</span>
                    <span className="text-h3 font-medium text-text-primary">{c.name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-secondary">
                    <span>
                      ผู้สอน: <span className="font-mono text-text-primary">{c.instructor_id}</span>
                    </span>
                    <span className={c.clo_plo_ready ? "text-status-confirmed" : "text-status-gap"}>
                      {c.clo_plo_ready ? "ผูก CLO–PLO แล้ว" : "ยังไม่ได้ผูก CLO–PLO"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-border-default pt-3">
                    {user.effectiveRole === "program_admin" && (
                      <form action={updateCourseInstructor} className="flex items-center gap-2">
                        <input type="hidden" name="curriculum_id" value={c.curriculum_id} />
                        <input type="hidden" name="code" value={c.code} />
                        <Input
                          name="instructor_id"
                          defaultValue={c.instructor_id}
                          placeholder="Instructor UID ใหม่"
                          className="w-56"
                        />
                        <Button type="submit" variant="secondary" className="px-3 py-1">
                          บันทึกผู้สอน
                        </Button>
                      </form>
                    )}

                    {canDelete && (
                      <DeleteCourseButton
                        curriculumId={c.curriculum_id}
                        code={c.code}
                        courseLabel={`${c.code} — ${c.name}`}
                      />
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex items-center gap-3 text-body-sm">
        <TextLink href="/account-status">&larr; กลับ</TextLink>
        <span className="text-border-strong">·</span>
        <LogoutButton />
      </div>
    </PageShell>
  );
}

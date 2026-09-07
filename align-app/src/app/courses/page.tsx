import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "../logout-button";
import { updateCourseInstructor } from "./actions";
import { DeleteCourseButton } from "./delete-course-button";

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
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>{user.effectiveRole === "program_admin" ? "รายวิชาทั้งหมด" : "รายวิชาของฉัน"}</h1>
      <p>
        <a href="/courses/new">+ เพิ่มรายวิชาใหม่</a>
      </p>

      {courses.length === 0 ? (
        <p>ยังไม่มีรายวิชาในระบบ</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {courses.map((c) => {
            const canDelete = user.effectiveRole === "program_admin" || c.instructor_id === user.uid;
            return (
              <li
                key={`${c.curriculum_id}-${c.id}`}
                style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 12 }}
              >
                <p style={{ margin: 0 }}>
                  [{c.curriculum_id}] {c.code} — {c.name}
                </p>
                <p style={{ margin: "4px 0", color: "#555" }}>
                  instructor: {c.instructor_id}, clo_plo_ready: {String(c.clo_plo_ready)}
                </p>

                {user.effectiveRole === "program_admin" && (
                  <form action={updateCourseInstructor} style={{ display: "inline-flex", gap: 8, alignItems: "center", marginRight: 12 }}>
                    <input type="hidden" name="curriculum_id" value={c.curriculum_id} />
                    <input type="hidden" name="code" value={c.code} />
                    <input
                      name="instructor_id"
                      defaultValue={c.instructor_id}
                      placeholder="Instructor UID ใหม่"
                      style={{ padding: 6 }}
                    />
                    <button type="submit" style={{ padding: "4px 10px", cursor: "pointer" }}>
                      บันทึกผู้สอน
                    </button>
                  </form>
                )}

                {canDelete && (
                  <DeleteCourseButton curriculumId={c.curriculum_id} code={c.code} courseLabel={`${c.code} — ${c.name}`} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/account-status">&larr; กลับ</a> · <LogoutButton />
      </div>
    </main>
  );
}

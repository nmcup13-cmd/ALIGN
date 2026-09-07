import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "../logout-button";

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
    .filter((c) => user.role === "program_admin" || c.instructor_id === user.uid)
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>{user.role === "program_admin" ? "รายวิชาทั้งหมด" : "รายวิชาของฉัน"}</h1>
      {user.role === "program_admin" && (
        <p>
          <a href="/courses/new">+ เพิ่มรายวิชาใหม่</a>
        </p>
      )}

      {courses.length === 0 ? (
        <p>ยังไม่มีรายวิชาในระบบ</p>
      ) : (
        <ul style={{ paddingLeft: 20 }}>
          {courses.map((c) => (
            <li key={`${c.curriculum_id}-${c.id}`} style={{ marginBottom: 6 }}>
              [{c.curriculum_id}] {c.code} — {c.name} (instructor: {c.instructor_id}, clo_plo_ready:{" "}
              {String(c.clo_plo_ready)})
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/account-status">&larr; กลับ</a> · <LogoutButton />
      </div>
    </main>
  );
}

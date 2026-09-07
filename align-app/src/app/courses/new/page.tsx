import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { createCourse } from "./actions";
import { CourseSelectFields } from "./course-select-fields";

// Reads Firestore per-request — must not be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") {
    redirect("/account-status");
  }

  const curriculaSnap = await adminDb.collection("curricula").orderBy("year_code").get();
  const curricula = curriculaSnap.docs.map((doc) => ({
    id: doc.id,
    name: (doc.data().name as string) ?? doc.id,
  }));

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>เพิ่มรายวิชาใหม่</h1>

      <form action={createCourse} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <CourseSelectFields curricula={curricula} />

        {user.effectiveRole === "program_admin" && (
          <label style={{ fontWeight: 600 }}>
            Instructor UID (มอบหมายให้อาจารย์ท่านอื่น)
            <input
              name="instructor_id"
              required
              placeholder="Firebase Auth UID ของอาจารย์ผู้สอนหลัก"
              style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem", boxSizing: "border-box" }}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={curricula.length === 0}
          style={{ padding: "10px 16px", fontSize: "1rem", cursor: "pointer", marginTop: 8 }}
        >
          บันทึกรายวิชา
        </button>
      </form>

      {curricula.length === 0 && (
        <p style={{ color: "#900", marginTop: 16 }}>
          ยังไม่มีข้อมูลหลักสูตรในระบบ — รัน <code>node scripts/seed-curricula.mjs</code> ก่อน
        </p>
      )}

      <p style={{ marginTop: 24 }}>
        <a href="/courses">&larr; กลับหน้ารายการ</a>
      </p>
    </main>
  );
}

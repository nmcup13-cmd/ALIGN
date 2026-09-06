import { adminDb } from "@/lib/firebase/admin";

// Reads Firestore per-request — must not be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
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
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>รายวิชาทั้งหมด</h1>
      <p>
        <a href="/courses/new">+ เพิ่มรายวิชาใหม่</a>
      </p>

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
    </main>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";

// Writes curricula/{curriculumId}/courses/{code}/syllabus/main — the planned weekly topic list
// consumed by runAiMatch (teaching-records/actions.ts) as `content: { week_no, topic }[]`. This
// is the ONLY writer of that document. Scope note (AB-19 / spec.md gap #2): only the weekly
// topic text is built here — no official syllabus *file* upload, since Firebase Storage is not
// yet enabled (see docs/05-log/2026-09-06-firebase-storage-blaze-deferred-log.md).

async function requireOwnedCourse(curriculumId: string, code: string) {
  const user = await requireApprovedUser(["instructor"]);
  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const courseRef = curriculumRef.collection("courses").doc(code);
  const snap = await courseRef.get();
  if (!snap.exists) throw new Error("ไม่พบรายวิชานี้");
  const course = snap.data() as { instructor_id: string };
  if (course.instructor_id !== user.uid) throw new Error("ไม่มีสิทธิ์แก้ไขวิชานี้");
  return { curriculumRef, courseRef };
}

export async function updateSyllabus(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const { courseRef } = await requireOwnedCourse(curriculumId, code);

  const content: { week_no: number; topic: string }[] = [];
  for (let week = 1; week <= 15; week++) {
    const topic = String(formData.get(`topic_${week}`) ?? "").trim();
    if (topic) content.push({ week_no: week, topic });
  }

  await courseRef.collection("syllabus").doc("main").set({
    content,
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath(`/courses/${curriculumId}/${code}/syllabus`);
}

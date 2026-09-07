"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";

// [DEVIATION FROM SPEC] align-api-schema-design.md §3.5/§5.1 defines no edit/delete endpoint
// and no soft-delete field for `course` at all (unlike plo/clo/teaching_record/evidence/user,
// which all have is_deleted). Added per the user's 2026-09-07 request to satisfy the
// homework rubric's generic create/edit/delete requirement — course is hard-deleted since
// there's no soft-delete concept to fall back to.

// "Edit" is scoped to reassigning instructor_id only — code/name/curriculum_id come from the
// real course catalog and shouldn't be freely rewritten. program_admin only (delegation is
// an admin task).
export async function updateCourseInstructor(formData: FormData) {
  await requireApprovedUser(["program_admin"]);

  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const newInstructorId = String(formData.get("instructor_id") ?? "").trim();
  if (!curriculumId || !code || !newInstructorId) {
    throw new Error("กรุณากรอกข้อมูลให้ครบ");
  }

  const courseRef = adminDb.collection("curricula").doc(curriculumId).collection("courses").doc(code);
  await courseRef.update({
    instructor_id: newInstructorId,
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath("/courses");
}

// Hard delete — program_admin can delete any course; an instructor may only delete their
// own (never someone else's). Confirmation happens client-side before this is even called
// (see delete-course-button.tsx) — this is the server-side authorization check.
export async function deleteCourse(formData: FormData) {
  const user = await requireApprovedUser(["instructor", "program_admin"]);

  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!curriculumId || !code) {
    throw new Error("กรุณาระบุวิชาที่จะลบ");
  }

  const courseRef = adminDb.collection("curricula").doc(curriculumId).collection("courses").doc(code);
  const snap = await courseRef.get();
  if (!snap.exists) {
    throw new Error("ไม่พบรายวิชานี้");
  }
  if (user.effectiveRole !== "program_admin" && snap.data()?.instructor_id !== user.uid) {
    throw new Error("ลบได้เฉพาะรายวิชาของตัวเองเท่านั้น");
  }

  await courseRef.delete();
  revalidatePath("/courses");
}

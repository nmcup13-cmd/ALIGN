"use server";

import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

// POST /courses per align-technical-design.md — program_admin creates a course directly,
// no pending/approval status (align-api-schema-design.md §3.5 has no status field on `course`).
// TODO: enforce account_status='approved' + role='program_admin' (rule #6) once Firebase Auth
// + the `users` collection lookup exist in this app — currently unauthenticated.
export async function createCourse(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const instructorId = String(formData.get("instructor_id") ?? "").trim();

  if (!curriculumId || !code || !name || !instructorId) {
    throw new Error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
  }

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const courseRef = curriculumRef.collection("courses").doc(code);

  // course_id must be unique system-wide, across both curricula (§2.3/§2.6-ง) — the doc ID
  // only guarantees uniqueness *within* one curriculum's subcollection. Rather than a
  // collectionGroup query (which needs a dedicated Firestore index), check every curriculum's
  // `courses/{code}` doc directly by ID — there are only ever 2 curricula (2565/2570), so this
  // is cheap and needs no extra index.
  const allCurriculaSnap = await adminDb.collection("curricula").get();
  const otherCourseRefs = allCurriculaSnap.docs
    .filter((doc) => doc.id !== curriculumId)
    .map((doc) => doc.ref.collection("courses").doc(code));

  await adminDb.runTransaction(async (tx) => {
    const curriculumSnap = await tx.get(curriculumRef);
    if (!curriculumSnap.exists) {
      throw new Error(`ไม่พบหลักสูตร ${curriculumId}`);
    }

    const otherSnaps = await Promise.all(otherCourseRefs.map((ref) => tx.get(ref)));
    if (otherSnaps.some((snap) => snap.exists)) {
      throw new Error(`รหัสวิชา ${code} มีอยู่แล้ว (ในหลักสูตรใดหลักสูตรหนึ่ง)`);
    }

    tx.create(courseRef, {
      course_id: code,
      curriculum_id: curriculumId,
      code,
      name,
      instructor_id: instructorId,
      clo_plo_ready: false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  redirect("/courses");
}

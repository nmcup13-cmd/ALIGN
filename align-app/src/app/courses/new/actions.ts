"use server";

import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";
import { COURSE_CATALOG } from "@/lib/course-catalog";

// POST /courses per align-technical-design.md. align-api-schema-design.md §3.5 doesn't name
// a specific role for this endpoint (unlike PLO management, which is explicitly
// program_admin-only) — per the user's 2026-09-07 decision, both roles may create a course:
// - instructor: always assigns themselves as instructor_id (never someone else's course)
// - program_admin: assigns whichever instructor_id they specify (delegating on someone's behalf)
// Course code/name now come from the real catalog (course-catalog.ts, sourced from
// plo-course-master-data.md) via a dropdown — never free-typed — so `name` is looked up
// server-side from `code`, never trusted from the client.
export async function createCourse(formData: FormData) {
  const user = await requireApprovedUser(["instructor", "program_admin"]);

  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  const catalogEntry = COURSE_CATALOG[curriculumId]?.find((c) => c.code === code);
  if (!catalogEntry) {
    throw new Error("รายวิชานี้ไม่อยู่ในหลักสูตรที่เลือก");
  }
  const name = catalogEntry.nameTh;

  const instructorId =
    user.effectiveRole === "instructor" ? user.uid : String(formData.get("instructor_id") ?? "").trim();
  if (!instructorId) {
    throw new Error("กรุณาระบุ Instructor UID");
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

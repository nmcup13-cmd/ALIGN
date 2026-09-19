"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";

// PLO (Program Learning Outcome) management UI for program_admin role — allows create, edit
// (description only), and soft-delete of PLOs for a curriculum. Authorization: effectiveRole
// must be "program_admin" and curriculumId must be in program_admin_curriculum_scope.

async function requireScopedProgramAdmin(curriculumId: string) {
  const user = await requireApprovedUser(["program_admin"]);
  if (!user.program_admin_curriculum_scope?.includes(curriculumId)) {
    throw new Error("ไม่มีสิทธิ์จัดการหลักสูตรนี้");
  }
  return user;
}

export async function createPlo(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("กรุณาระบุคำอธิบาย PLO");

  await requireScopedProgramAdmin(curriculumId);

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);

  // Number the next PLO from the highest existing suffix (including soft-deleted ones) so a
  // deleted PLO's code is never reused for a different PLO.
  const allPlosSnap = await curriculumRef.collection("plos").get();
  const maxNum = allPlosSnap.docs.reduce((max, d) => {
    const n = Number(d.id.replace(/^PLO/, ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const ploCode = `PLO${maxNum + 1}`;

  await curriculumRef.collection("plos").doc(ploCode).create({
    plo_id: ploCode,
    curriculum_id: curriculumId,
    code: ploCode,
    description,
    is_deleted: false,
    deleted_at: null,
  });

  revalidatePath(`/curricula/${curriculumId}/plos`);
}

export async function updatePlo(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const ploCode = String(formData.get("plo_code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("กรุณาระบุคำอธิบาย PLO");

  await requireScopedProgramAdmin(curriculumId);

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const ploRef = curriculumRef.collection("plos").doc(ploCode);

  const snap = await ploRef.get();
  if (!snap.exists || (snap.data() as { is_deleted: boolean }).is_deleted) {
    throw new Error("ไม่พบ PLO นี้ หรือถูกลบไปแล้ว");
  }

  await ploRef.update({ description });

  revalidatePath(`/curricula/${curriculumId}/plos`);
}

export async function deletePlo(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const ploCode = String(formData.get("plo_code") ?? "").trim();

  await requireScopedProgramAdmin(curriculumId);

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const ploRef = curriculumRef.collection("plos").doc(ploCode);

  // Soft-delete only — do not touch clo_plo_mappings or clo_plo_ready, as computeCloPloReady
  // in courses/[curriculumId]/[code]/actions.ts only checks CLO is_deleted, not PLO is_deleted.
  await ploRef.update({
    is_deleted: true,
    deleted_at: FieldValue.serverTimestamp(),
  });

  revalidatePath(`/curricula/${curriculumId}/plos`);
}

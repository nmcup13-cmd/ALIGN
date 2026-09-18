"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";
import { runAiMatch } from "../../actions";

// PATCH /ai-match-results/{id}, POST /ai-match-results/{id}/confirm, POST .../reject
// (align-technical-design.md §4, E3) — confirmMatchResult is the ONLY place state becomes
// 'confirmed' (business rule #3): never automatic, always a specific instructor action.

async function requireOwnedMatchResult(matchResultId: string) {
  const user = await requireApprovedUser(["instructor"]);
  const ref = adminDb.collection("ai_match_results").doc(matchResultId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("ไม่พบผลจับคู่นี้");
  const data = snap.data() as { course_id: string; curriculum_id: string };

  const courseSnap = await adminDb
    .collection("curricula")
    .doc(data.curriculum_id)
    .collection("courses")
    .doc(data.course_id)
    .get();
  const course = courseSnap.data() as { instructor_id: string } | undefined;
  if (!course || course.instructor_id !== user.uid) {
    // Security rule sketch (§2.8): program_admin never writes ai_match_results, only the
    // instructor who owns the course.
    throw new Error("ไม่มีสิทธิ์แก้ไขผลจับคู่นี้");
  }
  return { ref, data };
}

export async function updateMatchResult(matchResultId: string, formData: FormData) {
  const { ref } = await requireOwnedMatchResult(matchResultId);
  const action = String(formData.get("action") ?? "");

  if (action === "reject") {
    await ref.update({ state: "rejected" });
  } else if (action === "restore") {
    await ref.update({ state: "draft" });
  } else if (action === "edit") {
    const confidence = Number(formData.get("match_confidence"));
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
      throw new Error("match confidence ต้องอยู่ระหว่าง 0-100");
    }
    await ref.update({ state: "edited", match_confidence: Math.round(confidence) });
  } else {
    throw new Error("ไม่รู้จักการกระทำนี้");
  }

  const { curriculumId, code, recordId } = paramsFrom(formData);
  revalidatePath(`/courses/${curriculumId}/${code}/teaching-records/${recordId}/review`);
}

export async function confirmMatchResult(matchResultId: string, formData: FormData) {
  const { ref } = await requireOwnedMatchResult(matchResultId);
  const user = await requireApprovedUser(["instructor"]);

  // The one and only place ai_match_result.state becomes 'confirmed' (rule #3).
  await ref.update({
    state: "confirmed",
    confirmed_by: user.uid,
    confirmed_at: FieldValue.serverTimestamp(),
  });

  const { curriculumId, code, recordId } = paramsFrom(formData);
  revalidatePath(`/courses/${curriculumId}/${code}/teaching-records/${recordId}/review`);
}

export async function confirmAllMatchResults(formData: FormData) {
  const { curriculumId, code, recordId } = paramsFrom(formData);
  const user = await requireApprovedUser(["instructor"]);

  const snap = await adminDb
    .collection("ai_match_results")
    .where("teaching_record_id", "==", recordId)
    .get();

  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    const state = (doc.data() as { state: string }).state;
    if (state === "confirmed" || state === "rejected") continue;
    batch.update(doc.ref, {
      state: "confirmed",
      confirmed_by: user.uid,
      confirmed_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  revalidatePath(`/courses/${curriculumId}/${code}/teaching-records/${recordId}/review`);
}

export async function retryAiMatch(formData: FormData) {
  await requireApprovedUser(["instructor"]);
  const { curriculumId, code, recordId } = paramsFrom(formData);
  await runAiMatch(recordId);
  revalidatePath(`/courses/${curriculumId}/${code}/teaching-records/${recordId}/review`);
}

function paramsFrom(formData: FormData) {
  return {
    curriculumId: String(formData.get("curriculum_id") ?? ""),
    code: String(formData.get("code") ?? ""),
    recordId: String(formData.get("record_id") ?? ""),
  };
}

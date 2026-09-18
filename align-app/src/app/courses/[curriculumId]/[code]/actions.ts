"use server";

import { revalidatePath } from "next/cache";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";
import { suggestCloPloMatches, summarizeCourseOverview, type PloSuggestion } from "@/lib/ai/openrouter";
import { computeCourseCoverage } from "@/lib/course-coverage";

// PUT/DELETE /courses/{id}/clos/{clo_id}, DELETE /courses/{id}/clo-plo-mappings/{mapping_id}
// per align-technical-design.md §3 (E1) + align-api-schema-design.md lines 565-567 — instructor
// enters their own course's CLOs (AB-02) and binds them to existing curriculum PLOs (AB-03,
// business rule #1). Only the owning instructor may write here (security rule sketch §2.8).

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

// clo_plo_ready is never set directly — it's derived from whether any clo_plo_mapping still
// points at a non-deleted CLO of this course (align-api-schema-design.md line 337). Mappings
// live under curricula/{id}/clo_plo_mappings (not nested under course), and their `clo_id`
// field is only unique *within* a course, not across the curriculum — so we can't filter by
// that field alone. The mapping doc id ("{course_id}_{clo_code}_{plo_code}") always starts
// with the course id, so a document-ID prefix range query scopes it correctly.
async function computeCloPloReady(
  tx: FirebaseFirestore.Transaction,
  curriculumRef: FirebaseFirestore.DocumentReference,
  courseRef: FirebaseFirestore.DocumentReference,
  courseCode: string,
  opts: { excludeCloCode?: string; addMapping?: { id: string; clo_id: string }; removeMappingId?: string },
): Promise<boolean> {
  const closSnap = await tx.get(courseRef.collection("clos").where("is_deleted", "==", false));
  const nonDeletedCodes = new Set(closSnap.docs.map((d) => d.id).filter((c) => c !== opts.excludeCloCode));

  const prefix = `${courseCode}_`;
  const mappingsSnap = await tx.get(
    curriculumRef
      .collection("clo_plo_mappings")
      .orderBy(FieldPath.documentId())
      .startAt(prefix)
      .endAt(prefix + ""),
  );
  const mappingCloById = new Map(mappingsSnap.docs.map((d) => [d.id, (d.data() as { clo_id: string }).clo_id]));
  if (opts.removeMappingId) mappingCloById.delete(opts.removeMappingId);
  if (opts.addMapping) mappingCloById.set(opts.addMapping.id, opts.addMapping.clo_id);

  for (const cloId of mappingCloById.values()) {
    if (nonDeletedCodes.has(cloId)) return true;
  }
  return false;
}

export async function createClo(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("กรุณาระบุคำอธิบาย CLO");

  const { courseRef } = await requireOwnedCourse(curriculumId, code);

  // Number the next CLO from the highest existing suffix (including soft-deleted ones) so a
  // deleted CLO's code is never reused for a different CLO.
  const allClosSnap = await courseRef.collection("clos").get();
  const maxNum = allClosSnap.docs.reduce((max, d) => {
    const n = Number(d.id.replace(/^CLO/, ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const cloCode = `CLO${maxNum + 1}`;

  await courseRef.collection("clos").doc(cloCode).create({
    clo_id: cloCode,
    course_id: code,
    curriculum_id: curriculumId,
    code: cloCode,
    description,
    is_deleted: false,
    deleted_at: null,
  });

  revalidatePath(`/courses/${curriculumId}/${code}`);
}

export async function deleteClo(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const cloCode = String(formData.get("clo_code") ?? "").trim();
  const { curriculumRef, courseRef } = await requireOwnedCourse(curriculumId, code);

  const cloRef = courseRef.collection("clos").doc(cloCode);

  await adminDb.runTransaction(async (tx) => {
    const cloSnap = await tx.get(cloRef);
    if (!cloSnap.exists) throw new Error("ไม่พบ CLO นี้");

    const ready = await computeCloPloReady(tx, curriculumRef, courseRef, code, { excludeCloCode: cloCode });

    // Soft-delete only — ai_match_result/CLO×week history referencing this CLO stays intact
    // (business rule: never destroy history), per align-api-schema-design.md §3.3.
    tx.update(cloRef, { is_deleted: true, deleted_at: FieldValue.serverTimestamp() });
    tx.update(courseRef, { clo_plo_ready: ready });
  });

  revalidatePath(`/courses/${curriculumId}/${code}`);
}

export async function toggleCloPloMapping(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const cloCode = String(formData.get("clo_code") ?? "").trim();
  const ploCode = String(formData.get("plo_code") ?? "").trim();
  const action = String(formData.get("action") ?? "");
  const { curriculumRef, courseRef } = await requireOwnedCourse(curriculumId, code);

  const user = await requireApprovedUser(["instructor"]);
  const mappingId = `${code}_${cloCode}_${ploCode}`;
  const mappingRef = curriculumRef.collection("clo_plo_mappings").doc(mappingId);

  await adminDb.runTransaction(async (tx) => {
    const [cloSnap, existingMapping] = await Promise.all([tx.get(courseRef.collection("clos").doc(cloCode)), tx.get(mappingRef)]);
    if (!cloSnap.exists || (cloSnap.data() as { is_deleted: boolean }).is_deleted) {
      throw new Error("ไม่พบ CLO นี้ หรือถูกลบไปแล้ว");
    }

    if (action === "bind") {
      const ready = await computeCloPloReady(tx, curriculumRef, courseRef, code, {
        addMapping: { id: mappingId, clo_id: cloCode },
      });
      if (!existingMapping.exists) {
        tx.create(mappingRef, {
          mapping_id: mappingId,
          clo_id: cloCode,
          plo_id: ploCode,
          confirmed_by: user.uid,
          created_at: FieldValue.serverTimestamp(),
        });
      }
      tx.update(courseRef, { clo_plo_ready: ready });
    } else if (action === "unbind") {
      const ready = await computeCloPloReady(tx, curriculumRef, courseRef, code, { removeMappingId: mappingId });
      if (existingMapping.exists) {
        tx.delete(mappingRef);
      }
      tx.update(courseRef, { clo_plo_ready: ready });
    } else {
      throw new Error("ไม่รู้จักการกระทำนี้");
    }
  });

  revalidatePath(`/courses/${curriculumId}/${code}`);
}

// Called directly from the client (CloCard's "ให้ AI แนะนำ PLO" button, not a <form> submit) —
// returns suggestions for the UI to highlight, but never writes clo_plo_mapping itself. The
// instructor still has to click a PLO chip to actually bind it — that click is the human
// confirmation rule #3 requires, so no separate draft/confirm entity is needed for this.
export async function suggestPlosForClo(curriculumId: string, code: string, cloCode: string): Promise<PloSuggestion[]> {
  const { curriculumRef, courseRef } = await requireOwnedCourse(curriculumId, code);

  const [cloSnap, plosSnap] = await Promise.all([
    courseRef.collection("clos").doc(cloCode).get(),
    curriculumRef.collection("plos").where("is_deleted", "==", false).get(),
  ]);
  if (!cloSnap.exists) throw new Error("ไม่พบ CLO นี้");

  const { description } = cloSnap.data() as { description: string };
  const plos = plosSnap.docs.map((d) => ({ plo_id: d.id, description: (d.data() as { description: string }).description }));

  return suggestCloPloMatches({ cloDescription: description, plos });
}

// AB-11/AB-16 in-app equivalent: an on-demand "ให้ AI สรุปภาพรวมวิชา" button — reads only
// `confirmed` coverage data (src/lib/course-coverage.ts) and logs each run to
// curricula/{id}/courses/{code}/overview_logs so the page can show the latest one without
// recomputing on every load. Purely informational (free-text, like AB-16's Area of Improvement)
// — nothing here writes clo_plo_mapping/ai_match_result, so no separate confirm step applies.
export async function generateCourseOverview(formData: FormData) {
  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const { courseRef } = await requireOwnedCourse(curriculumId, code);

  const courseSnap = await courseRef.get();
  const { name } = courseSnap.data() as { name: string };

  const coverage = await computeCourseCoverage(curriculumId, code);
  const overview = await summarizeCourseOverview({
    courseName: name,
    coveragePercent: coverage.coveragePercent,
    clos: coverage.perClo.map((c) => ({ code: c.code, description: c.description, isMatched: c.isMatched, matchFrequency: c.matchFrequency })),
  });

  await courseRef.collection("overview_logs").add({
    summary: overview.summary,
    recommendations: overview.recommendations,
    coverage_percent: coverage.coveragePercent,
    total_clo_count: coverage.totalCloCount,
    matched_clo_count: coverage.matchedCloCount,
    created_at: FieldValue.serverTimestamp(),
  });

  revalidatePath(`/courses/${curriculumId}/${code}`);
}

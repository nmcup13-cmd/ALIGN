"use server";

import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { put } from "@vercel/blob";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";
import { runCloMatchAgent, AiMatchError } from "@/lib/ai/openrouter";

// Server Actions body limit is raised to 4mb in next.config.ts, but Vercel serverless
// Functions hard-reject request bodies above ~4.5MB regardless — so each individual evidence
// file is capped well under that ceiling.
const MAX_EVIDENCE_FILE_BYTES = 4 * 1024 * 1024;

// POST /teaching-records + POST /teaching-records/{id}/ai-match per align-technical-design.md
// §4 (E3). AI results always land as ai_match_result.state='draft' (business rule #3) — the
// only place state can become 'confirmed' is confirmMatchResult in review/actions.ts.
//
// runAiMatch is the agent orchestrator — 4 explicit steps: (1) read multiple sources,
// (2) call the LLM to summarize + suggest, (3) write drafts back, (4) log the run. It never
// throws — every outcome (including failure) is captured in an agent_logs doc, so callers
// (createTeachingRecord, retryAiMatch) can call it plainly without their own try/catch.

async function loadCourse(curriculumId: string, code: string) {
  const courseRef = adminDb.collection("curricula").doc(curriculumId).collection("courses").doc(code);
  const snap = await courseRef.get();
  if (!snap.exists) throw new Error("ไม่พบรายวิชานี้");
  return snap.data() as { instructor_id: string; clo_plo_ready: boolean };
}

export async function runAiMatch(recordId: string): Promise<void> {
  const recordRef = adminDb.collection("teaching_records").doc(recordId);
  const record = await recordRef.get();
  if (!record.exists) throw new Error("ไม่พบบันทึกการสอนนี้");
  const { course_id, curriculum_id, topic, week_no } = record.data() as {
    course_id: string;
    curriculum_id: string;
    topic: string;
    week_no: number;
  };

  const logRef = recordRef.collection("agent_logs").doc();

  try {
    // Step 1 — read multiple sources: CLOs, the course syllabus, and every other teaching
    // record of this course (context so the AI can notice overlap/gaps, not just the topic).
    const courseRef = adminDb.collection("curricula").doc(curriculum_id).collection("courses").doc(course_id);
    const [closSnap, syllabusSnap, otherRecordsSnap] = await Promise.all([
      courseRef.collection("clos").where("is_deleted", "==", false).get(),
      courseRef.collection("syllabus").doc("main").get(),
      adminDb
        .collection("teaching_records")
        .where("course_id", "==", course_id)
        .where("is_deleted", "==", false)
        .get(),
    ]);

    const clos = closSnap.docs.map((d) => ({
      clo_id: d.id,
      description: (d.data() as { description: string }).description,
    }));
    const syllabusContent = syllabusSnap.exists
      ? ((syllabusSnap.data() as { content?: { week_no: number; topic: string }[] }).content ?? [])
      : [];
    const otherRecords = otherRecordsSnap.docs
      .filter((d) => d.id !== recordId)
      .map((d) => d.data() as { week_no: number; topic: string })
      .map((d) => ({ week_no: d.week_no, topic: d.topic }));

    // Step 2 — summarize + suggest (single LLM call, see src/lib/ai/openrouter.ts).
    const agentOutput = await runCloMatchAgent({
      topic,
      weekNo: week_no,
      clos,
      syllabus: syllabusContent,
      otherRecords,
    });

    // Step 3 — write results back as drafts (never auto-confirmed — rule #3).
    const mappingsSnap = await adminDb.collection("curricula").doc(curriculum_id).collection("clo_plo_mappings").get();
    const ploIdsByClo = new Map<string, string[]>();
    for (const doc of mappingsSnap.docs) {
      const { clo_id, plo_id } = doc.data() as { clo_id: string; plo_id: string };
      const list = ploIdsByClo.get(clo_id) ?? [];
      list.push(plo_id); // linked_plo_ids come from clo_plo_mapping, never guessed by the AI (§4.1)
      ploIdsByClo.set(clo_id, list);
    }

    const batch = adminDb.batch();
    for (const result of agentOutput.results) {
      const ref = adminDb.collection("ai_match_results").doc();
      batch.create(ref, {
        match_result_id: ref.id,
        teaching_record_id: recordId,
        course_id,
        curriculum_id,
        clo_id: result.clo_id,
        match_confidence: result.match_confidence,
        recommendation: result.recommendation,
        reasoning: result.reasoning,
        linked_plo_ids: ploIdsByClo.get(result.clo_id) ?? [],
        state: "draft",
        confirmed_by: null,
        confirmed_at: null,
        created_at: FieldValue.serverTimestamp(),
      });
    }

    // Step 4 — log the run (success case).
    batch.create(logRef, {
      log_id: logRef.id,
      teaching_record_id: recordId,
      course_id,
      curriculum_id,
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
      sources: {
        topic,
        week_no,
        clo_count: clos.length,
        syllabus_available: syllabusContent.length > 0,
        other_records_count: otherRecords.length,
      },
      summary: agentOutput.summary,
      status: "ok",
      error_message: null,
      created_at: FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    // Step 4 — log the run (failure case) — always recorded, never thrown further.
    const message = err instanceof AiMatchError || err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
    await logRef.create({
      log_id: logRef.id,
      teaching_record_id: recordId,
      course_id,
      curriculum_id,
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
      sources: null,
      summary: null,
      status: "error",
      error_message: message,
      created_at: FieldValue.serverTimestamp(),
    });
  }
}

// Not in the original spec (requirement-align.md/product-backlog.md say nothing about recording
// the same week twice — a course legitimately can have >1 session/week). This is a UX safeguard
// added on request: let the instructor know before they accidentally create a duplicate, and
// choose what to do, rather than silently allowing or silently blocking it.
export async function checkExistingRecordForWeek(
  curriculumId: string,
  code: string,
  weekNo: number,
): Promise<{ id: string; topic: string; taughtAt: string } | null> {
  await requireApprovedUser(["instructor"]);
  const snap = await adminDb
    .collection("teaching_records")
    .where("course_id", "==", code)
    .where("curriculum_id", "==", curriculumId)
    .where("week_no", "==", weekNo)
    .where("is_deleted", "==", false)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() as { topic: string; taught_at: string };
  return { id: doc.id, topic: data.topic, taughtAt: data.taught_at };
}

export async function createTeachingRecord(formData: FormData, replaceRecordId?: string) {
  const user = await requireApprovedUser(["instructor"]);

  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const course = await loadCourse(curriculumId, code);

  if (course.instructor_id !== user.uid) {
    throw new Error("ไม่มีสิทธิ์บันทึกการสอนของวิชานี้");
  }
  if (!course.clo_plo_ready) {
    throw new Error("วิชานี้ยังไม่ได้ผูก CLO–PLO — บันทึกการสอนไม่ได้ (กฎ #1)");
  }

  const weekNo = Number(formData.get("week_no"));
  const taughtAt = String(formData.get("taught_at") ?? "");
  const topic = String(formData.get("topic") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const academicYear = Number(formData.get("academic_year"));

  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 15) {
    throw new Error("สัปดาห์ที่สอนไม่ถูกต้อง");
  }
  if (!taughtAt || taughtAt > new Date().toISOString().slice(0, 10)) {
    throw new Error("วันที่สอนจริงต้องไม่ใช่วันที่ในอนาคต");
  }
  if (!topic) {
    throw new Error("กรุณาระบุหัวข้อการสอน");
  }
  if (!["1", "2", "summer"].includes(semester)) {
    throw new Error("กรุณาระบุภาคเรียน");
  }
  if (!Number.isInteger(academicYear) || academicYear < 2500 || academicYear > 2700) {
    throw new Error("ปีการศึกษาไม่ถูกต้อง");
  }

  // Evidence files (AB-05/AB-06) — validate every file BEFORE creating/replacing anything,
  // so a too-large file never leaves behind a partially-created teaching record.
  const evidenceFiles = formData.getAll("evidence_files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of evidenceFiles) {
    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      throw new Error(`ไฟล์ ${file.name} มีขนาดเกิน 4MB`);
    }
  }

  if (replaceRecordId) {
    // Soft-delete only — this also correctly excludes it from coverage/frequency aggregation
    // (align-api-schema-design.md §3.7: "กรอง is_deleted=false ก่อนคำนวณ...clo_coverage_summary").
    // Its ai_match_results stay as historical rows, same as any other soft-deleted record.
    const oldRef = adminDb.collection("teaching_records").doc(replaceRecordId);
    const oldSnap = await oldRef.get();
    if (oldSnap.exists && (oldSnap.data() as { course_id: string }).course_id === code) {
      await oldRef.update({ is_deleted: true, deleted_at: FieldValue.serverTimestamp() });
    }
  }

  const recordRef = adminDb.collection("teaching_records").doc();
  await recordRef.create({
    record_id: recordRef.id,
    course_id: code,
    curriculum_id: curriculumId,
    topic,
    week_no: weekNo,
    taught_at: taughtAt,
    semester,
    academic_year: academicYear,
    created_by: user.uid,
    status: "draft_ai_pending",
    is_deleted: false,
    deleted_at: null,
    created_at: FieldValue.serverTimestamp(),
  });

  // Upload evidence files (AB-05/AB-06) after the teaching_record exists. Evidence is
  // supplementary — a failed upload here does not roll back the already-created record — but
  // the error still surfaces to the instructor so they know a file didn't attach.
  for (const file of evidenceFiles) {
    const pathname = `evidence/${curriculumId}/${code}/${recordRef.id}/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, { access: "private" });
    const evidenceRef = adminDb.collection("evidence").doc();
    await evidenceRef.create({
      evidence_id: evidenceRef.id,
      teaching_record_id: recordRef.id,
      course_id: code,
      curriculum_id: curriculumId,
      file_name: file.name,
      blob_pathname: blob.pathname,
      content_type: blob.contentType ?? file.type ?? null,
      uploaded_by: user.uid,
      created_at: FieldValue.serverTimestamp(),
      is_deleted: false,
    });
  }

  // teaching_record is saved regardless of AI outcome — runAiMatch never throws (it logs
  // failures to agent_logs instead), and the review page offers a retry button if it failed,
  // per align-api-schema-design.md §2.7 decoupling.
  await runAiMatch(recordRef.id);

  redirect(`/courses/${curriculumId}/${code}/teaching-records/${recordRef.id}/review`);
}

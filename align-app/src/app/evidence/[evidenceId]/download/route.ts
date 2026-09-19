import { FieldValue } from "firebase-admin/firestore";
import { get } from "@vercel/blob";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";

// GET /evidence/{evidenceId}/download — AB-07: only the owning instructor of the evidence's
// course, or a program_admin in scope for the evidence's curriculum, may download an evidence
// file. Every successful download is logged to evidence_access_logs (PDPA audit trail) — the
// log is written only on the success path, never on a 401/403/404, per the access-control spec.

interface EvidenceDoc {
  teaching_record_id: string;
  course_id: string;
  curriculum_id: string;
  file_name: string;
  blob_pathname: string;
  content_type: string | null;
  is_deleted: boolean;
}

export async function GET(_req: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await params;

  const user = await getCurrentUser();
  if (!user || user.account_status !== "approved") {
    return new Response("Unauthorized", { status: 401 });
  }

  const evidenceRef = adminDb.collection("evidence").doc(evidenceId);
  const evidenceSnap = await evidenceRef.get();
  if (!evidenceSnap.exists) {
    return new Response("Not found", { status: 404 });
  }
  const evidence = evidenceSnap.data() as EvidenceDoc;
  if (evidence.is_deleted) {
    return new Response("Not found", { status: 404 });
  }

  const courseSnap = await adminDb
    .collection("curricula")
    .doc(evidence.curriculum_id)
    .collection("courses")
    .doc(evidence.course_id)
    .get();
  if (!courseSnap.exists) {
    return new Response("Not found", { status: 404 });
  }
  const course = courseSnap.data() as { instructor_id: string };

  const isOwningInstructor = user.effectiveRole === "instructor" && user.uid === course.instructor_id;
  const isScopedProgramAdmin =
    user.effectiveRole === "program_admin" &&
    (user.program_admin_curriculum_scope ?? []).includes(evidence.curriculum_id);
  if (!isOwningInstructor && !isScopedProgramAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const result = await get(evidence.blob_pathname, { access: "private" });
  if (result?.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  const logRef = adminDb.collection("evidence_access_logs").doc();
  await logRef.create({
    log_id: logRef.id,
    evidence_id: evidenceId,
    course_id: evidence.course_id,
    curriculum_id: evidence.curriculum_id,
    accessed_by: user.uid,
    accessed_at: FieldValue.serverTimestamp(),
  });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || evidence.content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(evidence.file_name)}"`,
    },
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";
import { computeProgramCoverage } from "@/lib/program-coverage";
import { summarizeProgramOverview } from "@/lib/ai/openrouter";

// AB-14 program-level "ให้ AI สรุปภาพรวมหลักสูตร" — program_admin only, restricted to curricula
// in program_admin_curriculum_scope (PDPA). Logs every run to
// curricula/{id}/program_overview_logs so the dashboard can show the latest one without
// recomputing on every load, same pattern as generateCourseOverview.
export async function generateProgramOverview(formData: FormData) {
  const user = await requireApprovedUser(["program_admin"]);

  const curriculumId = String(formData.get("curriculum_id") ?? "").trim();
  if (!(user.program_admin_curriculum_scope ?? []).includes(curriculumId)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงหลักสูตรนี้");
  }

  const semester = formData.get("semester") ? String(formData.get("semester")) : undefined;
  const academicYear = formData.get("academic_year") ? Number(formData.get("academic_year")) : undefined;

  const program = await computeProgramCoverage(curriculumId, { semester, academicYear });
  const termLabel = semester || academicYear ? `ภาคเรียนที่ ${semester ?? "ทั้งหมด"} ปีการศึกษา ${academicYear ?? "ทั้งหมด"}` : "ทั้งหมดทุกภาค/ปี";

  const overview = await summarizeProgramOverview({
    curriculumId,
    termLabel,
    overallCoveragePercent: program.overallCoveragePercent,
    courses: program.courses.map((c) => ({ courseId: c.courseId, courseName: c.courseName, coveragePercent: c.coverage.coveragePercent })),
    plos: program.plos.map((p) => ({ code: p.code, description: p.description, percent: p.percent })),
  });

  await adminDb
    .collection("curricula")
    .doc(curriculumId)
    .collection("program_overview_logs")
    .add({
      summary: overview.summary,
      recommendations: overview.recommendations,
      overall_coverage_percent: program.overallCoveragePercent,
      semester: semester ?? null,
      academic_year: academicYear ?? null,
      created_by: user.uid,
      created_at: FieldValue.serverTimestamp(),
    });

  revalidatePath("/dashboard");
}

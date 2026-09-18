import "server-only";
import { adminDb } from "@/lib/firebase/admin";

// Live computation of clo_coverage_summary (align-api-schema-design.md §2.10, formulas from
// AB-20/AB-21) — computed on read rather than persisted, which the schema doc explicitly allows
// ("recompute เป็นระยะ...หรือ query สดตอนอ่านก็ได้ — เอกสารนี้ไม่ฟันธงวิธี"). Only counts
// ai_match_result docs with state='confirmed' (rule #3) whose teaching_record has not been
// soft-deleted (§3.7: "กรอง is_deleted=false ก่อนคำนวณ...clo_coverage_summary").

export interface CloCoverageStat {
  code: string;
  description: string;
  isMatched: boolean;
  matchFrequency: number;
  matchFrequencyPercent: number | null;
}

export interface CourseCoverage {
  totalCloCount: number;
  matchedCloCount: number;
  coveragePercent: number | null; // null = "ยังไม่มี CLO" (AB-11 edge case, TC-AB11-03)
  totalTeachingRecordCount: number;
  perClo: CloCoverageStat[];
}

export interface TermFilter {
  semester?: string;
  academicYear?: number;
}

export async function computeCourseCoverage(curriculumId: string, code: string, filter?: TermFilter): Promise<CourseCoverage> {
  const courseRef = adminDb.collection("curricula").doc(curriculumId).collection("courses").doc(code);

  const [closSnap, recordsSnap, confirmedMatchesSnap] = await Promise.all([
    courseRef.collection("clos").where("is_deleted", "==", false).get(),
    adminDb
      .collection("teaching_records")
      .where("course_id", "==", code)
      .where("curriculum_id", "==", curriculumId)
      .where("is_deleted", "==", false)
      .get(),
    adminDb.collection("ai_match_results").where("course_id", "==", code).where("state", "==", "confirmed").get(),
  ]);

  // Optional semester/academic_year filter (added for AB-14 program-level dashboard) — applied
  // in-process rather than as a Firestore `where` so callers without a filter (existing
  // per-course page) keep working unchanged. Records without these fields (entered before this
  // filter existed) never match a term filter — they still count in the unfiltered view.
  const filteredRecordDocs = filter
    ? recordsSnap.docs.filter((d) => {
        const data = d.data() as { semester?: string; academic_year?: number };
        if (filter.semester && data.semester !== filter.semester) return false;
        if (filter.academicYear && data.academic_year !== filter.academicYear) return false;
        return true;
      })
    : recordsSnap.docs;

  const nonDeletedRecordIds = new Set(filteredRecordDocs.map((d) => d.id));
  const totalTeachingRecordCount = filteredRecordDocs.length;

  const confirmedByClo = new Map<string, number>();
  for (const doc of confirmedMatchesSnap.docs) {
    const { clo_id, teaching_record_id } = doc.data() as { clo_id: string; teaching_record_id: string };
    if (!nonDeletedRecordIds.has(teaching_record_id)) continue; // exclude matches for deleted records
    confirmedByClo.set(clo_id, (confirmedByClo.get(clo_id) ?? 0) + 1);
  }

  const perClo: CloCoverageStat[] = closSnap.docs
    .map((d) => {
      const data = d.data() as { description: string };
      const matchFrequency = confirmedByClo.get(d.id) ?? 0;
      return {
        code: d.id,
        description: data.description,
        isMatched: matchFrequency > 0,
        matchFrequency,
        matchFrequencyPercent: totalTeachingRecordCount > 0 ? (matchFrequency / totalTeachingRecordCount) * 100 : null,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const totalCloCount = perClo.length;
  const matchedCloCount = perClo.filter((c) => c.isMatched).length;

  return {
    totalCloCount,
    matchedCloCount,
    coveragePercent: totalCloCount > 0 ? (matchedCloCount / totalCloCount) * 100 : null,
    totalTeachingRecordCount,
    perClo,
  };
}

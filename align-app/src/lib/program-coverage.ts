import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { computeCourseCoverage, type TermFilter, type CourseCoverage } from "@/lib/course-coverage";

// AB-14 (E4): program-level dashboard — one curriculum group at a time (2565/2570 numbers must
// never be merged, per align-program-admin-screens.md หน้าจอ 3). "บรรลุ PLO" has no defined
// pass/fail threshold anywhere in the spec, so this only ever reports a proportion (matched
// linked-CLO / total linked-CLO per PLO) — never a fabricated achieved/not-achieved verdict.

export interface ProgramCourseStat {
  courseId: string;
  courseName: string;
  coverage: CourseCoverage;
}

export interface ProgramPloStat {
  code: string;
  description: string;
  totalLinkedClo: number;
  matchedLinkedClo: number;
  percent: number | null;
}

export interface ProgramCoverage {
  courses: ProgramCourseStat[];
  plos: ProgramPloStat[];
  overallCoveragePercent: number | null;
}

export async function computeProgramCoverage(curriculumId: string, filter?: TermFilter): Promise<ProgramCoverage> {
  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);

  const [coursesSnap, plosSnap, mappingsSnap] = await Promise.all([
    curriculumRef.collection("courses").get(),
    curriculumRef.collection("plos").where("is_deleted", "==", false).get(),
    curriculumRef.collection("clo_plo_mappings").get(),
  ]);

  const courses = coursesSnap.docs.map((d) => ({
    courseId: d.id,
    ...(d.data() as { name: string }),
  }));

  const courseStats: ProgramCourseStat[] = await Promise.all(
    courses.map(async (c) => ({
      courseId: c.courseId,
      courseName: c.name,
      coverage: await computeCourseCoverage(curriculumId, c.courseId, filter),
    })),
  );

  // matched CLOs across the whole curriculum, keyed by "{course_id}_{clo_code}" since CLO codes
  // repeat across courses (a mapping's clo_id alone is only unique within its own course).
  const matchedCloKeys = new Set<string>();
  for (const stat of courseStats) {
    for (const clo of stat.coverage.perClo) {
      if (clo.isMatched) matchedCloKeys.add(`${stat.courseId}_${clo.code}`);
    }
  }

  const totalCloAcrossCourses = courseStats.reduce((sum, s) => sum + s.coverage.totalCloCount, 0);
  const matchedCloAcrossCourses = courseStats.reduce((sum, s) => sum + s.coverage.matchedCloCount, 0);

  const linkedByPlo = new Map<string, { total: number; matched: number }>();
  for (const doc of mappingsSnap.docs) {
    const { clo_id, plo_id } = doc.data() as { clo_id: string; plo_id: string };
    // doc.id = "{course_id}_{clo_code}_{plo_code}" — recover course_id to disambiguate clo_id.
    const courseId = doc.id.slice(0, doc.id.length - `_${clo_id}_${plo_id}`.length);
    const key = linkedByPlo.get(plo_id) ?? { total: 0, matched: 0 };
    key.total += 1;
    if (matchedCloKeys.has(`${courseId}_${clo_id}`)) key.matched += 1;
    linkedByPlo.set(plo_id, key);
  }

  const plos: ProgramPloStat[] = plosSnap.docs
    .map((d) => {
      const data = d.data() as { description: string };
      const stat = linkedByPlo.get(d.id) ?? { total: 0, matched: 0 };
      return {
        code: d.id,
        description: data.description,
        totalLinkedClo: stat.total,
        matchedLinkedClo: stat.matched,
        percent: stat.total > 0 ? (stat.matched / stat.total) * 100 : null,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return {
    courses: courseStats,
    plos,
    overallCoveragePercent: totalCloAcrossCourses > 0 ? (matchedCloAcrossCourses / totalCloAcrossCourses) * 100 : null,
  };
}

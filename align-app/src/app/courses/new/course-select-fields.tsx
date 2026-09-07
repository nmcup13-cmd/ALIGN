"use client";

import { useState } from "react";
import { COURSE_CATALOG } from "@/lib/course-catalog";

interface Curriculum {
  id: string;
  name: string;
}

// Cascading dropdowns: pick a curriculum year, then pick a real course from that
// curriculum's catalog (docs/01-requirements/01-spec/plo-course-master-data.md) — no more
// free-text code/name entry, so it can never drift from the real course list.
export function CourseSelectFields({ curricula }: { curricula: Curriculum[] }) {
  const [curriculumId, setCurriculumId] = useState(curricula[0]?.id ?? "");
  const courses = COURSE_CATALOG[curriculumId] ?? [];

  return (
    <>
      <label style={{ fontWeight: 600 }}>
        หลักสูตร
        <select
          name="curriculum_id"
          required
          value={curriculumId}
          onChange={(e) => setCurriculumId(e.target.value)}
          disabled={curricula.length === 0}
          style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem" }}
        >
          {curricula.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ fontWeight: 600 }}>
        รายวิชา
        <select
          name="code"
          required
          disabled={courses.length === 0}
          style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem" }}
        >
          {courses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.nameTh} ({c.nameEn})
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

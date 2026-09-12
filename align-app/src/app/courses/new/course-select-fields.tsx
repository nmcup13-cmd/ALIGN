"use client";

import { useState } from "react";
import { COURSE_CATALOG } from "@/lib/course-catalog";
import { Field, Select } from "@/components/ui";

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
      <Field label="หลักสูตร">
        <Select
          name="curriculum_id"
          required
          value={curriculumId}
          onChange={(e) => setCurriculumId(e.target.value)}
          disabled={curricula.length === 0}
        >
          {curricula.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="รายวิชา">
        <Select name="code" required disabled={courses.length === 0}>
          {courses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.nameTh} ({c.nameEn})
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

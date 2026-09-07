"use client";

import { deleteCourse } from "./actions";

// Native <form action={serverAction}> forms have no built-in confirm step — this wraps the
// submit in a plain window.confirm() so delete always asks first, per the requirement.
export function DeleteCourseButton({
  curriculumId,
  code,
  courseLabel,
}: {
  curriculumId: string;
  code: string;
  courseLabel: string;
}) {
  return (
    <form
      action={deleteCourse}
      onSubmit={(e) => {
        if (!confirm(`ลบรายวิชา "${courseLabel}" ใช่หรือไม่? การลบนี้ย้อนกลับไม่ได้`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline" }}
    >
      <input type="hidden" name="curriculum_id" value={curriculumId} />
      <input type="hidden" name="code" value={code} />
      <button type="submit" style={{ padding: "4px 10px", cursor: "pointer", color: "#900" }}>
        ลบ
      </button>
    </form>
  );
}

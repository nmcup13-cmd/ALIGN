"use client";

import { deleteCourse } from "./actions";
import { Button } from "@/components/ui";

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
      className="inline"
    >
      <input type="hidden" name="curriculum_id" value={curriculumId} />
      <input type="hidden" name="code" value={code} />
      <Button type="submit" variant="danger" className="px-3 py-1">
        ลบ
      </Button>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import { Button, Card, ErrorText, Field, Input, Select } from "@/components/ui";
import { checkExistingRecordForWeek, createTeachingRecord } from "../actions";

const CURRENT_THAI_YEAR = new Date().getFullYear() + 543;
const MAX_EVIDENCE_FILE_BYTES = 4 * 1024 * 1024;

export function TeachingRecordForm({ curriculumId, code, today }: { curriculumId: string; code: string; today: string }) {
  const [week, setWeek] = useState(12);
  const [taughtAt, setTaughtAt] = useState(today);
  const [topic, setTopic] = useState("");
  const [semester, setSemester] = useState("1");
  const [academicYear, setAcademicYear] = useState(CURRENT_THAI_YEAR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<{ id: string; topic: string; taughtAt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function buildFormData() {
    const fd = new FormData();
    fd.set("curriculum_id", curriculumId);
    fd.set("code", code);
    fd.set("week_no", String(week));
    fd.set("taught_at", taughtAt);
    fd.set("topic", topic);
    fd.set("semester", semester);
    fd.set("academic_year", String(academicYear));
    for (const file of fileInputRef.current?.files ?? []) {
      fd.append("evidence_files", file);
    }
    return fd;
  }

  async function doSubmit(replaceRecordId?: string) {
    setSubmitting(true);
    setError(null);
    try {
      // createTeachingRecord redirects internally on success — this only resolves if it throws.
      await createTeachingRecord(buildFormData(), replaceRecordId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!topic.trim()) {
      setError("กรุณาระบุหัวข้อการสอน");
      return;
    }
    const oversizedFile = Array.from(fileInputRef.current?.files ?? []).find((f) => f.size > MAX_EVIDENCE_FILE_BYTES);
    if (oversizedFile) {
      setError(`ไฟล์ ${oversizedFile.name} มีขนาดเกิน 4MB`);
      return;
    }

    // Not required by the original spec — a UX safeguard so an instructor doesn't accidentally
    // create a second record for a week they already recorded, without at least being asked.
    const existing = await checkExistingRecordForWeek(curriculumId, code, week);
    if (existing) {
      setConflict(existing);
      return;
    }
    await doSubmit();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <Field label="สัปดาห์ที่สอน">
            <Select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="w-32">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  สัปดาห์ที่ {w}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="วันที่สอนจริง">
            <Input type="date" max={today} value={taughtAt} onChange={(e) => setTaughtAt(e.target.value)} />
          </Field>
        </div>

        <div className="flex gap-4">
          <Field label="ภาคเรียน">
            <Select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-40">
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
              <option value="summer">ภาคฤดูร้อน</option>
            </Select>
          </Field>
          <Field label="ปีการศึกษา">
            <Input
              type="number"
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
              className="w-32"
            />
          </Field>
        </div>

        <Field label="หัวข้อการสอน">
          <Input
            type="text"
            placeholder="เช่น Workshop เสริม: การตรวจสอบข่าวปลอมด้วยเครื่องมือ AI"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
        </Field>

        <Field label="แนบไฟล์หลักฐาน (ไม่บังคับ, ไฟล์ละไม่เกิน 4MB)">
          <input
            ref={fileInputRef}
            type="file"
            name="evidence_files"
            multiple
            className="w-full rounded-sm border border-border-default bg-bg-surface px-3 py-2 text-body-sm text-text-primary file:mr-3 file:rounded-sm file:border-0 file:bg-bg-surface-sunken file:px-3 file:py-1.5 file:text-body-sm file:font-medium file:text-text-primary"
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}

        <Button type="submit" variant="primary" className="self-start" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "บันทึกและให้ AI ประมวลผล"}
        </Button>
      </form>

      {conflict && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-text-primary/40">
          <div className="flex w-[420px] flex-col gap-3 rounded-md bg-bg-surface p-6 shadow-lg">
            <h3 className="text-h3 font-medium text-text-primary">สัปดาห์นี้มีบันทึกการสอนอยู่แล้ว</h3>
            <p className="text-body-sm text-text-secondary">
              สัปดาห์ที่ {week} มีบันทึกอยู่แล้ว: &ldquo;{conflict.topic}&rdquo; (วันที่ {conflict.taughtAt})
            </p>
            <p className="text-body-sm text-text-secondary">ต้องการทำอย่างไร?</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setConflict(null);
                  void doSubmit();
                }}
              >
                บันทึกใหม่ (เก็บของเดิมไว้ด้วย)
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const id = conflict.id;
                  setConflict(null);
                  void doSubmit(id);
                }}
              >
                ลบของเดิมแล้วบันทึกใหม่แทน
              </Button>
              <Button variant="ghost" onClick={() => setConflict(null)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

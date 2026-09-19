"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { updatePlo, deletePlo } from "./actions";

interface PloRowProps {
  plo: {
    code: string;
    description: string;
    isDeleted: boolean;
  };
  curriculumId: string;
}

export function PloRow({ plo, curriculumId }: PloRowProps) {
  const [editDescription, setEditDescription] = useState(plo.description);
  const [isEditing, setIsEditing] = useState(false);

  const handleDeleteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(`ลบ ${plo.code} "${plo.description}" ใช่หรือไม่? PLO นี้จะถูกซ่อนออกจากรายการที่ใช้งานอยู่ แต่ข้อมูลประวัติจะยังเก็บไว้`)) {
      e.preventDefault();
    }
  };

  if (plo.isDeleted) {
    return (
      <Card className="opacity-60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-body-sm text-text-secondary">{plo.code}</span>
            <span className="text-body-sm text-text-secondary">{plo.description}</span>
            <span className="text-caption text-text-secondary">(ลบแล้ว)</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-body-sm text-text-primary">{plo.code}</span>
        </div>

        {isEditing ? (
          <form action={updatePlo} className="flex items-end gap-2" onSubmit={() => setIsEditing(false)}>
            <input type="hidden" name="curriculum_id" value={curriculumId} />
            <input type="hidden" name="plo_code" value={plo.code} />
            <Input
              type="text"
              name="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" variant="primary" className="px-3 py-1">
              บันทึก
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1"
              onClick={() => {
                setEditDescription(plo.description);
                setIsEditing(false);
              }}
            >
              ยกเลิก
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-text-primary">{editDescription}</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="px-3 py-1" onClick={() => setIsEditing(true)}>
                แก้ไข
              </Button>
              <form action={deletePlo} onSubmit={handleDeleteSubmit}>
                <input type="hidden" name="curriculum_id" value={curriculumId} />
                <input type="hidden" name="plo_code" value={plo.code} />
                <Button type="submit" variant="danger" className="px-3 py-1">
                  ลบ
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

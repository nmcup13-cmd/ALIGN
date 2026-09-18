"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { updateMatchResult, confirmMatchResult } from "./actions";

export interface MatchResultItem {
  id: string;
  cloCode: string;
  cloDescription: string;
  matchConfidence: number;
  recommendation: string;
  reasoning: string;
  plosLabel: string;
  state: "draft" | "edited" | "confirmed" | "rejected";
}

const stateStyle: Record<MatchResultItem["state"], { card: string; badge: string; label: string }> = {
  draft: {
    card: "border-status-draft border-dashed bg-status-draft-tint",
    badge: "text-status-draft",
    label: "ผลจาก AI — ยังไม่ยืนยัน",
  },
  edited: {
    card: "border-status-draft border-dashed bg-status-draft-tint",
    badge: "text-status-draft",
    label: "แก้ไขแล้ว — ยังไม่ยืนยัน",
  },
  confirmed: {
    card: "border-primary-green bg-bg-surface",
    badge: "text-status-confirmed",
    label: "ยืนยันแล้ว",
  },
  rejected: {
    card: "border-border-default bg-bg-surface-sunken opacity-70",
    badge: "text-text-disabled",
    label: "ปฏิเสธแล้ว",
  },
};

export function MatchResultRow({
  item,
  hidden,
}: {
  item: MatchResultItem;
  hidden: { curriculum_id: string; code: string; record_id: string };
}) {
  const [editing, setEditing] = useState(false);
  const style = stateStyle[item.state];
  const canAct = item.state !== "confirmed" && item.state !== "rejected";

  return (
    <div className={`flex flex-col gap-2 rounded-md border p-4 ${style.card}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-body-sm">{item.cloCode}</span>
        <span className={`text-caption font-medium ${style.badge}`}>{style.label}</span>
      </div>
      <div className="text-body-sm">{item.cloDescription}</div>

      {(item.state === "draft" || item.state === "edited") && (
        <div className="rounded-sm bg-bg-surface p-2">
          <p className="text-body-sm font-medium text-text-primary">คำแนะนำจาก AI: {item.recommendation}</p>
          {item.reasoning && <p className="mt-0.5 text-caption text-text-secondary">{item.reasoning}</p>}
        </div>
      )}

      {editing ? (
        <form
          action={async (formData) => {
            await updateMatchResult(item.id, formData);
            setEditing(false);
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="action" value="edit" />
          <input type="hidden" name="curriculum_id" value={hidden.curriculum_id} />
          <input type="hidden" name="code" value={hidden.code} />
          <input type="hidden" name="record_id" value={hidden.record_id} />
          <span className="text-caption text-text-secondary">match %</span>
          <Input type="number" name="match_confidence" min={0} max={100} defaultValue={item.matchConfidence} className="w-20" />
          <Button type="submit" variant="secondary" className="px-3 py-1">
            เสร็จ
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <span className="font-mono text-body-sm">แมทช์ {item.matchConfidence}%</span>
          <span className="text-caption text-text-secondary">{item.plosLabel}</span>
        </div>
      )}

      {canAct && !editing && (
        <div className="flex gap-2">
          <Button variant="secondary" className="px-3 py-1" onClick={() => setEditing(true)}>
            แก้ไข
          </Button>
          <form action={updateMatchResult.bind(null, item.id)} className="inline">
            <input type="hidden" name="action" value="reject" />
            <input type="hidden" name="curriculum_id" value={hidden.curriculum_id} />
            <input type="hidden" name="code" value={hidden.code} />
            <input type="hidden" name="record_id" value={hidden.record_id} />
            <Button type="submit" variant="ghost" className="px-3 py-1">
              ปฏิเสธ
            </Button>
          </form>
          <form action={confirmMatchResult.bind(null, item.id)} className="inline">
            <input type="hidden" name="curriculum_id" value={hidden.curriculum_id} />
            <input type="hidden" name="code" value={hidden.code} />
            <input type="hidden" name="record_id" value={hidden.record_id} />
            <Button type="submit" variant="primary" className="px-3 py-1">
              ยืนยัน
            </Button>
          </form>
        </div>
      )}

      {item.state === "rejected" && (
        <form action={updateMatchResult.bind(null, item.id)} className="self-start">
          <input type="hidden" name="action" value="restore" />
          <input type="hidden" name="curriculum_id" value={hidden.curriculum_id} />
          <input type="hidden" name="code" value={hidden.code} />
          <input type="hidden" name="record_id" value={hidden.record_id} />
          <Button type="submit" variant="ghost" className="px-3 py-1">
            เลิกปฏิเสธ
          </Button>
        </form>
      )}
    </div>
  );
}

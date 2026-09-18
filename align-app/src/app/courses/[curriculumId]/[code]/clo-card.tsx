"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { deleteClo, toggleCloPloMapping, suggestPlosForClo } from "./actions";

export interface CloCardItem {
  code: string;
  description: string;
  plos: { code: string; bound: boolean }[];
}

interface Suggestion {
  plo_id: string;
  confidence: number;
  reasoning: string;
}

export function CloCard({ clo, hidden }: { clo: CloCardItem; hidden: { curriculum_id: string; code: string } }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const result = await suggestPlosForClo(hidden.curriculum_id, hidden.code, clo.code);
      setSuggestions(result);
      if (result.length === 0) setError("AI ไม่พบ PLO ที่เข้ากับ CLO นี้เป็นพิเศษ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ให้ AI แนะนำ PLO ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  const suggestionByPlo = new Map((suggestions ?? []).map((s) => [s.plo_id, s]));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border-default bg-bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-body-sm">{clo.code}</span>
          <span className="text-body-sm">{clo.description}</span>
        </div>
        <form
          action={deleteClo}
          onSubmit={(e) => {
            if (!confirm(`ลบ ${clo.code} "${clo.description}" ใช่หรือไม่? ประวัติผลจับคู่ AI เดิมจะยังเก็บไว้ แต่ CLO นี้จะถูกซ่อนออกจากรายการที่ใช้งานอยู่`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="curriculum_id" value={hidden.curriculum_id} />
          <input type="hidden" name="code" value={hidden.code} />
          <input type="hidden" name="clo_code" value={clo.code} />
          <Button type="submit" variant="danger" className="px-3 py-1">
            ลบ
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-secondary">เลือก PLO ที่ผูก</span>
          <Button type="button" variant="ghost" className="px-2 py-0.5 text-caption" onClick={handleSuggest} disabled={loading}>
            {loading ? "กำลังให้ AI แนะนำ..." : "ให้ AI แนะนำ PLO"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {clo.plos.map((plo) => {
            const suggestion = suggestionByPlo.get(plo.code);
            const suggestedNotBound = suggestion && !plo.bound;
            return (
              <form key={plo.code} action={toggleCloPloMapping} className="inline">
                <input type="hidden" name="curriculum_id" value={hidden.curriculum_id} />
                <input type="hidden" name="code" value={hidden.code} />
                <input type="hidden" name="clo_code" value={clo.code} />
                <input type="hidden" name="plo_code" value={plo.code} />
                <input type="hidden" name="action" value={plo.bound ? "unbind" : "bind"} />
                <button
                  type="submit"
                  title={suggestion ? `AI แนะนำ (${suggestion.confidence}%): ${suggestion.reasoning}` : undefined}
                  className={
                    plo.bound
                      ? "rounded-sm border border-curriculum-2570 bg-curriculum-2570-tint px-2 py-0.5 font-mono text-caption text-curriculum-2570"
                      : suggestedNotBound
                        ? "rounded-sm border border-dashed border-status-draft bg-status-draft-tint px-2 py-0.5 font-mono text-caption text-status-draft"
                        : "rounded-sm border border-border-default bg-bg-surface px-2 py-0.5 font-mono text-caption text-text-primary hover:border-border-strong"
                  }
                >
                  {plo.code}
                  {suggestedNotBound ? ` · AI ${suggestion.confidence}%` : ""}
                </button>
              </form>
            );
          })}
        </div>

        {error && <p className="text-caption text-status-gap">{error}</p>}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 rounded-sm bg-bg-surface-sunken p-2">
            <p className="text-caption font-medium text-text-secondary">คำแนะนำจาก AI (ยังไม่ผูก จนกว่าจะกดชิป PLO เอง)</p>
            {suggestions.map((s) => (
              <p key={s.plo_id} className="text-caption text-text-secondary">
                <span className="font-mono">{s.plo_id}</span> ({s.confidence}%) — {s.reasoning}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

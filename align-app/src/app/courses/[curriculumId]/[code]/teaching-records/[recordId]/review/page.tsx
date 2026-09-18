import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { Button, Card, CurriculumTag, ErrorText, InfoNote, PageTitle, PageShell, TextLink } from "@/components/ui";
import { MatchResultRow, type MatchResultItem } from "./match-result-row";
import { confirmAllMatchResults, retryAiMatch } from "./actions";

export const dynamic = "force-dynamic";

interface AiMatchResultDoc {
  clo_id: string;
  match_confidence: number;
  recommendation?: string;
  reasoning?: string;
  linked_plo_ids: string[];
  state: MatchResultItem["state"];
  created_at?: { toMillis(): number } | null;
}

interface AgentLogDoc {
  status: "ok" | "error";
  summary: string | null;
  error_message: string | null;
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ curriculumId: string; code: string; recordId: string }>;
}) {
  const { curriculumId, code, recordId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  const courseRef = adminDb.collection("curricula").doc(curriculumId).collection("courses").doc(code);
  const [courseSnap, recordSnap] = await Promise.all([
    courseRef.get(),
    adminDb.collection("teaching_records").doc(recordId).get(),
  ]);
  if (!courseSnap.exists || !recordSnap.exists) notFound();

  const course = courseSnap.data() as { name: string; instructor_id: string };
  const record = recordSnap.data() as { topic: string; week_no: number; course_id: string };

  if (user.effectiveRole !== "instructor" || user.uid !== course.instructor_id || record.course_id !== code) {
    redirect("/courses");
  }

  const [closSnap, matchSnap, latestLogSnap] = await Promise.all([
    courseRef.collection("clos").where("is_deleted", "==", false).get(),
    adminDb.collection("ai_match_results").where("teaching_record_id", "==", recordId).get(),
    adminDb
      .collection("teaching_records")
      .doc(recordId)
      .collection("agent_logs")
      .orderBy("created_at", "desc")
      .limit(1)
      .get(),
  ]);

  const cloByCode = new Map(closSnap.docs.map((d) => [d.id, d.data() as { description: string }]));
  const latestLog = latestLogSnap.docs[0]?.data() as AgentLogDoc | undefined;

  // Re-running AI creates new ai_match_result docs (history kept, per api-schema-design.md
  // §5.7) — only show the most recently generated one per CLO.
  const latestByClo = new Map<string, { id: string; data: AiMatchResultDoc }>();
  for (const doc of matchSnap.docs) {
    const data = doc.data() as AiMatchResultDoc;
    const existing = latestByClo.get(data.clo_id);
    const thisTime = data.created_at?.toMillis() ?? 0;
    const existingTime = existing?.data.created_at?.toMillis() ?? 0;
    if (!existing || thisTime >= existingTime) {
      latestByClo.set(data.clo_id, { id: doc.id, data });
    }
  }

  const items: MatchResultItem[] = Array.from(latestByClo.values())
    .map(({ id, data }) => ({
      id,
      cloCode: data.clo_id,
      cloDescription: cloByCode.get(data.clo_id)?.description ?? data.clo_id,
      matchConfidence: data.match_confidence,
      recommendation: data.recommendation ?? "—",
      reasoning: data.reasoning ?? "",
      plosLabel: data.linked_plo_ids.length > 0 ? `${data.linked_plo_ids.join(" · ")} เชื่อมแล้ว` : "ไม่มี PLO เชื่อมโยง",
      state: data.state,
    }))
    .sort((a, b) => a.cloCode.localeCompare(b.cloCode));

  const hidden = { curriculum_id: curriculumId, code, record_id: recordId };
  const allDecided = items.length > 0 && items.every((i) => i.state === "confirmed" || i.state === "rejected");

  return (
    <PageShell width="md">
      <div className="flex items-center gap-3">
        <PageTitle>ตรวจสอบและยืนยันผล AI</PageTitle>
        <CurriculumTag id={curriculumId} />
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">
        {code} — {course.name} · สัปดาห์ที่ {record.week_no} · {record.topic}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {latestLog?.status === "ok" && latestLog.summary && (
          <Card className="border-status-info bg-bg-surface-sunken">
            <p className="text-caption font-medium text-status-info">สรุปจาก AI (ข้อเสนอแนะเบื้องต้น ไม่ใช่ข้อสรุปสุดท้าย)</p>
            <p className="mt-1 text-body-sm text-text-primary">{latestLog.summary}</p>
          </Card>
        )}

        {items.length === 0 ? (
          <Card className="flex flex-col gap-3">
            <ErrorText>
              ยังไม่มีผลจาก AI
              {latestLog?.status === "error" && latestLog.error_message ? ` — ${latestLog.error_message}` : " (ยังไม่ได้รัน)"}
            </ErrorText>
            <form action={retryAiMatch} className="self-start">
              <input type="hidden" name="curriculum_id" value={curriculumId} />
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="record_id" value={recordId} />
              <Button type="submit" variant="primary">
                ให้ AI ประมวลผลอีกครั้ง
              </Button>
            </form>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-medium text-text-primary">ผลจับคู่ CLO / PLO</h2>
              {!allDecided && (
                <form action={confirmAllMatchResults}>
                  <input type="hidden" name="curriculum_id" value={curriculumId} />
                  <input type="hidden" name="code" value={code} />
                  <input type="hidden" name="record_id" value={recordId} />
                  <Button type="submit" variant="primary">
                    ยืนยันผลจับคู่ทั้งหมด
                  </Button>
                </form>
              )}
            </div>
            {items.map((item) => (
              <MatchResultRow key={item.id} item={item} hidden={hidden} />
            ))}
            <form action={retryAiMatch} className="self-start">
              <input type="hidden" name="curriculum_id" value={curriculumId} />
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="record_id" value={recordId} />
              <Button type="submit" variant="ghost">
                ให้ AI ประมวลผลอีกครั้ง
              </Button>
            </form>
          </>
        )}
        <InfoNote>ผลจับคู่จะถูกใช้เป็นข้อมูลจริง (นับใน % ความสอดคล้อง) เฉพาะรายการที่ยืนยันแล้วเท่านั้น</InfoNote>
      </div>

      <div className="mt-8">
        <TextLink href="/courses">&larr; กลับ</TextLink>
      </div>
    </PageShell>
  );
}

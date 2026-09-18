import "server-only";

// External LLM API path (align-tech-stack.md §2.4 hybrid approach, feature-flag) used for
// E3 AI CLO/PLO matching (POST /teaching-records/{id}/ai-match, align-technical-design.md §3/§4.1)
// and for AI-assisted CLO–PLO binding suggestions on the "จัดการรายวิชา" page. Only ever sends
// short text (topics, CLO/PLO descriptions) — never evidence files/student PII — see
// docs/05-log/2026-09-18-openrouter-ai-match-log.md.

export interface CloForMatching {
  clo_id: string;
  description: string;
}

export interface SyllabusWeek {
  week_no: number;
  topic: string;
}

export interface OtherTeachingRecord {
  week_no: number;
  topic: string;
}

export interface CloMatchResult {
  clo_id: string;
  match_confidence: number;
  recommendation: string;
  reasoning: string;
}

export interface CloMatchAgentOutput {
  summary: string;
  results: CloMatchResult[];
}

export interface PloForSuggestion {
  plo_id: string;
  description: string;
}

export interface PloSuggestion {
  plo_id: string;
  confidence: number;
  reasoning: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";
const REQUEST_TIMEOUT_MS = 20_000;

export class AiMatchError extends Error {}

// Low-level call: sends one prompt, demands JSON-object output, returns it parsed but
// otherwise unvalidated — each caller below validates the shape it actually expects.
async function callOpenRouterJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiMatchError("ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY");
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://align-app-sage.vercel.app",
        "X-Title": "ALIGN",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
      // Callers (Server Actions) must never hang indefinitely if OpenRouter is slow/unreachable.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AiMatchError("เรียก OpenRouter API ไม่สำเร็จ (หมดเวลาเชื่อมต่อ)");
    }
    throw new AiMatchError("เรียก OpenRouter API ไม่สำเร็จ (network error)");
  }

  if (!response.ok) {
    throw new AiMatchError(`OpenRouter API ตอบกลับผิดพลาด: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new AiMatchError("รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง (ไม่มี content)");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new AiMatchError("AI ตอบกลับไม่ใช่ JSON ที่ถูกต้อง");
  }
}

// Step-2 (summarize) of the runAiMatch agent pipeline (.../teaching-records/actions.ts):
// step 1 (read multiple sources) happens there before calling this, step 3/4 (write back + log)
// happen there after.
export async function runCloMatchAgent({
  topic,
  weekNo,
  clos,
  syllabus,
  otherRecords,
}: {
  topic: string;
  weekNo: number;
  clos: CloForMatching[];
  syllabus: SyllabusWeek[];
  otherRecords: OtherTeachingRecord[];
}): Promise<CloMatchAgentOutput> {
  if (clos.length === 0) {
    return { summary: "วิชานี้ยังไม่มี CLO ให้จับคู่", results: [] };
  }

  const cloList = clos.map((c) => `- ${c.clo_id}: ${c.description}`).join("\n");
  const syllabusSection =
    syllabus.length > 0
      ? `\nแผนการสอนตาม course syllabus (สำหรับอ้างอิงเทียบเคียงเท่านั้น ไม่ใช่การวิเคราะห์ gap อย่างเป็นทางการ):\n${syllabus
          .map((w) => `- สัปดาห์ ${w.week_no}: ${w.topic}`)
          .join("\n")}\n`
      : "";
  const otherRecordsSection =
    otherRecords.length > 0
      ? `\nหัวข้อที่เคยบันทึกว่าสอนไปแล้วในวิชานี้ (สำหรับดูภาพรวม/ความซ้ำซ้อนเท่านั้น):\n${otherRecords
          .map((r) => `- สัปดาห์ ${r.week_no}: ${r.topic}`)
          .join("\n")}\n`
      : "";

  const prompt = `คุณเป็นผู้ช่วยประเมินความสอดคล้องระหว่างสิ่งที่อาจารย์สอนจริงกับผลลัพธ์การเรียนรู้ระดับรายวิชา (CLO) ของระบบ ALIGN

หัวข้อที่สอนจริง (สัปดาห์ที่ ${weekNo}): "${topic}"

รายการ CLO ของวิชานี้ (ห้ามเพิ่ม CLO ใหม่ที่ไม่อยู่ในรายการนี้):
${cloList}
${syllabusSection}${otherRecordsSection}
งานของคุณ:
1. เขียนสรุปภาพรวมสั้นๆ (2-4 ประโยค) ให้อาจารย์อ่านก่อนตัดสินใจ — พูดถึงว่าหัวข้อนี้เข้ากับ CLO ไหนบ้างโดยรวม และถ้ามีข้อสังเกตจาก syllabus/หัวข้อที่เคยสอนไปแล้ว (เช่น ซ้ำ หรือไม่มีใน syllabus) ให้พูดถึงด้วย
2. ประเมินค่าความตรง (match confidence, 0-100) ของหัวข้อที่สอนจริงกับ CLO แต่ละข้อ พร้อมคำแนะนำสั้นๆ (recommendation) และเหตุผลประกอบ 1-2 ประโยค (reasoning) ต่อ CLO แต่ละข้อ

ย้ำ: นี่เป็นแค่ข้อเสนอแนะเบื้องต้น อาจารย์ผู้สอนเป็นผู้ตัดสินใจยืนยัน/แก้ไข/ปฏิเสธเองทั้งหมด ไม่ใช่การตัดสินขั้นสุดท้าย

ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่นใดๆ ในรูปแบบ:
{"summary": "...", "results": [{"clo_id": "CLO1", "match_confidence": 82, "recommendation": "...", "reasoning": "..."}, ...]}`;

  const parsed = await callOpenRouterJson(prompt);

  const rawResults = (parsed as { results?: unknown })?.results;
  if (!Array.isArray(rawResults)) {
    throw new AiMatchError("รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง (ไม่มี results array)");
  }
  const rawSummary = (parsed as { summary?: unknown })?.summary;
  const summary = typeof rawSummary === "string" && rawSummary.trim() ? rawSummary.trim() : "AI ไม่ได้ให้สรุปภาพรวมมาในรอบนี้";

  const validCloIds = new Set(clos.map((c) => c.clo_id));
  const results: CloMatchResult[] = [];
  for (const item of rawResults) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { clo_id?: unknown }).clo_id !== "string" ||
      typeof (item as { match_confidence?: unknown }).match_confidence !== "number"
    ) {
      continue;
    }
    const cloId = (item as { clo_id: string }).clo_id;
    if (!validCloIds.has(cloId)) continue; // AI must not invent CLOs outside what was sent
    const confidence = (item as { match_confidence: number }).match_confidence;
    const recommendation = (item as { recommendation?: unknown }).recommendation;
    const reasoning = (item as { reasoning?: unknown }).reasoning;
    results.push({
      clo_id: cloId,
      match_confidence: Math.max(0, Math.min(100, Math.round(confidence))),
      recommendation: typeof recommendation === "string" && recommendation.trim() ? recommendation.trim() : "—",
      reasoning: typeof reasoning === "string" && reasoning.trim() ? reasoning.trim() : "AI ไม่ได้ให้เหตุผลมาในรอบนี้",
    });
  }

  if (results.length === 0) {
    throw new AiMatchError("AI ไม่ได้ส่งผลจับคู่ที่ใช้งานได้กลับมา");
  }

  return { summary, results };
}

// Used by the "จัดการรายวิชา" CLO management page (src/app/courses/[curriculumId]/[code]/) —
// suggests which of the curriculum's PLOs a given CLO description looks aligned with. This is
// advisory only: it never writes clo_plo_mapping itself — the instructor still has to click a
// PLO chip to actually bind it (that click is the human confirmation required by rule #3).
export async function suggestCloPloMatches({
  cloDescription,
  plos,
}: {
  cloDescription: string;
  plos: PloForSuggestion[];
}): Promise<PloSuggestion[]> {
  if (plos.length === 0) return [];

  const ploList = plos.map((p) => `- ${p.plo_id}: ${p.description}`).join("\n");
  const prompt = `คุณเป็นผู้ช่วยแนะนำการผูก CLO (ผลลัพธ์การเรียนรู้ระดับรายวิชา) เข้ากับ PLO (ผลลัพธ์การเรียนรู้ระดับหลักสูตร) ของระบบ ALIGN

CLO ที่ต้องการหา PLO ที่เหมาะสม: "${cloDescription}"

รายการ PLO ของหลักสูตรนี้ (ห้ามเพิ่ม PLO ใหม่ที่ไม่อยู่ในรายการนี้):
${ploList}

ให้แนะนำเฉพาะ PLO ที่เข้ากับ CLO นี้จริงๆ (ไม่จำเป็นต้องแนะนำทุกข้อ อาจมีข้อเดียวหรือหลายข้อก็ได้) พร้อมค่าความมั่นใจ (confidence, 0-100) และเหตุผลสั้นๆ ต่อข้อ

ย้ำ: นี่เป็นแค่ข้อเสนอแนะ อาจารย์ผู้สอนเป็นผู้ตัดสินใจกดผูกเองทั้งหมด ไม่ใช่การผูกอัตโนมัติ

ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่นใดๆ ในรูปแบบ:
{"suggestions": [{"plo_id": "PLO1", "confidence": 85, "reasoning": "..."}, ...]}`;

  const parsed = await callOpenRouterJson(prompt);

  const raw = (parsed as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(raw)) {
    throw new AiMatchError("รูปแบบผลลัพธ์จาก AI ไม่ถูกต้อง (ไม่มี suggestions array)");
  }

  const validPloIds = new Set(plos.map((p) => p.plo_id));
  const suggestions: PloSuggestion[] = [];
  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { plo_id?: unknown }).plo_id !== "string" ||
      typeof (item as { confidence?: unknown }).confidence !== "number"
    ) {
      continue;
    }
    const ploId = (item as { plo_id: string }).plo_id;
    if (!validPloIds.has(ploId)) continue; // AI must not invent PLOs outside what was sent
    const confidence = (item as { confidence: number }).confidence;
    const reasoning = (item as { reasoning?: unknown }).reasoning;
    suggestions.push({
      plo_id: ploId,
      confidence: Math.max(0, Math.min(100, Math.round(confidence))),
      reasoning: typeof reasoning === "string" && reasoning.trim() ? reasoning.trim() : "AI ไม่ได้ให้เหตุผลมาในรอบนี้",
    });
  }

  return suggestions;
}

export interface CourseCloStat {
  code: string;
  description: string;
  isMatched: boolean;
  matchFrequency: number;
}

export interface CourseOverview {
  summary: string;
  recommendations: string[];
}

// Used by the "จัดการรายวิชา" page's "ให้ AI สรุปภาพรวมวิชา" button — an in-app equivalent of
// AB-16's Word-export "Area of Improvement" (free-text, must reference only confirmed gaps, per
// rule #3/#4). Only ever fed CLO coverage stats already computed from `confirmed` ai_match_results
// (src/lib/course-coverage.ts) — never draft data.
export async function summarizeCourseOverview({
  courseName,
  coveragePercent,
  clos,
}: {
  courseName: string;
  coveragePercent: number | null;
  clos: CourseCloStat[];
}): Promise<CourseOverview> {
  const cloList = clos
    .map((c) => `- ${c.code}: ${c.description} — ${c.isMatched ? `มีหลักฐานแล้ว (${c.matchFrequency} ครั้ง)` : "ยังไม่มีหลักฐาน"}`)
    .join("\n");
  const coverageText = coveragePercent === null ? "ยังไม่มี CLO ในวิชานี้" : `${Math.round(coveragePercent)}%`;

  const prompt = `คุณเป็นผู้ช่วยสรุปภาพรวมความสอดคล้อง CLO/PLO ของรายวิชาหนึ่ง สำหรับระบบ ALIGN

วิชา: "${courseName}"
% ความสอดคล้องรวม (เฉพาะที่อาจารย์ยืนยันแล้ว): ${coverageText}

สถานะต่อ CLO แต่ละข้อ:
${cloList}

งานของคุณ:
1. เขียนสรุปภาพรวมสั้นๆ (2-4 ประโยค) ให้อาจารย์อ่าน
2. ให้ข้อเสนอแนะจุดที่ควรพัฒนา (Area of Improvement) เป็นรายการข้อความสั้นๆ — **อ้างอิงเฉพาะ CLO ที่ยังไม่มีหลักฐานหรือมีหลักฐานน้อยข้างต้นเท่านั้น ห้ามสร้างข้อเสนอแนะที่ไม่มีข้อมูลรองรับ**

ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่นใดๆ ในรูปแบบ:
{"summary": "...", "recommendations": ["...", "..."]}`;

  const parsed = await callOpenRouterJson(prompt);

  const rawSummary = (parsed as { summary?: unknown })?.summary;
  const summary = typeof rawSummary === "string" && rawSummary.trim() ? rawSummary.trim() : "AI ไม่ได้ให้สรุปภาพรวมมาในรอบนี้";

  const rawRecs = (parsed as { recommendations?: unknown })?.recommendations;
  const recommendations = Array.isArray(rawRecs) ? rawRecs.filter((r): r is string => typeof r === "string" && r.trim().length > 0) : [];

  return { summary, recommendations };
}

export interface ProgramCourseStatForAi {
  courseId: string;
  courseName: string;
  coveragePercent: number | null;
}

export interface ProgramPloStatForAi {
  code: string;
  description: string;
  percent: number | null;
}

// AB-14 program-level equivalent of summarizeCourseOverview — used by the program_admin
// dashboard's "ให้ AI สรุปภาพรวมหลักสูตร" button, intended as evidence for an annual AUN-QA
// report. There is no defined pass/fail threshold for "PLO achieved" anywhere in the ALIGN spec,
// so the prompt explicitly forbids a hard verdict — only proportions/observations, matching
// AB-16's own rule against fixed categories.
export async function summarizeProgramOverview({
  curriculumId,
  termLabel,
  overallCoveragePercent,
  courses,
  plos,
}: {
  curriculumId: string;
  termLabel: string;
  overallCoveragePercent: number | null;
  courses: ProgramCourseStatForAi[];
  plos: ProgramPloStatForAi[];
}): Promise<CourseOverview> {
  const courseList = courses
    .map((c) => `- ${c.courseId} ${c.courseName}: ${c.coveragePercent === null ? "ยังไม่มี CLO" : `${Math.round(c.coveragePercent)}%`}`)
    .join("\n");
  const ploList = plos
    .map((p) => `- ${p.code}: ${p.description} — ${p.percent === null ? "ไม่มี CLO ผูกไว้" : `${Math.round(p.percent)}% ของ CLO ที่ผูกไว้มีหลักฐานแล้ว`}`)
    .join("\n");
  const overallText = overallCoveragePercent === null ? "ยังไม่มีข้อมูล" : `${Math.round(overallCoveragePercent)}%`;

  const prompt = `คุณเป็นผู้ช่วยสรุปภาพรวมความสอดคล้อง CLO/PLO ระดับหลักสูตร สำหรับระบบ ALIGN — ใช้เป็นข้อมูลประกอบการทำรายงานประกันคุณภาพ (เช่น AUN-QA) ประจำปีของผู้บริหารหลักสูตร

หลักสูตร: ${curriculumId} (${termLabel})
% ความสอดคล้องรวมของหลักสูตร (เฉพาะที่ยืนยันแล้ว): ${overallText}

รายวิชาในหลักสูตรนี้:
${courseList || "(ไม่มีวิชา)"}

สัดส่วน PLO ที่มีหลักฐานรองรับ (จาก CLO ที่ผูกไว้และมีการยืนยันแล้ว):
${ploList || "(ไม่มี PLO)"}

งานของคุณ:
1. เขียนสรุปภาพรวมสั้นๆ (3-5 ประโยค) ระดับหลักสูตร ให้ผู้บริหารหลักสูตรอ่าน
2. ให้ข้อเสนอแนะจุดที่ควรพัฒนา (Area of Improvement) เป็นรายการข้อความสั้นๆ — อ้างอิงเฉพาะวิชา/PLO ที่มีสัดส่วนต่ำหรือไม่มีหลักฐานข้างต้นเท่านั้น ห้ามสร้างข้อเสนอแนะที่ไม่มีข้อมูลรองรับ

**ห้ามฟันธงว่า PLO ข้อใด "บรรลุ" หรือ "ไม่บรรลุ"** เพราะไม่มีเกณฑ์ตัดสินที่กำหนดไว้ — ให้พูดถึงเป็นสัดส่วน/ระดับความครอบคลุมเท่านั้น

ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่นใดๆ ในรูปแบบ:
{"summary": "...", "recommendations": ["...", "..."]}`;

  const parsed = await callOpenRouterJson(prompt);

  const rawSummary = (parsed as { summary?: unknown })?.summary;
  const summary = typeof rawSummary === "string" && rawSummary.trim() ? rawSummary.trim() : "AI ไม่ได้ให้สรุปภาพรวมมาในรอบนี้";

  const rawRecs = (parsed as { recommendations?: unknown })?.recommendations;
  const recommendations = Array.isArray(rawRecs) ? rawRecs.filter((r): r is string => typeof r === "string" && r.trim().length > 0) : [];

  return { summary, recommendations };
}

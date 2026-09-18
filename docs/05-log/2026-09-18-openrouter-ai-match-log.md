# 2026-09-18 — เปิดใช้ external LLM API (OpenRouter) สำหรับ AI CLO/PLO matching + สร้างหน้าบันทึกการสอนจริงครั้งแรก

## สรุป

สร้างฟีเจอร์ E3 (AI CLO/PLO matching, `POST /teaching-records/{id}/ai-match`) เป็นโค้ดจริงครั้งแรกใน `align-app/` — ก่อนหน้านี้มีแค่เอกสารออกแบบ/prototype ไม่มีโค้ด ประกอบด้วย:
- หน้า "บันทึกการสอน" (`/courses/{curriculumId}/{code}/teaching-records/new`) ตาม [[../02-design/01-prototypes/interactive-prototype/TeachingRecordEntry.dc.html|TeachingRecordEntry.dc.html]]
- หน้า "ตรวจสอบและยืนยันผล AI" (`.../teaching-records/{id}/review`) ตาม [[../02-design/01-prototypes/interactive-prototype/AIReviewPanel.dc.html|AIReviewPanel.dc.html]] — เฉพาะส่วนจับคู่ CLO/PLO เท่านั้น ยังไม่รวมส่วน syllabus gap analysis
- `runAiMatch`/`confirmMatchResult`/`updateMatchResult` ตาม field/state ที่ [[../02-design/02-technical/align-api-schema-design.md|align-api-schema-design.md]] §3.7/§3.9 กำหนดไว้ — `confirmMatchResult` เป็นจุดเดียวที่ทำให้ `ai_match_result.state` เป็น `'confirmed'` ตามกฎ #3

## การตัดสินใจ: เปิด external LLM API feature-flag (OpenRouter)

[[../02-design/02-technical/align-tech-stack.md|align-tech-stack.md]] §2.1/§2.4 ปิด external LLM API ไว้เป็น default (flag = off) โดยรอ "ยืนยันงบ Blaze plan" — เหตุผลเดิมที่เขียนไว้คือกลัวการเรียก API ภายนอกจาก **Firebase App Hosting** ต้องใช้ Blaze plan

ข้อเท็จจริงที่เปลี่ยนไปตั้งแต่ [[2026-09-11-deploy-to-vercel-log|05-log/2026-09-11-deploy-to-vercel-log]]: compute จริงของแอปย้ายไป **Vercel** แล้ว ไม่ใช่ Firebase App Hosting — ข้อจำกัดเรื่อง Blaze plan ผูกกับ Firebase billing เท่านั้น ไม่เกี่ยวกับการเรียก API ภายนอกจาก Vercel เลย และ OpenRouter คิดเงินแยกต่างหากจาก Firebase โดยสิ้นเชิง ดังนั้นเหตุผลเดิมที่ปิด flag ไว้ไม่ผูกมัดสถานการณ์ปัจจุบันอีกต่อไป — ผู้ใช้ยืนยันให้เปิดใช้งานจริงผ่าน OpenRouter (`google/gemini-2.5-flash-lite` เป็นโมเดล default, ตั้งค่าผ่าน `OPENROUTER_MODEL` ได้)

**ไม่ได้แก้เนื้อหาเดิมใน `align-tech-stack.md`** ตามกฎ "ห้ามลบเนื้อหาเดิม" — บันทึกเป็น log entry ใหม่นี้แทน ถ้าจะปรับสถานะ flag ในเอกสารนั้นให้ตรงกับความเป็นจริง ควรให้ `tech-stack-advisor` subagent อัปเดตอย่างเป็นทางการภายหลัง

ส่งเฉพาะ `topic` (หัวข้อการสอน) และคำอธิบาย CLO ไปยัง OpenRouter เท่านั้น — ไม่ส่งไฟล์หลักฐาน/ข้อมูลนักศึกษาใดๆ (ตรงตามที่ §2.4 วิเคราะห์ไว้ว่าปลอดภัยด้าน PDPA)

## Out of scope ของรอบนี้ (ตั้งใจไม่ทำ ไม่ใช่ลืม)

- CLO/PLO management UI — ยังไม่มี CRUD UI จริง ใช้ `scripts/seed-clo-plo.mjs` ใส่ข้อมูลให้วิชา 127121 (หลักสูตร 2565) เพื่อทดสอบเท่านั้น
- แนบไฟล์หลักฐาน (evidence upload) — Firebase Storage ยัง Blaze-deferred อยู่ ([[2026-09-06-firebase-storage-blaze-deferred-log|05-log/2026-09-06-firebase-storage-blaze-deferred-log]]) แยกปัญหาจากเรื่องนี้
- Syllabus gap analysis (`POST /courses/{id}/syllabus-gap-analysis`) — คนละ endpoint/entity ตาม AB-22
- Firestore Security Rules ใหม่ — ยังใช้ blanket rule เดียวตามที่ CLAUDE.md ระบุไว้ว่าเป็นความตั้งใจ (บังคับกฎที่ Server Action layer ทั้งหมด)

## อัปเดต (ภายในวันเดียวกัน) — ยกระดับเป็น "ผู้ช่วย AI แบบ agentic"

หลังทดสอบเวอร์ชันแรกแล้ว ผู้ใช้ขอให้ `runAiMatch` ทำงานเป็นขั้นตอนชัดเจนแบบ agent: **อ่านหลายที่ → สรุปให้คนอ่าน → เขียนผลกลับ → จดบันทึก** โดยยังคงกฎ #3 (AI ไม่ตัดสินแทน คนกดยืนยันเสมอ) เป๊ะเหมือนเดิม — เปลี่ยนแปลง:

- **อ่านหลายที่ (เพิ่มจากเดิม)**: นอกจาก CLO ของวิชาแล้ว ตอนนี้อ่าน `syllabus/main.content` (แผนการสอนรายสัปดาห์) และ `teaching_records` อื่นของวิชาเดียวกันด้วย ส่งเป็น context เสริมให้ AI เห็นภาพรวม/ความซ้ำซ้อน — **ไม่ใช่การสร้าง `syllabus_gap_result` อย่างเป็นทางการ** (คนละ endpoint ตาม AB-22 ยังไม่ทำ) แค่ใช้เป็นข้อมูลประกอบการให้เหตุผลเท่านั้น
- **สรุปให้คนอ่าน**: เพิ่ม field `recommendation`/`reasoning` ต่อ CLO ใน `ai_match_results` (field ปฏิบัติจริงเพิ่มเติม นอกเหนือจากที่ align-api-schema-design.md §3.9 ระบุ) + สรุปภาพรวม 1 ก้อนต่อการรัน
- **จดบันทึก**: เพิ่ม subcollection ใหม่ `teaching_records/{id}/agent_logs/{log_id}` เก็บทุกครั้งที่รัน agent (สำเร็จหรือ error) — `model`, `sources` ที่อ่าน, `summary`, `status`, `error_message` — ทำให้ `runAiMatch` ไม่ throw ออกไปอีกต่อไป (จับ error ภายในแล้ว log เป็น `status:'error'` แทน)
- **เขียนผลกลับ**: ไม่เปลี่ยนพฤติกรรมเดิม ยังเป็น `state:'draft'` เสมอ ยืนยันได้ที่ `confirmMatchResult` จุดเดียวเท่านั้น

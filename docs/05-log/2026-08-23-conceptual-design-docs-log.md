# 2026-08-23 (ย้อนหลัง): เพิ่ม 3 เอกสาร Conceptual Design และ 3 Subagent ใหม่

> **หมายเหตุ**: บันทึกนี้เขียนย้อนหลังระหว่างการรัน `audit-align-docs` (ดู [[2026-08-23-audit-log|2026-08-23: รัน audit ทั้งระบบและแก้ finding]]) ซึ่งพบว่างานนี้ (commit `263215e`) ไม่มี log entry ของตัวเองตั้งแต่แรก

## บริบท

ก่อนหน้านี้โฟลเดอร์ `docs/02-design/02-technical/` มีเพียง `align-technical-design.md` ซึ่งผสมทั้งชั้น conceptual (ภาพรวมระบบ) และชั้น implementation-ready (schema/API ละเอียด) ไว้ในไฟล์เดียว ทำให้ผู้อ่านที่ไม่ใช่สายเทคนิค (เช่น ผู้บริหารหลักสูตร) เข้าถึงภาพรวมได้ยาก จึงแยกชั้น conceptual ออกเป็นเอกสารเฉพาะทาง 3 ฉบับ ที่ตั้งใจไม่ผูกกับ technical stack ใดๆ เพื่อให้เป็นฐานที่มาก่อน `align-technical-design.md`

## สิ่งที่เพิ่ม

- **Subagent + Skill ใหม่ 3 ชุด**: `architecture-designer` (`backlog-to-architecture`), `api-schema-designer` (`backlog-to-api-schema`), `detailed-designer` (`backlog-to-detailed-design`) — ทุกตัวยึดกฎเดียวกัน: ห้ามระบุชื่อ technical stack ใดๆ, ทุกจุดไม่ชัดเจนต้องถาม `AskUserQuestion` พร้อม ≥3 ตัวเลือก+ข้อดีข้อเสียเสมอ
- **[[../02-design/02-technical/align-high-level-architecture|align-high-level-architecture]]** — System Context (2 roles, ขอบเขตนอกระบบ), Logical Components, Data Flow ตาม user journey หลัก (บันทึกการสอน→AI→ยืนยัน, สมัคร→อนุมัติบัญชี, ออกเอกสาร Word)
- **[[../02-design/02-technical/align-api-schema-design|align-api-schema-design]]** — ER Diagram (Mermaid), รายละเอียดฟิลด์ต่อ entity พร้อม PDPA flag, API Spec แบบละเอียดตาม Epic — ต่อยอดจาก `align-technical-design.md §2/§3` โดยไม่ผูกกับ stack
- **[[../02-design/02-technical/align-detailed-design|align-detailed-design]]** — Sequence Diagram + State Machine (Mermaid) ของ scenario หลักทั้งหมด พร้อมจุดบังคับใช้กฎทางธุรกิจต่อ step

## ความสัมพันธ์ที่ยืนยันแล้ว

เอกสาร conceptual ทั้ง 3 ฉบับเป็น**ฐานที่มาก่อน** `align-technical-design.md` (ชั้น implementation-ready) — บันทึกไว้ใน `CLAUDE.md` หัวข้อ "ความสัมพันธ์ระหว่าง 6 เอกสารใน `02-design/02-technical/`" แล้ว (ตอนนั้นยังเป็น 4 เอกสาร ก่อนเพิ่ม `align-tech-stack.md`/`align-nfr.md` ทีหลัง)

## เอกสารที่แก้ไข/เพิ่มเติม (commit `263215e`)

- สร้างใหม่: `.claude/agents/{architecture-designer,api-schema-designer,detailed-designer}.md`, `.claude/skills/{backlog-to-architecture,backlog-to-api-schema,backlog-to-detailed-design}/SKILL.md`, `docs/02-design/02-technical/{align-high-level-architecture,align-api-schema-design,align-detailed-design}.md`
- อัปเดต: `CLAUDE.md` (ตาราง Sub Agents เพิ่ม 3 แถว + หัวข้อความสัมพันธ์ระหว่างเอกสาร), `docs/02-design/02-technical/index.md`

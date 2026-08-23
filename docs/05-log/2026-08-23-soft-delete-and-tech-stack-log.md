# 2026-08-23 (ย้อนหลัง): ปิด CLO Soft-Delete ครบ 5/5 Entity และเพิ่ม Tech Stack Advisor

> **หมายเหตุ**: บันทึกนี้เขียนย้อนหลังระหว่างการรัน `audit-align-docs` (ดู [[2026-08-23-audit-log|2026-08-23: รัน audit ทั้งระบบและแก้ finding]]) ซึ่งพบว่างานนี้ (commit `b374973`, merge เป็น PR #1 ที่ `ce414db`) ไม่มี log entry ของตัวเองตั้งแต่แรก มีเพียงประโยคผ่านๆ ใน [[2026-08-23-log|2026-08-23: วิเคราะห์ NFR]] ตอนกล่าวถึงการ fast-forward branch

## ปิด CLO Soft-Delete ครบ 5/5 Entity

ขยายกลไก soft-delete ของ CLO (ตัดสินใจไว้ก่อนหน้านี้ว่าต้องใช้ soft-delete ไม่ใช่ hard-delete เพื่อรักษาประวัติหลักฐาน) ให้ครบทุก entity ที่เกี่ยวข้อง — เพิ่ม task/test case ที่ขาด และปุ่มลบใน prototype พร้อมแก้ 2 จุดที่ audit รอบก่อนเจอว่ายังไม่ sync กัน:

1. open-question note เก่าใน test plan ที่ค้างอยู่ทั้งที่ปิดคำถามไปแล้ว
2. กลไก soft-delete ยังไม่ถูก backport เข้า `align-technical-design.md` (ชั้น implementation-ready) ทั้งที่ตัดสินใจไว้ในชั้น conceptual แล้ว

## เพิ่ม Tech Stack Advisor

- **Subagent + Skill ใหม่**: `tech-stack-advisor` (`choose-tech-stack`) — สัมภาษณ์ผู้ใช้แบบเข้มข้น (ทีม, งบ/โครงสร้างพื้นฐาน, timeline, data residency/PDPA, แนวทาง AI, hosting, auth) ก่อนแนะนำ stack จริง คนละชั้นกับ 3 เอกสาร conceptual (`align-high-level-architecture`/`align-api-schema-design`/`align-detailed-design`) ที่ตั้งใจไม่ผูก stack
- สร้าง **[[../02-design/02-technical/align-tech-stack|align-tech-stack]]** จากผลสัมภาษณ์จริง — ระบุจุดที่ยังไม่ยืนยัน (งบ/data residency/SSO/ที่เก็บไฟล์/deployment) พร้อมทางย้าย (migration path)
- ย้ายข้อเสนอ stack คร่าวๆ เดิมใน `align-technical-design.md §5` ไปเก็บถาวรที่ [[../00-archived/align-technical-design-section5-tech-stack-draft|align-technical-design-section5-tech-stack-draft]] แล้วปรับ §5 ให้ชี้มาที่ `align-tech-stack.md` แทน (เพราะเป็นข้อเสนอที่เขียนก่อนสัมภาษณ์ทีมพัฒนาจริง)

## เอกสารที่แก้ไข/เพิ่มเติม (commit `b374973`)

- สร้างใหม่: `.claude/agents/tech-stack-advisor.md`, `.claude/skills/choose-tech-stack/SKILL.md`, `docs/02-design/02-technical/align-tech-stack.md`, `docs/00-archived/align-technical-design-section5-tech-stack-draft.md`
- อัปเดต: `CLAUDE.md`, `docs/00-archived/index.md`, `docs/01-requirements/03-task/task-breakdown.md`, `docs/02-design/01-prototypes/{align-app-screens,align-interactive-prototype}.md`, `docs/02-design/02-technical/{align-technical-design,index}.md`, `docs/03-testing/01-test-plan/{e1-clo-plo-syllabus-setup,index,test-plan-align}.md`

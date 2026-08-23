---
name: backlog-to-detailed-design
description: Create or update ALIGN's conceptual detailed design document (sequence flow between actors/components per scenario, plus state machines and business-rule enforcement points — deliberately not tied to any technical stack) under docs/02-design/02-technical/, by delegating the design work to the detailed-designer subagent. Use when asked to "สร้าง/อัปเดต detailed design", "ขอ sequence diagram", "ขอ state machine ของบัญชี/ผล AI", or when requirement/backlog/prototype/architecture changes need to be reflected in the detailed design.
---

# Backlog to Detailed Design

แปลง Requirement + Product Backlog + Prototype (+ High-Level Architecture / API-Schema ถ้ามี) ของโปรเจกต์ ALIGN ให้เป็น/อัปเดตเอกสาร **Detailed Design แบบ conceptual** (sequence flow, state machine — ยังไม่ผูกมัดกับ technical stack) โดยมอบหมายงานให้ subagent `detailed-designer` ทำในบริบทที่แยกออกไป

เอกสารที่ได้ (`docs/02-design/02-technical/align-detailed-design.md`) เป็นชั้นที่ละเอียดกว่า `align-high-level-architecture.md` (ภาพรวม component/data flow) และ `align-api-schema-design.md` (entity/endpoint) — ลงรายละเอียดว่าทีละขั้นตอนเกิดอะไรขึ้นบ้าง ใครเรียกใคร มี error/edge case อะไรบ้าง เพื่อให้ทีมพัฒนาและผู้ตรวจสอบเห็นภาพ behavior ที่ถูกต้องก่อนลงมือ implement จริง

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/01-spec/requirement-align.md` และ `docs/01-requirements/02-plan/product-backlog.md` อยู่หรือไม่ — ถ้ายังไม่มี ให้แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เช็คว่ามี `docs/02-design/02-technical/align-high-level-architecture.md` และ `docs/02-design/02-technical/align-api-schema-design.md` อยู่แล้วหรือไม่ (เป็นฐานให้ sequence diagram ใช้ชื่อ component/entity ตรงกัน) — ถ้ายังไม่มี แจ้งผู้ใช้ว่า `detailed-designer` จะใช้ชื่อ component/entity แบบสมมติชั่วคราวไปก่อน และแนะนำให้รัน `backlog-to-architecture` และ/หรือ `backlog-to-api-schema` ก่อนหรือหลังก็ได้ตามที่ผู้ใช้สะดวก (ไม่บังคับลำดับ)
3. เรียก Agent tool ด้วย `subagent_type: detailed-designer` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (สร้างใหม่ครั้งแรก, อัปเดตเพราะ backlog/prototype/architecture เปลี่ยน, หรือขอเจาะจง scenario ใดเป็นพิเศษ)
   - ขอบเขตที่ต้องการ (ทุก scenario หลัก หรือเจาะจงบางส่วน)
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น (เช่น การตัดสินใจที่ผู้ใช้ยืนยันสดๆ ในแชทที่ยังไม่ถูกบันทึกลงเอกสาร)
4. ถ้า `detailed-designer` ถามคำถามกลับผ่าน `AskUserQuestion` — agent จะเสนอมาพร้อมอย่างน้อย 3 แนวทางเลือกและข้อดี-ข้อเสียเสมอ (เป็นกฎบังคับของ agent นี้) ให้แสดงตัวเลือกทั้งหมดให้ผู้ใช้ครบถ้วน **ห้ามเลือกแทนผู้ใช้เอง** รอคำตอบแล้วส่งกลับไปให้ agent ทำงานต่อ
5. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/02-design/02-technical/` (โดยเฉพาะว่ามี sequence diagram ครอบคลุม scenario หลักจริง) และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้
6. ถ้า agent รายงานว่าอ้างอิงชื่อ component/entity แบบสมมติชั่วคราวเพราะเอกสารต้นทางยังไม่ครบ ให้แจ้งผู้ใช้และเสนอเรียก skill `backlog-to-architecture` และ/หรือ `backlog-to-api-schema` ตามความเหมาะสมเพื่อ sync ชื่อกันภายหลัง

## กฎ

- อย่าเขียน/แก้เอกสาร detailed design เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `detailed-designer` เสมอ เพื่อให้บังคับกฎ "ห้ามผูกกับ tech stack" และ "ต้องถามพร้อม 3 แนวทางเลือกเมื่อไม่ชัดเจน" ได้แน่นอน
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหาเดิมโดยไม่ถามก่อน — ปล่อยให้ `detailed-designer` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

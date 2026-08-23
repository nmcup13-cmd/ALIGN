---
name: backlog-to-api-schema
description: Create or update ALIGN's conceptual API spec + database schema document (per-table detail, ER diagram, resource-oriented API endpoints — deliberately not tied to any technical stack) under docs/02-design/02-technical/, by delegating the design work to the api-schema-designer subagent. Use when asked to "สร้าง/อัปเดต API spec", "ขอ database schema แบบ conceptual", "ขอ ER Diagram", or when requirement/backlog/prototype changes need to be reflected in the data/API design.
---

# Backlog to API Schema

แปลง Requirement + Product Backlog + Prototype ของโปรเจกต์ ALIGN ให้เป็น/อัปเดตเอกสาร **API Spec + Database Schema แบบ conceptual** (ยังไม่ผูกมัดกับ technical stack, มี ER Diagram) โดยมอบหมายงานให้ subagent `api-schema-designer` ทำในบริบทที่แยกออกไป

เอกสารที่ได้ (`docs/02-design/02-technical/align-api-schema-design.md`) เป็นคนละชั้นกับ `align-technical-design.md` เดิม (ซึ่งมี schema/API แบบย่อ + ข้อเสนอ tech stack แบบ concrete ที่ §5) — เอกสารนี้ลงรายละเอียด entity/endpoint ให้ครบและมี ER Diagram โดยไม่ผูกกับ stack ใดๆ เพื่อให้ทุกฝ่าย (ไม่ใช่แค่ทีมพัฒนา) อ่านและตรวจสอบความถูกต้องของโมเดลข้อมูล/API ได้ก่อนที่จะลงมือเลือก stack จริง

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/01-spec/requirement-align.md` และ `docs/01-requirements/02-plan/product-backlog.md` อยู่หรือไม่ — ถ้ายังไม่มี ให้แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เช็คว่ามี `docs/02-design/02-technical/align-technical-design.md` (§2 Database Schema, §3 API Design) อยู่แล้วหรือไม่ — ถ้ามี agent จะใช้เป็นฐานอ้างอิงไม่ให้ขัดแย้งกัน ถ้ายังไม่มีให้แจ้งผู้ใช้ว่า agent จะออกแบบจาก backlog/prototype โดยตรง (ไม่มีฐานเดิมให้เทียบ อาจต้องถามผู้ใช้มากขึ้น)
3. เรียก Agent tool ด้วย `subagent_type: api-schema-designer` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (สร้างใหม่ครั้งแรก, อัปเดตเพราะ backlog/prototype เปลี่ยน, หรือขอเจาะจง entity/endpoint ใดเป็นพิเศษ)
   - ขอบเขตที่ต้องการ (ทุก Epic หรือเจาะจงบางส่วน)
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น (เช่น การตัดสินใจที่ผู้ใช้ยืนยันสดๆ ในแชทที่ยังไม่ถูกบันทึกลงเอกสาร)
4. ถ้า `api-schema-designer` ถามคำถามกลับผ่าน `AskUserQuestion` — agent จะเสนอมาพร้อมอย่างน้อย 3 แนวทางเลือกและข้อดี-ข้อเสียเสมอ (เป็นกฎบังคับของ agent นี้) ให้แสดงตัวเลือกทั้งหมดให้ผู้ใช้ครบถ้วน **ห้ามเลือกแทนผู้ใช้เอง** รอคำตอบแล้วส่งกลับไปให้ agent ทำงานต่อ
5. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/02-design/02-technical/` (โดยเฉพาะว่า ER Diagram ครอบคลุมทุก entity จริง) และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้
6. ถ้า agent รายงานว่ามีเนื้อหาใน `align-technical-design.md` ที่ควรปรับ/ย้ายมาไว้ที่เอกสารใหม่ (เพื่อไม่ให้ข้อมูลซ้ำซ้อนแล้วตกรุ่นภายหลัง) ให้แจ้งผู้ใช้และเสนอเรียก skill `backlog-to-technical-design` ต่อเพื่อ sync กัน — อย่าแก้ `align-technical-design.md` เองในบทสนทนาหลัก

## กฎ

- อย่าเขียน/แก้เอกสาร schema หรือ API เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `api-schema-designer` เสมอ เพื่อให้บังคับกฎ "ห้ามผูกกับ tech stack" และ "ต้องถามพร้อม 3 แนวทางเลือกเมื่อไม่ชัดเจน" ได้แน่นอน
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหาเดิมโดยไม่ถามก่อน — ปล่อยให้ `api-schema-designer` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

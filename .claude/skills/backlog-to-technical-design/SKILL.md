---
name: backlog-to-technical-design
description: Analyze the Product Backlog and prototype documents and produce/update the technical design (database schema/entity, API design, business-rule enforcement mechanisms) under docs/02-design/02-technical/ for the ALIGN project, by delegating the design work to the technical-designer subagent. Use when asked to "อัปเดต technical design", "ออกแบบ schema/API ให้ตรงกับ backlog ล่าสุด", or when a requirement clarification changes a schema/API assumption already documented.
---

# Backlog to Technical Design

แปลง Product Backlog + ต้นแบบ (prototype) ของโปรเจกต์ ALIGN ให้เป็น/อัปเดตเอกสารออกแบบทางเทคนิค (schema, API, กลไกบังคับใช้กฎทางธุรกิจ) โดยมอบหมายงานให้ subagent `technical-designer` ทำในบริบทที่แยกออกไป

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/02-plan/product-backlog.md` อยู่หรือไม่ — ถ้ายังไม่มี backlog ให้แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เรียก Agent tool ด้วย `subagent_type: technical-designer` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (สร้าง technical design ใหม่, อัปเดตเพราะ backlog/prototype เปลี่ยน, หรือแก้เพราะมีการยืนยันคำถามเปิดที่กระทบ schema/API — ระบุให้ชัดว่ากรณีไหน และคำตอบ/การเปลี่ยนแปลงที่ยืนยันแล้วคืออะไร)
   - ขอบเขตที่ต้องการ (ทุก Epic หรือเจาะจง entity/endpoint บางส่วน)
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น (เช่น คำตอบที่ผู้ใช้ยืนยันสดๆในแชท)
3. ถ้า `technical-designer` ถามคำถามกลับผ่าน `AskUserQuestion` (เช่น กรณีสเปคยังกำกวมเกินกว่าจะออกแบบ schema ได้) ให้รอคำตอบผู้ใช้ก่อน แล้วส่งกลับไปให้ agent ทำงานต่อ
4. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/02-design/02-technical/` และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้
5. ถ้า agent รายงานว่าการเปลี่ยนแปลงกระทบ test plan หรือ prototype เดิม ให้ต่อด้วยการเรียก skill `backlog-to-test-plan` และ/หรือ `requirement-to-prototype` ตามความเหมาะสม เพื่อให้เอกสารทุก stage sync กัน

## กฎ

- อย่าเขียน/แก้ schema หรือ API เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `technical-designer` เสมอ
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหา technical design เดิมโดยไม่ถามก่อน — ปล่อยให้ `technical-designer` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

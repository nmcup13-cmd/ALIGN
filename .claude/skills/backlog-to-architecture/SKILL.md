---
name: backlog-to-architecture
description: Create or update ALIGN's conceptual high-level architecture document (system context, logical components, data flow per user journey — deliberately not tied to any technical stack) under docs/02-design/02-technical/, by delegating the design work to the architecture-designer subagent. Use when asked to "สร้าง/อัปเดต high level architecture", "ขอภาพรวมสถาปัตยกรรมแบบ conceptual", "ไล่ data flow ตาม user journey", or when requirement/backlog/prototype changes need to be reflected in the high-level architecture.
---

# Backlog to Architecture

แปลง Requirement + Product Backlog + User Journey/Navigation Flow ของโปรเจกต์ ALIGN ให้เป็น/อัปเดตเอกสาร **High-Level Architecture แบบ conceptual** (ยังไม่ผูกมัดกับ technical stack) โดยมอบหมายงานให้ subagent `architecture-designer` ทำในบริบทที่แยกออกไป

เอกสารที่ได้ (`docs/02-design/02-technical/align-high-level-architecture.md`) เป็นคนละชั้นกับ `align-technical-design.md` เดิม (ซึ่งลง schema/API/tech-stack แบบ concrete) — เอกสารนี้ตอบคำถาม "ระบบมีส่วนไหนบ้าง ข้อมูลไหลยังไงตาม user journey จริง" เพื่อเป็นฐานให้ทีมพัฒนาเข้าใจภาพรวมก่อนลงรายละเอียดทางเทคนิค

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/01-spec/requirement-align.md` และ `docs/01-requirements/02-plan/product-backlog.md` อยู่หรือไม่ — ถ้ายังไม่มี ให้แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เช็คว่ามี `docs/02-design/01-prototypes/align-user-journey.md` และ `align-navigation-flow.md` หรือไม่ (เป็นแหล่งหลักของ data flow) — ถ้ายังไม่มี ให้แจ้งผู้ใช้ว่าควรรัน `requirement-to-prototype` ให้มี user journey ก่อน หรือถามผู้ใช้ว่าต้องการให้ agent ทำงานต่อโดยไม่มีฐาน journey (ซึ่งจะต้องถามผู้ใช้เพิ่มมากขึ้น) หรือไม่
3. เรียก Agent tool ด้วย `subagent_type: architecture-designer` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (สร้างใหม่ครั้งแรก, อัปเดตเพราะ backlog/journey เปลี่ยน, หรือขอเจาะจง flow ใด flow หนึ่ง)
   - ขอบเขตที่ต้องการ (ภาพรวมทั้งระบบ หรือเจาะจง journey/Epic บางส่วน)
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น (เช่น การตัดสินใจที่ผู้ใช้ยืนยันสดๆ ในแชทที่ยังไม่ถูกบันทึกลงเอกสาร)
4. ถ้า `architecture-designer` ถามคำถามกลับผ่าน `AskUserQuestion` — agent จะเสนอมาพร้อมอย่างน้อย 3 แนวทางเลือกและข้อดี-ข้อเสียเสมอ (เป็นกฎบังคับของ agent นี้) ให้แสดงตัวเลือกทั้งหมดให้ผู้ใช้ครบถ้วน **ห้ามเลือกแทนผู้ใช้เอง** รอคำตอบแล้วส่งกลับไปให้ agent ทำงานต่อ
5. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/02-design/02-technical/` และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้
6. ถ้า agent รายงานว่าพบเนื้อหาใน `align-technical-design.md` ที่ขัดแย้งกับสถาปัตยกรรมใหม่ (ไม่ใช่แค่ระดับรายละเอียดต่างกัน) ให้แจ้งผู้ใช้และเสนอเรียก skill `backlog-to-technical-design` ต่อเพื่อ sync กัน — อย่าแก้ `align-technical-design.md` เองในบทสนทนาหลัก

## กฎ

- อย่าเขียน/แก้เอกสารสถาปัตยกรรมเองในบทสนทนาหลัก — งานนี้ต้องผ่าน `architecture-designer` เสมอ เพื่อให้บังคับกฎ "ห้ามผูกกับ tech stack" และ "ต้องถามพร้อม 3 แนวทางเลือกเมื่อไม่ชัดเจน" ได้แน่นอน
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหาเดิมโดยไม่ถามก่อน — ปล่อยให้ `architecture-designer` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

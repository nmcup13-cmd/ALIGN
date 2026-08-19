---
name: backlog-to-test-plan
description: Refine ALIGN's Acceptance Criteria into testable Given/When/Then Test Cases and assemble a Test Plan under docs/03-testing/01-test-plan/, by delegating the work to the test-designer subagent. Use when asked to "สร้าง test plan", "เขียน test case", "แตก Acceptance Criteria เป็นการทดสอบ", or to update the test plan after product-backlog.md changes.
---

# Backlog to Test Plan

แปล Acceptance Criteria ของ ALIGN ให้เป็น Test Case ที่ทดสอบได้จริง และประกอบเป็น Test Plan โดยมอบหมายงานให้ subagent `test-designer` ทำในบริบทที่แยกออกไป

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/02-plan/product-backlog.md` อยู่หรือไม่ — ถ้ายังไม่มี backlog ให้แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เรียก Agent tool ด้วย `subagent_type: test-designer` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (สร้าง test plan ใหม่ทั้งหมด, เพิ่ม test case สำหรับ story ใหม่, หรืออัปเดตเพราะ backlog เปลี่ยน — ระบุให้ชัดว่ากรณีไหน)
   - ขอบเขตที่ต้องการ (ทุก Epic หรือเจาะจงบางส่วน)
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น
3. ถ้า `test-designer` ถามคำถามกลับผ่าน `AskUserQuestion` (เช่น กรณี AC ที่ยังกำกวมและต้องยืนยันก่อนเขียน test case) ให้รอคำตอบผู้ใช้ก่อน แล้วส่งกลับไปให้ agent ทำงานต่อ
4. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/03-testing/01-test-plan/` และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้ว่ามี test case ครอบคลุมอะไรบ้าง และมีคำถามเปิดอะไรที่ยังต้องยืนยัน

## กฎ

- อย่าเขียน test case/test plan เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `test-designer` เสมอ
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหา test plan เดิมโดยไม่ถามก่อน — ปล่อยให้ `test-designer` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

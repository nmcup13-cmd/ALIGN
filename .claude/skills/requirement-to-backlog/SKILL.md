---
name: requirement-to-backlog
description: Analyze the requirement documents under docs/01-requirements/01-spec/ and produce a prioritized Product Backlog (Epics, User Stories, Acceptance Criteria) under docs/01-requirements/02-plan/ for the ALIGN project, by delegating the analysis to the backlog-analyst subagent. Use when asked to "สร้าง Product Backlog", "แตก Requirement เป็น Backlog", or to update the backlog after the requirement doc changes.
---

# Requirement to Backlog

แปลงเอกสาร Requirement ของโปรเจกต์ ALIGN ให้เป็น Product Backlog ที่จัดลำดับความสำคัญแล้ว โดยมอบหมายงานวิเคราะห์ให้ subagent `backlog-analyst` ทำในบริบทที่แยกออกไป (context แยก, ไม่ปนกับบทสนทนาหลัก)

## ขั้นตอน

1. ตรวจสอบเบื้องต้นว่ามีไฟล์ requirement อยู่ใน `docs/01-requirements/01-spec/` หรือไม่ — ถ้ายังไม่มีไฟล์เลย ให้แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เรียก Agent tool ด้วย `subagent_type: backlog-analyst` พร้อม prompt ที่สรุป:
   - ไฟล์ requirement ที่เกี่ยวข้อง (path ที่พบจากขั้นตอนที่ 1)
   - เหตุผลของงานนี้ (สร้าง backlog ใหม่ หรืออัปเดต backlog เดิมเพราะ requirement เปลี่ยน — ระบุว่าเปลี่ยนอะไร ถ้าทราบ)
   - บริบทอื่นที่ผู้ใช้ให้มาในบทสนทนา ซึ่ง agent ที่ context แยกจะไม่เห็น
3. ถ้า `backlog-analyst` ถามคำถามกลับผ่าน `AskUserQuestion` ให้รอคำตอบจากผู้ใช้ก่อน แล้วส่งคำตอบกลับไปให้ agent ทำงานต่อ
4. เมื่อ agent เขียนไฟล์เสร็จ ให้ตรวจสอบผลลัพธ์ (`docs/01-requirements/02-plan/product-backlog.md` และลิงก์ใน index.md ที่เกี่ยวข้อง) ก่อนสรุปให้ผู้ใช้ว่ามี Epic/Story อะไรบ้าง และมีอะไรที่ยังต้องยืนยันเพิ่ม

## กฎ

- อย่าทำการวิเคราะห์/เขียน backlog เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `backlog-analyst` เสมอ เพื่อให้ context ของบทสนทนาหลักไม่ถูกใช้ไปกับรายละเอียดเอกสาร
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบ backlog item เดิมโดยไม่ถามก่อน — ปล่อยให้ `backlog-analyst` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

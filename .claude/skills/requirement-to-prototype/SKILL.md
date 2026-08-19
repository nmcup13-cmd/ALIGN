---
name: requirement-to-prototype
description: Design or update ALIGN's UI/UX prototype documentation (screens, navigation flow, user journey maps) under docs/02-design/01-prototypes/, following DESIGN.md's design tokens and UX rules, by delegating the work to the prototype-designer subagent. Use when asked to "ออกแบบ prototype", "สร้าง user journey", "อัปเดตหน้าจอ" ให้ตรงกับ requirement/backlog ล่าสุด, or after DESIGN.md/product-backlog.md changes.
---

# Requirement to Prototype

แปลง requirement/backlog ของ ALIGN ให้เป็นเอกสารต้นแบบ (screens, user flow, user journey) โดยมอบหมายงานออกแบบให้ subagent `prototype-designer` ทำในบริบทที่แยกออกไป

## ขั้นตอน

1. ตรวจสอบว่ามี `DESIGN.md` และ `docs/01-requirements/02-plan/product-backlog.md` อยู่หรือไม่ — ถ้ายังไม่มีไฟล์ใดไฟล์หนึ่ง ให้แจ้งผู้ใช้ก่อน (ไม่มี DESIGN.md แปลว่ายังไม่มี design tokens ให้ยึด, ไม่มี backlog แปลว่ายังไม่รู้ว่าต้องออกแบบหน้าจออะไร) ไม่ต้องเรียก agent
2. เรียก Agent tool ด้วย `subagent_type: prototype-designer` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (ออกแบบใหม่ทั้งหมด, เพิ่มหน้าจอสำหรับ story ใหม่ที่เพิ่งเข้ามา, หรืออัปเดตเพราะ DESIGN.md เปลี่ยน — ระบุให้ชัดว่ากรณีไหน)
   - ขอบเขตที่ต้องการ (ทุกบทบาท/ทุก Epic หรือเจาะจงบางส่วน เช่น "เฉพาะ AB-19 ถึง AB-23")
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น
3. ถ้า `prototype-designer` ถามคำถามกลับผ่าน `AskUserQuestion` (เช่น เรื่องมติโลโก้/ไอคอนที่ยังไม่ปิดใน `DESIGN.md`) ให้รอคำตอบผู้ใช้ก่อน แล้วส่งกลับไปให้ agent ทำงานต่อ
4. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/02-design/01-prototypes/` และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้ว่ามีหน้าจอ/journey อะไรบ้าง และมีอะไรที่ยังต้องยืนยันเพิ่ม

## กฎ

- อย่าออกแบบ/เขียน prototype เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `prototype-designer` เสมอ
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหา prototype เดิมโดยไม่ถามก่อน — ปล่อยให้ `prototype-designer` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

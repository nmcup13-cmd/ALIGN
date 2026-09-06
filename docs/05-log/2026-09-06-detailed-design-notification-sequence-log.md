# 2026-09-06: ปิด audit finding — เพิ่ม sequence diagram ของ `notification` เข้า align-detailed-design.md

## บริบท

การ audit แบบ read-only พบว่า [[../02-design/02-technical/align-detailed-design|align-detailed-design.md]] (ชั้น sequence diagram/state machine เชิงแนวคิด) **ไม่มีการกล่าวถึง entity `notification` เลยแม้แต่จุดเดียวทั้งไฟล์** ทั้งที่เป็นกลไกที่ทำให้กฎทางธุรกิจ #2 ("แจ้งเตือน CLO ที่ยังไม่มีหลักฐาน") เป็นจริง และมี entity/task ผูกอยู่แล้วครบทั้งใน [[../02-design/02-technical/align-technical-design|align-technical-design.md]] §2.14 และ [[../../01-requirements/03-task/task-breakdown|task-breakdown]] T-042–T-045

audit ยังพบข้อขัดแย้งที่เกี่ยวข้อง (ปิดไปแล้วก่อนหน้านี้ใน [[2026-09-06-high-level-architecture-notification-writer-fix-log|log เดียวกันฝั่ง align-high-level-architecture.md]]): เอกสารเดิมระบุว่า `GapNotify` เป็น component **อ่านอย่างเดียว ไม่มีสิทธิ์เขียน** แต่ไม่เคยระบุว่าใครเป็นผู้**เขียน** `notification` จริง — คำตอบที่ยืนยันแล้ว (ตรงกับที่ปิดไว้ใน `align-high-level-architecture.md` §3.5 แล้ว) คือ **`Core` (แกนประสานงาน) เป็นผู้เขียนเพียงผู้เดียว** ทั้ง 2 จุด: (1) งานเบื้องหลัง T-042 ตรวจจับ gap แล้วสร้าง `notification` ใหม่ผ่านธุรกรรม query-then-write กันสร้างซ้ำ, (2) auto-resolve ปิดแจ้งเตือนทันทีหลัง `POST /ai-match-results/{id}/confirm` สำเร็จและปิดช่องว่างของ CLO นั้น — `GapNotify` คงสถานะ read-only เดิมไว้ทุกประการ

## สิ่งที่แก้ไขใน `align-detailed-design.md`

ไม่มีการลบเนื้อหาเดิม — เพิ่ม/ปรับถ้อยคำเพื่อความถูกต้องเท่านั้น:

- **§0 (Legend)**: ปรับแถว `GapNotify` ให้ระบุชัดว่า "อ่านและแสดงผลเท่านั้น ไม่มีสิทธิ์เขียนไม่ว่ากรณีใด" และการเขียน `notification` ทั้งหมดเป็นหน้าที่ของ `Core` — อ้างอิงไปยัง §1.6 ใหม่
- **§1.1 (sequence diagram หลัก)**: เพิ่มขั้นตอน auto-resolve เข้าไปในกิ่ง "ยืนยันตรงๆ" ของ loop ตรวจสอบผล AI — หลังอัปเดต `state=confirmed` แล้ว ตรวจต่อภายในการเขียนชุดเดียวกันว่า CLO นี้มี `notification` ที่ `is_resolved=false` ค้างอยู่หรือไม่ ถ้ามีให้ auto-resolve ทันที พร้อมเพิ่มแถวในตาราง "จุดบังคับใช้กฎทางธุรกิจ" ท้าย §1.1
- **§1.5 (sequence diagram เดิมของ Gap Notification)**: แก้ไข (ไม่ลบ) จุดที่เคยเขียนผิดว่า `GapNotify` คำนวณ gap สดจาก query CLO/`ai_match_result` เอง และ "re-evaluate" เองตอน Trigger B — เปลี่ยนเป็น `GapNotify` **อ่านจาก `notification` collection ที่ `Core` เขียนไว้แล้ว** เท่านั้น (ตรงกับ `align-technical-design.md` §3 ที่ `GET /me/dashboard` คืนค่า `gap_alerts` เป็น `[{notification_id, clo_id, code, course_id, curriculum_id, message, created_at}]` จาก collection `notification` โดยตรง) — ทุกจุดที่แก้มีหมายเหตุ "[แก้ไข]" กำกับไว้ตามธรรมเนียมเดิมของเอกสารนี้ (ดู §2.3/§4.3 Q4 ที่เคยใช้รูปแบบเดียวกัน)
- **เพิ่ม §1.6 ใหม่ทั้งหมด** "สร้าง/ปิด `notification` — ฝั่งเขียนที่ §1.5 ยังไม่เคยแสดง (T-042, Auto-resolve)" มี 2 sequence diagram:
  - **§1.6.1**: งานเบื้องหลัง (T-042) วน CLO ทุกข้อ ตรวจว่ามีหลักฐานรองรับหรือไม่ ถ้าไม่มี เปิดธุรกรรมเดียว query-then-write กันสร้าง `notification` ซ้ำซ้อนสำหรับ CLO เดียวกัน
  - **§1.6.2**: auto-resolve ต่อเนื่องจาก §1.1 (ไม่ใช่ flow แยก) แสดงการปิด `notification` ภายในทรานแซกชันเดียวกับการยืนยัน แล้วแสดง `GapNotify` เป็น downstream reader ที่อ่านผลลัพธ์ในคำร้องแยกต่างหากภายหลัง (Gap Alert Banner หายไปเอง)
  - ทั้งสองไดอะแกรมบรรยายกลไก transaction แบบ conceptual ล้วนๆ ("ตรวจพบ gap → สร้าง notification ใหม่ภายในธุรกรรมเดียว") ไม่เอ่ยชื่อ Firestore/`runTransaction`/`set()` ตรงๆ ตามขอบเขตที่เอกสารนี้ประกาศไว้ว่าไม่ผูกกับ technical stack
- **เพิ่ม §2.5** `notification.is_resolved` state machine (`unresolved → resolved`, terminal, reopen สร้าง document ใหม่แทนไม่ reuse เดิม) ต่อจาก §2.4 `user.account_status`
- **§3 (ตารางรวม cross-reference)**: ปรับแถวกฎ #2 ให้ชี้ไป §1.5 และ §1.6 ทั้งคู่ พร้อมระบุว่าฝั่งเขียนเป็นของ `Core`

## ผลกระทบ/สิ่งที่ต้องตรวจสอบต่อ

- ไม่มีคำถามเปิดใหม่ที่ต้องถามผู้ใช้ — รายละเอียด field/mechanism ทั้งหมดดึงจาก `align-technical-design.md` §2.14 และ `task-breakdown.md` T-042–T-045 ที่มีอยู่ครบแล้ว ไม่ได้สมมติเพิ่ม
- ไม่กระทบ test plan (`docs/03-testing/01-test-plan/`) เพราะพฤติกรรมทางธุรกิจของ `notification` ไม่เปลี่ยนแปลง (test case TC-AB12-06 ถึง TC-AB12-10 ที่มีอยู่แล้วยังตรงกับ sequence ใหม่นี้) — เป็นการเพิ่มความละเอียดของ sequence diagram ให้ตรงกับพฤติกรรมที่ทดสอบอยู่แล้วเท่านั้น
- สอดคล้องกับ [[2026-09-06-high-level-architecture-notification-writer-fix-log|การแก้ไข align-high-level-architecture.md รอบเดียวกันนี้]] แล้ว ไม่ขัดแย้งกัน (ทั้งสองเอกสารยืนยันตรงกันว่า `Core` เขียน, `GapNotify` อ่านอย่างเดียว)

## เอกสารที่แก้ไข

- แก้ไข: `docs/02-design/02-technical/align-detailed-design.md` (§0 legend, §1.1, §1.5, เพิ่ม §1.6, เพิ่ม §2.5, §3)
- แก้ไข: `docs/02-design/02-technical/index.md` (ปรับคำอธิบายลิงก์ align-detailed-design)
- สร้างใหม่: `docs/05-log/2026-09-06-detailed-design-notification-sequence-log.md` (บันทึกนี้)

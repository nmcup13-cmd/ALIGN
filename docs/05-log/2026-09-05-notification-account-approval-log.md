# 2026-09-05: เพิ่ม entity `notification` และ `account_approval_log` เข้า align-api-schema-design.md

## บริบท

การ audit เอกสารพบว่า `docs/01-requirements/03-task/task-breakdown.md` อ้างถึง 2 ตารางที่ยังไม่เคยถูกเพิ่มเข้าเอกสาร schema เชิงแนวคิดเลย:

- **T-043** (AB-12) — ตาราง `notification` (แจ้งเตือน CLO ที่ยังไม่มีหลักฐาน ตามกฎทางธุรกิจ #2)
- **T-092** (AB-26) — ตาราง `account_approval_log` (audit trail การอนุมัติ/ปฏิเสธบัญชีอาจารย์ผู้สอน)

## สิ่งที่เปลี่ยน

เพิ่มทั้ง 2 entity เข้า [[../02-design/02-technical/align-api-schema-design|align-api-schema-design]] เท่านั้น (ไม่แตะ `align-technical-design.md` — มี agent อื่นเพิ่ม entity เดียวกันคู่ขนานที่นั่น):

- §1 (Conceptual Data Model): เพิ่มกลุ่มที่ 7 (`notification`) และเพิ่ม `account_approval_log` เข้ากลุ่มที่ 5 (บัญชีผู้ใช้/การอนุมัติ)
- §2 (ER Diagram): เพิ่ม 4 เส้นความสัมพันธ์ใหม่ (`USER–ACCOUNT_APPROVAL_LOG` ×2 เส้น คือ `account_id`/`decided_by`, และ `USER–NOTIFICATION`, `CLO–NOTIFICATION`) รวม entity ในเอกสารจาก 13 เป็น 15
- §3.14 `account_approval_log`: field ตรงตาม T-092 เป๊ะ (`account_id, action, decided_by, decided_at` + PK) — append-only, ไม่มี soft-delete (เป็น audit log ต้องไม่ถูกลบ) — ระบุชัดว่าไม่ซ้ำกับ `user.approved_by`/`approved_at` (เก็บเฉพาะการตัดสินใจล่าสุด)
- §3.15 `notification`: field หลักตรงตาม T-043 (`user_id, clo_id, message, created_at` + PK) — เพิ่ม `curriculum_id` (denormalized, ตามกฎบังคับเรื่อง curriculum scope ของเอกสารนี้) และฟิลด์สถานะวงจรชีวิต (read/resolved) ที่ **ยังไม่ยืนยัน**
- §4.4/§4.6: เพิ่ม endpoint `GET /me/notifications`, `POST /me/notifications/{id}/read` (draft) และระบุว่า endpoint approve/reject ของ E6 ต้อง insert แถวใหม่เข้า `account_approval_log` ทุกครั้ง

## คำถามเปิดที่ยังไม่ได้รับคำตอบ

เพิ่มหัวข้อ **5.5 (ยังไม่ยืนยัน)** ใน align-api-schema-design.md: `notification` ควรมีสถานะวงจรชีวิตแบบไหน — (A) manual read/unread, (B) auto-resolve ผูกกับสถานะ CLO จริง + unique constraint กัน dedup, หรือ (C) ไม่มีฟิลด์สถานะเลยตรงตาม T-043 เป๊ะๆ — ยังไม่มีผลตัดสินใจ ต้องถามผู้ใช้ก่อนถือว่า schema entity นี้เสร็จสมบูรณ์

## ผลกระทบอื่น

`align-technical-design.md` §2/§3 อาจต้องปรับให้สอดคล้อง (เช่น เพิ่ม 2 entity นี้เข้า schema/API ระดับ implementation-ready) — เป็นงานของ `technical-designer` ที่กำลังทำคู่ขนานอยู่แล้ว ไม่ใช่ขอบเขตของบันทึกนี้

## อัปเดต (2026-09-05, ภายหลัง): คำถามเปิดข้อ 1 (สถานะวงจรชีวิต) ปิดแล้ว

ผู้ใช้ยืนยันคำตอบสำหรับคำถามเปิด §5.5 (สถานะวงจรชีวิตของ `notification`) และคำถามเปิดเรื่อง denormalized field ตามกลุ่มหลักสูตร แล้ว:

1. **สถานะวงจรชีวิต**: เลือก **แนวทาง B — Auto-resolve ผูกสถานะ CLO จริง** — ใช้ `is_resolved` (boolean) + `resolved_at` (timestamp, nullable) แทน `is_read` แบบ manual — ระบบ set ให้อัตโนมัติเมื่อ CLO ที่แจ้งเตือนอ้างถึงมี `ai_match_result`/`syllabus_gap_result` ที่ `confirmed` แล้ว (ไม่ gap อีกต่อไป) — มี partial unique index บน `clo_id` WHERE `is_resolved=false` กัน notification ซ้ำซ้อน
2. **Field denormalized สำหรับกรองตามหลักสูตร**: ใช้ **`curriculum_id`** (ไม่ใช่ `course_id`) — ตรงกับ `program_admin_curriculum_scope` โดยตรง

`technical-designer` ได้ปรับ `align-technical-design.md` §2.14 (`notification`) และ §3 E4 (`GET /me/dashboard`) ให้สอดคล้องกับคำตอบนี้แล้ว (ทำเครื่องหมาย "[ยืนยันแล้ว]") — **`api-schema-designer` ได้ sync กลับไปที่ `align-api-schema-design.md` แล้วในรอบเดียวกันนี้** ปิดคำถามเปิด §5.5 ในเอกสารนั้นด้วยคำตอบเดียวกัน (ไม่ขัดแย้งกันอีกต่อไป) รายละเอียดที่เปลี่ยน:

- §1 (กลุ่มที่ 7) และย่อหน้าทิศทางการไหลของข้อมูล: อัปเดตให้ระบุพฤติกรรม auto-resolve ที่ยืนยันแล้วแทนการอ้างอิงคำถามเปิด
- §2 (ER Diagram): ปรับหมายเหตุอ่านไดอะแกรม (`USER–NOTIFICATION`/`CLO–NOTIFICATION`) ให้สะท้อนว่า 1 CLO มีแจ้งเตือนสะสมได้หลายแถวเป็นประวัติ แต่มี unique constraint กันซ้ำเฉพาะแถว unresolved — ไม่มีการเปลี่ยนเส้นความสัมพันธ์ในไดอะแกรม (FK เดิมเป็น `curriculum_id`/denormalized อยู่แล้ว ไม่ใช่ `course_id`)
- §3.15: ปรับฟิลด์ชุดสุดท้ายเป็น `notification_id, user_id, clo_id, curriculum_id, message, is_resolved, resolved_at, created_at` (ลบเครื่องหมาย [ข้อเสนอ — ยังไม่ยืนยัน]) พร้อมเพิ่มหมายเหตุ index/unique constraint และปิดประเด็น Delete (ไม่มี soft/hard-delete — auto-resolve เปลี่ยนสถานะแทน)
- §4.4: ปรับ `GET /me/notifications` ให้ default กรอง `is_resolved=false` (รับ `?include_resolved=true` เสริม) และตัด endpoint `POST /me/notifications/{id}/read` ออก (ไม่จำเป็นตามแนวทาง B) พร้อมหมายเหตุอธิบายเหตุผล
- §5: ปิดหัวข้อ 5.5 เป็น "ยืนยันแล้ว: แนวทาง B" — ทุกหัวข้อ 5.1–5.5 ยืนยันครบแล้ว ไม่มีคำถามเปิดค้างในเอกสารนี้อีก

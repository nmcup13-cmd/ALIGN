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

## อัปเดต (2026-09-05, ภายหลังอีกครั้ง): เพิ่ม test case ให้ 2 entity นี้ครบแล้วใน test plan

`test-designer` เพิ่ม test case ใน `docs/03-testing/01-test-plan/` รองรับพฤติกรรมของทั้ง 2 entity ที่ยืนยันแล้ว (ไม่มีคำถามเปิดเหลือ จึงเขียนเป็น test case ยืนยันได้ทันที ไม่ต้องเป็น placeholder):

- **`notification` (BR#2, AB-12)** — เพิ่ม **TC-AB12-06 ถึง TC-AB12-10** (5 รายการ) ใน [[../03-testing/01-test-plan/e4-dashboard-alerts|e4-dashboard-alerts]]:
  - TC-AB12-06 (Happy path): auto-resolve — `is_resolved`/`resolved_at` ถูก set อัตโนมัติทันทีที่ CLO มีผลจับคู่ `confirmed` แล้ว ไม่ใช่ผู้ใช้กด "อ่านแล้ว"
  - TC-AB12-07 (Rejection): partial unique index กัน insert แจ้งเตือนซ้ำสำหรับ `clo_id` เดียวกันที่ยัง `is_resolved=false`
  - TC-AB12-08 (Edge case): reopen ต้องสร้างแถวใหม่ ไม่ reuse/reopen แถวเดิมที่ resolved ไปแล้ว (รักษาประวัติ)
  - TC-AB12-09 (Happy path): แจ้งเตือนที่ resolved หายจาก `GET /me/dashboard` เองทันที (ยังอยู่ใน DB, กรองออกจาก default query เท่านั้น)
  - TC-AB12-10 (Rejection): PDPA/scope — เห็นเฉพาะแจ้งเตือนของตนเอง (`user_id = current_user`)
- **`account_approval_log` (audit trail ของ AB-26)** — เพิ่ม **TC-AB26-08 ถึง TC-AB26-10** (3 รายการ) ใน [[../03-testing/01-test-plan/e6-user-registration-approval|e6-user-registration-approval]]:
  - TC-AB26-08 (Happy path): INSERT แถวใหม่พร้อมกับอัปเดต `user.account_status`/`approved_by`/`approved_at` ในธุรกรรมเดียวกันเสมอ (ไม่ commit แยกกัน)
  - TC-AB26-09 (Happy path): append-only — ประวัติเดิมไม่ถูกลบ/เขียนทับแม้บัญชีเดียวกันถูกตัดสินใจซ้ำหลายรอบ (ต่างจาก `user.approved_by`/`approved_at` ที่เก็บเฉพาะล่าสุด)
  - TC-AB26-10 (Rejection): `decided_by` ต้องเป็นบัญชี `role=program_admin` เท่านั้น — มี constraint สำรองที่ระดับ schema ไม่ใช่พึ่งเฉพาะการตรวจ role ที่ backend API layer ชั้นเดียว

**ผลกระทบต่อยอดรวม test plan**: อัปเดต §5 ของ [[../03-testing/01-test-plan/test-plan-align|test-plan-align]] และสรุปใน [[../03-testing/01-test-plan/index|index]] — E4 จาก 20 เป็น **25** (happy 9→11, edge 5→6, rejection 6→8), E6 จาก 25 เป็น **28** (happy 12→14, edge คงที่ 4, rejection 9→10) — ยอดรวมทั้งโปรเจกต์จาก **146 เป็น 154 test case** placeholder ยังคงเป็น 0 รายการ ไม่มีคำถามเปิดใหม่เกิดขึ้นจากงานนี้ (ทั้ง 2 entity มี field/พฤติกรรมยืนยันแล้วครบตาม `align-technical-design.md` §2.14/§2.15 และ `align-api-schema-design.md` §3.14/§3.15 อยู่แล้วก่อนเริ่มเขียน test case)

## อัปเดต (2026-09-05, ต่อเนื่อง): ปิดคำถามเปิด §5.6/§5.7 ของ align-api-schema-design.md (Firestore conversion)

ผู้ใช้ยืนยันคำตอบสำหรับ 2 คำถามเปิดที่เพิ่มเข้ามาในรอบแปลงเอกสารเป็น Firestore ([[../02-design/02-technical/align-api-schema-design|align-api-schema-design]] §5.6–5.7):

1. **§5.6 โครงสร้าง Collection Hierarchy** → ยืนยัน **แนวทาง Hybrid (ทางเลือกที่ 3)** — nest เฉพาะ `plo`/`course`/`clo`/`clo_plo_mapping` ใต้ `curricula/{year}`, ส่วนที่เหลือเป็น top-level พร้อม `curriculum_id` denormalized — **ตรงกับ default ที่เอกสารใช้อยู่แล้วทั้งฉบับ ไม่มีการเปลี่ยนแปลงเนื้อหา/path/diagram/Security Rules ใดๆ**
2. **§5.7 Document ID Strategy ของ `ai_match_result`** → ยืนยัน **แนวทาง A — Auto-generated** ต่อครั้งที่ AI รัน (ไม่ใช่ composite id) — **ตรงกับ default ที่เอกสารใช้อยู่แล้ว ไม่มีการเปลี่ยนแปลงเนื้อหา/index ใดๆ**

เนื้อหาเปลี่ยนเฉพาะสถานะกำกับหัวข้อ: §5.6/§5.7 (และย่อหน้านำของหัวข้อ 5) เปลี่ยนจาก "ยังไม่ยืนยัน — ใช้ ... เป็น default" เป็น **"[ยืนยันแล้ว 2026-09-05]"** — ไม่มีการแก้ schema/API/diagram ใดๆ เพิ่มเติม เพราะ default ที่เคยใช้ตรงกับคำตอบสุดท้ายพอดี — **หัวข้อ 5 ทั้งหมด (5.1–5.7) ของ `align-api-schema-design.md` ปิดคำถามเปิดครบทุกข้อแล้ว** ไม่มีคำถามเปิดค้างในเอกสารนี้อีก

## อัปเดต (2026-09-06): แก้ 4 test case ที่ยังอ้างอิงกลไก SQL-specific ที่ไม่มีจริงใน Firestore

Audit พบว่า test case ที่เพิ่มไว้ในอัปเดตก่อนหน้า (ช่วงที่ schema ยังเป็น PostgreSQL เชิงสัมพันธ์) ยังบรรยาย "กลไกที่คาดว่าจะบังคับผลลัพธ์" ด้วยศัพท์ SQL (unique constraint, DB-level constraint, commit/rollback) ที่ไม่มีอยู่จริงใน Cloud Firestore ตามที่ `align-technical-design.md` §2.0/§2.0.4 และ `align-api-schema-design.md` §2.6/§2.7/§2.8 ยืนยันไว้แล้ว — **ผลลัพธ์ทางธุรกิจที่ทดสอบไม่เปลี่ยนแปลง** แก้เฉพาะคำอธิบายกลไกที่ทำให้เกิดผลนั้น:

- **TC-AB12-07** ([[../03-testing/01-test-plan/e4-dashboard-alerts|e4-dashboard-alerts]]) — เปลี่ยนจาก "partial unique index บน `clo_id` WHERE `is_resolved=false`" เป็น **Firestore transaction แบบ query-then-write** (`runTransaction`) — ปรับสถานการณ์ทดสอบเป็นจำลอง 2 background job รันซ้อนกันพร้อมกันเป๊ะ (concurrent) เพื่อพิสูจน์ atomicity ของ transaction แทนการอ้าง DB constraint ที่ไม่มีจริง
- **TC-AB26-08** ([[../03-testing/01-test-plan/e6-user-registration-approval|e6-user-registration-approval]]) — เปลี่ยนศัพท์ "commit/rollback แยกกัน" (SQL transaction) เป็น **`runTransaction`** ของ Firestore — ระบุพฤติกรรมจริง (all-or-nothing, retry อัตโนมัติโดย SDK ถ้าชนกันระหว่างอ่าน-เขียน ไม่มีแนวคิด "commit ฝั่งเดียวแล้ว rollback อีกฝั่ง")
- **TC-AB26-10** (ไฟล์เดียวกัน) — เขียนใหม่ทั้งหมด: เดิมอ้าง "constraint ระดับ schema/ฐานข้อมูล" ที่บังคับ `decided_by` ต้องเป็น `role=program_admin` ซึ่ง Firestore ไม่มีกลไกเทียบเท่า — เปลี่ยนเป็นทดสอบ **2 ชั้นจริง**: (1) Cloud Function ตรวจ role ก่อนเขียนทุกครั้ง (กลไกหลัก) และ (2) Firestore Security Rules `match /account_approval_logs/{id} { allow write: if false }` ปฏิเสธการเขียนตรงจาก client ทุกกรณี (defense-in-depth ชั้นที่สอง — บล็อกทั้งหมดไม่ใช่ตรวจเงื่อนไข `decided_by` เฉพาะเจาะจง)
- **TC-AB09-02** ([[../03-testing/01-test-plan/e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]]) — เปลี่ยน "constraint ตอนสร้าง mapping" เป็น "การตรวจที่ Cloud Function ตอนสร้าง `clo_plo_mapping` (เช็ค `clo.curriculum_id == plo.curriculum_id` ก่อนเขียน)" ให้ชัดว่าไม่ใช่ DB constraint

ไม่มีการเปลี่ยนจำนวน test case หรือผลลัพธ์ที่คาดหวังทางธุรกิจ — แก้ไขโดย `test-designer` ตามคำสั่งตรวจ audit เฉพาะจุด

## อัปเดต (2026-09-06, ต่อเนื่อง): แก้คำศัพท์ "แถว"/"insert" ที่ตกค้างระดับคำ (ไม่ใช่กลไก) ใน test case ใกล้เคียง

Audit รอบถัดมาพบว่ารอบแก้ก่อนหน้า (ด้านบน) แก้เฉพาะศัพท์กลไกที่เป็น SQL-specific ชัดเจน (unique constraint, DB constraint, commit/rollback) แต่ยังมีคำว่า "แถว" (row) และ "insert" หลงเหลืออยู่ระดับคำในบาง test case ที่อยู่นอกและในขอบเขตของรอบก่อน — ไม่ใช่การเปลี่ยนผลลัพธ์ทางธุรกิจ เป็นแค่ปรับศัพท์ให้ตรงกับ Cloud Firestore (ใช้ "document" แทน "แถว/row", "สร้าง/เพิ่ม document ใหม่" แทน "insert"):

- **E1** ([[../03-testing/01-test-plan/e1-clo-plo-syllabus-setup|e1-clo-plo-syllabus-setup]]) — TC-AB01-06, TC-AB02-05: "แถว" → "document" (soft-delete ของ `clo_plo_mapping`/`ai_match_result` ยังคงอยู่ในฐานข้อมูล)
- **E2** ([[../03-testing/01-test-plan/e2-teaching-record-evidence|e2-teaching-record-evidence]]) — TC-AB06-06: "แถว" → "document" (soft-delete ของ `evidence`)
- **E4** ([[../03-testing/01-test-plan/e4-dashboard-alerts|e4-dashboard-alerts]]) — TC-AB12-07 (เพิ่มเติมนอกรายการเดิม — พบ "แถว" หลงเหลือแม้กลไกหลักถูกแก้ไปแล้วในรอบก่อน), TC-AB12-08, TC-AB12-09: "แถว" → "document" ทั้งหมด (reopen สร้าง document ใหม่ไม่ reuse ของเดิม, document ที่ resolved ยังอยู่ในฐานข้อมูล)
- **E6** ([[../03-testing/01-test-plan/e6-user-registration-approval|e6-user-registration-approval]]) — TC-AB26-09: "แถว"/"insert" → "document"/"สร้าง document ใหม่"
- **test-plan-align.md** §5 (สรุปยอดรวมของ E4/E6): "แถวใหม่" → "document ใหม่"
- **index.md**: ปรับสรุป TC-AB12-06–10/TC-AB26-08–10 ที่ยังบรรยาย "unique constraint"/"insert" (กลไกเดิมก่อนรอบแก้ 2026-09-06 ด้านบน) ให้ตรงกับข้อความจริงในไฟล์ย่อยปัจจุบัน (Firestore transaction แบบ query-then-write, เขียน document ใหม่ผ่าน Firestore transaction เดียวกับการอัปเดต `user`)

ไม่มีการเปลี่ยนจำนวน test case, ID, หรือผลลัพธ์ที่คาดหวังทางธุรกิจ — แก้ไขโดย `test-designer` ตามคำสั่งตรวจ audit เฉพาะจุดต่อเนื่องจากรอบก่อนหน้าในวันเดียวกัน

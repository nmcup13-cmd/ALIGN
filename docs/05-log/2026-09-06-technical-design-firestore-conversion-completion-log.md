# 2026-09-06: ปิด audit finding — แปลง §2.11–§2.15 และไดอะแกรมท้าย §2 ของ align-technical-design.md เป็น Firestore ให้ครบ

## บริบท

Audit ล่าสุดพบว่างานแปลง [[../02-design/02-technical/align-technical-design|align-technical-design]] §2 (Database Schema) เป็น Cloud Firestore ที่ทำไปเมื่อ 2026-09-05 **ไม่ครบ** — §2.1 ถึง §2.10 (`curriculum`, `plo`, `clo`, `clo_plo_mapping`, `course`, `syllabus`, `teaching_record`, `evidence`, `ai_match_result`, `clo_coverage_summary`) ถูกแปลงเป็น Firestore notation ถูกต้องแล้ว (Document ID, reference field, collection/subcollection) แต่ **§2.11 เป็นต้นไปยังคงเป็น SQL/relational notation เดิม** (`PK`, `FK →`, ตาราง log แยก, partial unique index, `SELECT`/`INSERT`) ทั้งที่หมายเหตุหัวเอกสาร (บรรทัด 5) อ้างว่าแปลงครบทั้ง §2 แล้ว — เป็นความขัดแย้งภายในเอกสารเดียวกันที่ blocking การสร้าง database จริง

## สิ่งที่แก้ไข

แปลง `align-technical-design.md` §2.11–§2.15 และไดอะแกรมความสัมพันธ์ท้าย §2 ให้เป็น Firestore notation แบบเดียวกับ §2.1–§2.10 โดยอ้างอิงฟิลด์/document-ID-strategy/collection-path จาก [[../02-design/02-technical/align-api-schema-design|align-api-schema-design]] §3.11–§3.15 ให้ตรงกันเป๊ะ (ไม่เดาเอง):

- **§2.11 `syllabus_gap_result`** → `PK`/`FK →` เปลี่ยนเป็น `(document id) auto-generated` + reference field พร้อมหมายเหตุ nested path (`course_id`), เพิ่ม `curriculum_id` denormalized และหมายเหตุ composite index `(course_id, generated_at DESC)`
- **§2.12 `user`** → doc id เปลี่ยนเป็น Firebase Auth UID, ลบ `password_hash` (Firebase Authentication จัดการเอง ไม่เก็บใน Firestore), `program_admin_curriculum_scope` เปลี่ยนจาก `FK[] → curriculum` เป็น `array of string (curriculum_id)` reference field, เพิ่ม `created_at`, แก้ประโยคที่เคยขัดแย้งกับ §2.0 ("FK ยังชี้ถึง user_id เดิมได้ปกติ" → อธิบายด้วยภาษา reference field ที่ไม่ตรวจการมีอยู่จริงอัตโนมัติ), เพิ่มหมายเหตุ Firestore-specific เรื่อง `revokeRefreshTokens()` ตอน soft-delete และ indexing เชิงแนวคิด
- **§2.13 Access-control/PDPA** → เปลี่ยนจากตาราง SQL tuple notation `(log_id, evidence_id, accessed_by, accessed_at, action)` เป็น field table แบบ Firestore เต็มรูปแบบ (collection `evidence_access_logs`, top-level, append-only) พร้อม indexing
- **§2.14 `notification`** → จุดขัดแย้งที่ชัดที่สุด: "partial unique index" + "SELECT ... ก่อนสร้างแถวใหม่" เปลี่ยนเป็น "Firestore transaction แบบ query-then-write" ให้ตรงกับที่ §2.0.4 ของเอกสารเดียวกันสรุปไว้แล้ว และตรงกับ align-api-schema-design.md §2.6-ข/§3.15 — เพิ่มหมายเหตุ composite index `(clo_id, is_resolved)` ที่จำเป็นเสมอ
- **§2.15 `account_approval_log`** → "insert แถวใหม่ในตาราง" → "สร้าง document ใหม่ใน collection", "ธุรกรรมเดียวกัน" → ระบุชัดเป็น Firestore transaction (`runTransaction`)
- **ไดอะแกรมท้าย §2** → แปลงจาก ER diagram cardinality (`curriculum 1──* plo` ฯลฯ) เป็นสรุปเชิงข้อความแบบ Firestore (subcollection hierarchy + reference/denormalized field ต่อ collection) สอดคล้องกับรูปแบบที่ §2.0.2 ใช้อยู่แล้ว พร้อมชี้ไปยังไดอะแกรม mermaid แบบเต็มที่ align-api-schema-design.md §2.4 แทนการมีไดอะแกรมคนละแบบ 2 ชุดที่อาจ drift กัน

คงความหมายทางธุรกิจ/ฟิลด์/PDPA flag/state draft-confirmed ของทุก entity ไว้ 100% ตามเงื่อนไข — เปลี่ยนแค่กลไกระดับ storage

## ผลกระทบ/สิ่งที่ต้องตรวจสอบต่อ

- ไม่มีคำถามเปิดใหม่ที่ต้องถามผู้ใช้เพิ่ม — ทุกจุดที่แก้อ้างอิงได้จาก align-api-schema-design.md §3.11–§3.15 ที่มีรายละเอียดครบอยู่แล้ว
- ไม่กระทบ test plan (`docs/03-testing/01-test-plan/`) เพราะเปลี่ยนแค่ storage mechanism ไม่เปลี่ยนพฤติกรรมทางธุรกิจ/AC ใดๆ
- อัปเดต [[../02-design/02-technical/index|02-technical/index]] ให้คำอธิบายลิงก์ `align-api-schema-design` สะท้อนว่า §2/§3 ของ `align-technical-design.md` แปลงครบแล้ว (เดิมระบุว่ายังไม่ถูกปรับตาม)

## เอกสารที่แก้ไข

- แก้ไข: `docs/02-design/02-technical/align-technical-design.md` (§2.11–§2.15, ไดอะแกรมท้าย §2)
- แก้ไข: `docs/02-design/02-technical/index.md` (ปรับคำอธิบายลิงก์ align-api-schema-design)
- สร้างใหม่: `docs/05-log/2026-09-06-technical-design-firestore-conversion-completion-log.md` (บันทึกนี้)

## Addendum (2026-09-06 รอบ 2) — ปิด audit finding เพิ่มเติม 2 ข้อ (label ขัดแย้งกันเอง + คำว่า "ตาราง" หลงเหลือ)

Audit รอบถัดมาพบอีก 2 จุดในไฟล์เดียวกัน (ไม่เกี่ยวกับงานแปลง Firestore ด้านบน แต่เป็นความไม่สอดคล้องด้าน label/คำศัพท์ล้วนๆ):

1. **หัวเอกสาร (บรรทัด 5) ขัดแย้งกับ §2.9/ไดอะแกรม §2**: หัวเอกสารระบุว่า document ID strategy ของ `ai_match_result` "ปิดครบแล้ว — [ยืนยันแล้ว] Auto-generated" แต่ §2.9 (บรรทัด ~241) และไดอะแกรม collection hierarchy (บรรทัด ~96) ยังคงมี label เดิม `[ข้อเสนอ — ยังไม่ยืนยัน]` / "ห้ามถือว่าเป็นการตัดสินใจสุดท้าย" ค้างอยู่ — แก้โดยเปลี่ยน label ทั้งสองจุดเป็น `[ยืนยันแล้ว]` ให้ตรงกับหัวเอกสารและกับ align-api-schema-design.md §5.7 (**ไม่เปลี่ยนการตัดสินใจจริง** ยังคงเป็น auto-generated เหมือนเดิม เปลี่ยนแค่ label ที่ตกหล่นจากการแก้ครั้งก่อน)
2. **คำว่า "ตาราง" หลงเหลือ 3 จุด** ที่ควรเป็น "collection" ตาม Firestore terminology (รอบแปลงก่อนหน้าพลาดจุดเหล่านี้ไป): บรรทัด ~57 ("ตาราง `ai_match_result`" ในหัวข้อ 1 ภาพรวมสถาปัตยกรรม), บรรทัด ~454 ("`gap_alerts` อ่านจากตาราง `notification`" ใน E4), บรรทัด ~562 ("ตาราง `evidence` มีฟิลด์ `contains_student_pii`" ใน §6 PDPA) — แก้เป็น "collection" ทั้ง 3 จุด ความหมายทางธุรกิจไม่เปลี่ยนแปลง

ทั้งสองข้อเป็นการแก้ label/คำศัพท์ล้วนๆ ไม่กระทบ schema/API/พฤติกรรมทางธุรกิจ ไม่กระทบ test plan และไม่มีคำถามเปิดใหม่

## Addendum (2026-09-06 รอบ 3) — ปิด status claim ที่ล้าสมัยใน align-tech-stack.md §5/§6

Audit อีกรอบพบว่า `docs/02-design/02-technical/align-tech-stack.md` §5 (ราว บรรทัด 295) และ §6 (ราว บรรทัด 306) ยังค้างคำกล่าวอ้างเดิมว่า "§2/§3 ของ `align-technical-design.md` ปัจจุบันยังอ้างอิงโมเดลข้อมูลเชิงสัมพันธ์ (PostgreSQL/Supabase) ซึ่งไม่สอดคล้องกับ Firestore" และ "ต้องปรับให้สอดคล้องกับ Firestore data model ใหม่" — ข้อความนี้ถูกต้องตอนเขียน (2026-09-05, ก่อนงานแปลงส่วนที่เหลือ §2.11–§2.15 จะเสร็จ) แต่ **stale** หลังจากงานแปลงเสร็จสมบูรณ์ตามบันทึกด้านบนแล้ว

แก้ไขโดย**คงข้อความเดิมไว้ทั้งหมด** (ไม่ลบ ตามธรรมเนียมของเอกสารนี้ที่บันทึกสถานะรายรอบ) แล้วเพิ่มหมายเหตุปิดสถานะต่อท้ายทั้ง §5 และ §6 ว่า "(ปิดแล้ว — ดู `align-technical-design.md` และ [[2026-09-06-technical-design-firestore-conversion-completion-log|log 2026-09-06]])" พร้อมระบุชัดว่าไม่มีความไม่สอดคล้องเรื่องโมเดลข้อมูลเชิงสัมพันธ์ค้างอยู่อีกต่อไป — ไม่ใช่งานออกแบบใหม่ เป็นแค่การแก้สถานะที่ล้าสมัยให้ตรงกับความเป็นจริงปัจจุบัน

### เอกสารที่แก้ไขเพิ่ม (addendum นี้)

- แก้ไข: `docs/02-design/02-technical/align-tech-stack.md` (§5, §6 — เพิ่มหมายเหตุปิดสถานะ ไม่ลบเนื้อหาเดิม)

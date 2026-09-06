# Technical Design: ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)

ต่อยอดจากต้นแบบหน้าจอใน [[../01-prototypes/align-app-screens|align-app-screens]] และยึด [[../../01-requirements/01-spec/requirement-align|requirement-align]] เป็น source of truth — เอกสารนี้เป็นพิมพ์เขียวสำหรับทีมพัฒนา ยังไม่มีโค้ดจริง จึงเป็นข้อเสนอเชิงออกแบบที่ต้องยืนยันร่วมกับทีมพัฒนาก่อนเริ่มลงมือสร้างจริง โดยเฉพาะหัวข้อ "เทคโนโลยีที่เลือกใช้" ที่ระบุไว้ชัดเจนว่าเป็นข้อเสนอ

> **อัปเดต (2026-09-05) — ปรับ §2 (Database Schema) และ §3 (API Design) ให้ตรงกับ Cloud Firestore**: [[align-tech-stack|align-tech-stack]] ยืนยันแล้วว่าโปรเจกต์นี้ใช้ Firebase ทั้ง suite (ดู §5 ด้านล่าง) และ [[align-api-schema-design|align-api-schema-design]] ได้ออกแบบโครงสร้าง collection/subcollection ที่เข้ากับ Firestore ไว้ครบแล้ว — §2/§3 ของเอกสารนี้ (เดิมยังเขียนด้วยสมมติฐาน PostgreSQL/เชิงสัมพันธ์) จึงถูกปรับให้สอดคล้องกันตามนั้น (เปลี่ยนกลไกระดับ storage เท่านั้น เช่น PK→Document ID, FK→reference field ที่ต้องตรวจที่ Cloud Function เอง, unique constraint→document ID strategy/transaction — **ความหมายทางธุรกิจของทุกฟิลด์ไม่เปลี่ยนแปลง**) — ทั้ง 2 จุดที่ align-api-schema-design.md เคยทำเครื่องหมายเป็นคำถามเปิด/ข้อเสนอที่ยังไม่ยืนยัน ปิดครบแล้วทั้งคู่: โครงสร้าง collection hierarchy §5.6 — **[ยืนยันแล้ว] Hybrid**, และ document ID strategy ของ `ai_match_result` §5.7 — **[ยืนยันแล้ว] Auto-generated** (ตรงกับ default ที่ §2.9 ของเอกสารนี้ใช้อยู่แล้ว ไม่มีอะไรต้องแก้เพิ่ม)

> หมายเหตุคุมทั้งเอกสาร: ทุกที่ที่มีคำว่า **หลักสูตร (curriculum)** ในเอกสารนี้ หมายถึงกลุ่มหลักสูตร **2565** หรือ **2570** เท่านั้น ห้ามมี entity หรือ query ใดที่ผสาน/จับคู่ข้อมูลข้าม 2 กลุ่มนี้ (ตามเงื่อนไข cross-cutting ในสเปค)

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (System Architecture Overview)

ระบบประกอบด้วย 5 ส่วนหลัก แบบ web application + backend API แยกชั้นตาม concern:

```
[ผู้ใช้งาน]
  อาจารย์ผู้สอน (Instructor) / ผู้บริหารหลักสูตร (Program Administrator)
        |
        | HTTPS (REST/JSON)
        v
[Frontend — Web/App Client]
  หน้าแรก/แดชบอร์ด, บันทึกการสอน, แผนที่ CLO x สัปดาห์, สรุปวิชา
        |
        v
[Backend API — ALIGN API]
  - Auth / สิทธิ์ตามบทบาท (Instructor / Program Administrator + scope หลักสูตร)
    + ตรวจสถานะบัญชี (account_status = 'approved') ก่อนทุก request ที่ต้อง login (E6)
  - CRUD: Curriculum, PLO, CLO, CLO-PLO mapping, Course
  - บันทึกการสอน + แนบหลักฐาน
  - Orchestrate AI matching (เรียก AI Matching Service)
  - Dashboard / Gap-alert queries
  - สั่งงาน Word-export Service
  - บังคับ access control ตาม PDPA ทุก endpoint ที่แตะหลักฐาน
        |
        +----------------+----------------------+
        |                |                      |
        v                v                      v
[Cloud Firestore     [AI Matching Service     [Evidence/File Storage
 (NoSQL document/     จับคู่ CLO/PLO +          เก็บชิ้นงาน/หลักฐานที่แนบ
 collection store)]    คำนวณสัดส่วน/ความถี่      + ไฟล์ course syllabus
                       ที่แมทช์ระดับวิชา +        ที่อัปโหลด ควบคุมสิทธิ์
                       วิเคราะห์ gap เทียบ         ตาม PDPA]
                       course syllabus —
                       อ่านเฉพาะ CLO/syllabus
                       ของ curriculum
                       เดียวกันกับวิชานั้น]
        ^
        | อ่านข้อมูลที่อาจารย์ "ยืนยันแล้ว" เท่านั้น (ไม่ใช้ draft จาก AI)
        |
[Word-export Service]
  - สร้างเอกสาร มคอ./QA
  - อ้างอิงเฉพาะหลักฐานที่แนบจริงในระบบ
```

หลักการออกแบบที่ยึดตามกฎทางธุรกิจ:

- **AI Matching Service เป็นบริการแยก** ไม่เขียนผลลงฐานข้อมูลหลักโดยตรง — ผลที่ได้ทุกครั้งจะถูกเก็บเป็น "draft" ในตาราง `ai_match_result` (จับคู่ CLO/PLO) หรือ `syllabus_gap_result` (วิเคราะห์ gap เทียบ course syllabus — เป็นงานแยกจากการจับคู่ CLO/PLO) แล้วรอ backend API เรียก endpoint ยืนยันจากอาจารย์ก่อนจึงจะแปลงเป็นข้อมูลที่ใช้งานจริง (human-in-the-loop ตามกฎ #3)
- **Evidence/File Storage แยกจาก Cloud Firestore** เพื่อให้ควบคุมสิทธิ์การเข้าถึงไฟล์ (ที่อาจมีข้อมูลส่วนบุคคลของนักศึกษา) ได้อย่างละเอียด ตาม PDPA (กฎ #5) โดย backend API เป็นประตูเดียวที่คุยกับ storage — ห้าม client เข้าถึง storage ตรง
- **Word-export Service อ่านเฉพาะข้อมูลที่ยืนยันแล้ว** (confirmed) ไม่ใช่ draft จาก AI เพื่อไม่ให้เอกสารอ้างอิงหลักฐานที่ยังไม่ผ่านการตรวจสอบ (กฎ #4)
- **งานประกันคุณภาพ (QA) ไม่ใช่ user/role ของระบบ ALIGN** — เอกสารที่ Word-export Service สร้างขึ้น (มคอ./QA ในไดอะแกรมด้านบน) มีไว้ให้ **ผู้บริหารหลักสูตร** เป็นผู้ดาวน์โหลดจากระบบแล้วนำไปส่งต่อให้ QA ใช้ตรวจสอบภายนอกระบบเท่านั้น QA ไม่มี login, ไม่มี account, และไม่มี endpoint ใดในระบบนี้ที่ให้ QA เข้าถึงโดยตรง (ตามขอบเขตในสเปค)
- **Backend API บังคับ gate การอนุมัติบัญชีก่อนทุก request ที่ต้อง login (E6, กฎทางธุรกิจ #6)** — อาจารย์ผู้สอนสมัครใช้งานเองได้ (self-service registration) แต่บัญชีจะอยู่ในสถานะ "รออนุมัติ" จนกว่าผู้บริหารหลักสูตรจะอนุมัติ ระหว่างนั้น (หรือถ้าถูกปฏิเสธ) ต้องเข้าถึง endpoint อื่นใดของระบบไม่ได้เลย — ดูฟิลด์ `account_status` ที่ §2.12 และรายละเอียด endpoint ที่ §3 (E6)
- **Firestore ไม่มี FK/JOIN/unique constraint ข้าม document/CHECK/trigger ระดับ database engine** ต่างจาก PostgreSQL ที่ข้อเสนอเดิมเคยตั้งสมมติฐานไว้ — ทุกกฎทางธุรกิจข้างต้น (รวมถึงกฎ #1/#3/#5) จึงถูกบังคับใช้ที่ **Cloud Function/Server layer เท่านั้น** ไม่มีชั้นป้องกันที่สองจาก database engine ให้พึ่งพา (Firestore Security Rules เป็นเพียง defense-in-depth ชั้นที่สอง ไม่ใช่กลไกบังคับกฎหลัก) — รายละเอียดกลไกแทนที่ทั้งหมดอยู่ที่ §2.0

---

## 2. Database Schema (Cloud Firestore)

เอนทิตีหลักและความสัมพันธ์ (แสดงเฉพาะฟิลด์สำคัญ) — **อัปเดต 2026-09-05: สลับกลไกจาก PostgreSQL/เชิงสัมพันธ์ (ข้อเสนอฉบับก่อนหน้า) ไปเป็น Cloud Firestore (NoSQL document/collection)** ตามข้อกำหนดบังคับใน [[align-tech-stack|align-tech-stack]] — รายละเอียดเต็ม (เหตุผลการตัดสินใจต่อจุด, diagram แบบ Firestore, security rules แบบเต็ม, ตารางเหตุผลที่เลือกแต่ละทางเลือก) อยู่ที่ [[align-api-schema-design|align-api-schema-design]] §1–§3 — หัวข้อนี้สรุปเฉพาะส่วนที่ทีมพัฒนาต้องใช้เริ่มงานจริง โดยคงความหมายทางธุรกิจ/ฟิลด์/PDPA flag/state draft-confirmed ทุกจุดไว้ตามเดิม 100% (เปลี่ยนแค่กลไกระดับ storage)

### 2.0 หลักการแทนกลไกเชิงสัมพันธ์เดิม (Firestore ไม่มี FK/JOIN/unique constraint ข้าม document/CHECK/trigger)

**2.0.1 ตารางเทียบกลไก** (เหตุผลเต็มที่ align-api-schema-design.md §2.1):

| กลไกเชิงสัมพันธ์เดิม (ข้อเสนอฉบับก่อนหน้า) | ใช้อะไรแทนใน Firestore |
|---|---|
| Primary Key (PK) | **Document ID** — natural key/composite key ตามที่ระบุไว้ต่อ entity ด้านล่าง (เช่น `plo` ใช้ `code`, `clo_plo_mapping` ใช้ `"{course_id}_{clo_code}_{plo_code}"`) หรือ auto-generated เมื่อไม่มี natural key ที่เหมาะสม |
| Foreign Key (FK) บังคับ | **Reference field** — เก็บ document ID ของปลายทางเป็น string ธรรมดา ไม่มีการตรวจการมีอยู่จริงให้อัตโนมัติ — **ต้องตรวจที่ Cloud Function ก่อนเขียนทุกครั้ง** (รวมถึงตรวจว่าอยู่ curriculum เดียวกันหรือไม่ตามกฎ cross-cutting) |
| JOIN ข้าม table | ไม่มี — ต้อง **denormalize** field ที่ query ร่วมบ่อย (เช่น `curriculum_id`, `course_id`) ซ้ำไว้ในตัว document เอง |
| Unique constraint (เต็ม/partial) | **Document ID strategy** (unique อัตโนมัติภายใน collection/subcollection เดียวกัน) สำหรับ full-unique หรือ **Firestore transaction แบบ query-then-write** สำหรับ partial-unique (เช่น `notification`) |
| CHECK constraint / Trigger ระดับ DB | ไม่มี — **Cloud Function เป็นจุดบังคับใช้กฎทางธุรกิจเดียว** (Firestore Security Rules เป็น defense-in-depth ชั้นที่สองเท่านั้น ดู §6) |
| SQL transaction (multi-table) | **`runTransaction`** (read-then-write ที่ต้อง atomic) และ **`writeBatch`** (หลาย write พร้อมกันที่ไม่ต้องอ่านก่อน) — ดูจุดที่ต้องใช้ที่ 2.0.4 |

**2.0.2 โครงสร้าง Collection Hierarchy — Hybrid [ยืนยันแล้ว 2026-09-05]**: nest เฉพาะ 4 entity ที่กฎ curriculum-isolation เข้มงวดที่สุด (`plo`, `course`, `clo`, `clo_plo_mapping`) ไว้ใต้ `curricula/{curriculum_id}` เพื่อให้การ query/เขียนข้าม curriculum โดยไม่ตั้งใจ**เป็นไปไม่ได้ทางโครงสร้าง** ส่วนที่เหลือเป็น top-level collection พร้อม `curriculum_id`/`course_id` denormalized (รายละเอียดเหตุผล/ทางเลือกอื่นที่ไม่เลือกอยู่ที่ align-api-schema-design.md §5.6):

```
curricula/{curriculum_id}                           ← doc id = year_code เช่น "2565", "2570"
  plos/{plo_id}                                      ← doc id = code เช่น "PLO1"
  courses/{course_id}                                ← doc id = รหัสวิชาจริง เช่น "127121"
    clos/{clo_id}                                    ← doc id = code เช่น "CLO1"
    syllabus/main                                     ← single document เสมอ (บังคับ 1:1)
  clo_plo_mappings/{mapping_id}                      ← doc id = "{course_id}_{clo_code}_{plo_code}"

teaching_records/{record_id}                         ← top-level, auto id, curriculum_id/course_id denormalized
evidence/{evidence_id}                               ← top-level, auto id, teaching_record_id/course_id/curriculum_id denormalized
evidence_access_logs/{log_id}                        ← top-level, auto id, append-only
ai_match_results/{match_result_id}                   ← top-level, auto id [ข้อเสนอ — ยังไม่ยืนยัน ดู 2.9]
clo_coverage_summaries/{course_id}_{clo_id}          ← top-level, composite id
syllabus_gap_results/{gap_result_id}                 ← top-level, auto id, append-only
users/{user_id}                                      ← top-level, doc id = Firebase Auth UID
account_approval_logs/{log_id}                       ← top-level, auto id, append-only
notifications/{notification_id}                      ← top-level, auto id (ประวัติสะสม)
```

ไดอะแกรม reference แบบเต็ม (mermaid) อยู่ที่ align-api-schema-design.md §2.4

**2.0.3 ข้อจำกัดจำนวน Security Rules `get()`/`exists()`**: ทุก entity top-level ที่เกี่ยวกับ `evidence` ต้อง denormalize `course_id`/`curriculum_id` ไว้เสมอ (ระบุไว้ต่อ entity ด้านล่าง) เพื่อลดจำนวน `get()` ซ้อนใน Security Rules — ดูตาราง denormalization เต็มที่ align-api-schema-design.md §2.5 และ pseudocode ของ Security Rules เต็มที่ §2.8 (สรุปย่อไว้ที่ §6 ของเอกสารนี้)

**2.0.4 จุดที่ต้องใช้ Firestore Transaction (`runTransaction`) แทน SQL transaction เดิม** (รายละเอียดเต็มที่ align-api-schema-design.md §2.7):

| การกระทำ | Firestore |
|---|---|
| อนุมัติ/ปฏิเสธบัญชี (§2.12, §3 E6) | อ่าน `users/{uid}` → เขียนอัปเดต `account_status`/`approved_by`/`approved_at` + สร้าง document ใหม่ใน `account_approval_logs` ในทรานแซกชันเดียว |
| ยืนยันผล AI แล้ว auto-resolve notification (§2.9, §2.14) | อัปเดต `ai_match_results/{id}.state='confirmed'` → query+เขียน `notifications` ที่ `clo_id`/`is_resolved=false` ตรงกันในทรานแซกชันเดียว |
| สร้างบันทึกการสอน (กฎ #1) | อ่าน `courses/{id}.clo_plo_ready` แล้วเขียน `teaching_records` — ยอมรับความเสี่ยง race ที่เบาบางถ้าไม่ทำเป็น transaction เต็มรูปแบบ (MVP) |
| Soft-delete `plo`/`clo` (§2.2/§2.3) | อ่าน mapping ที่เหลือ → เขียน `is_deleted=true` + re-evaluate `courses/{id}.clo_plo_ready` ในทรานแซกชันเดียว |
| ผูก/ปลด `clo_plo_mapping` (§2.4) | `create()`/`delete()` mapping + re-evaluate `clo_plo_ready` ในทรานแซกชันเดียว |
| ตรวจจับ CLO ไม่มีหลักฐาน สร้าง `notification` (T-042) | transaction query-then-write กัน race/สร้างซ้ำ (§2.14) |

### 2.1 `curriculum` → collection `curricula` (top-level, doc id = `year_code`)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = `year_code` | Firestore บังคับ unique ให้อัตโนมัติ ไม่ต้องมี unique index แยก |
| curriculum_id | string, เก็บซ้ำเท่ากับ document id | รหัสหลักสูตร — ใช้เป็น reference field จาก entity top-level อื่น (`teaching_record`, `notification` ฯลฯ) |
| year_code | enum('2565','2570') | ปีหลักสูตร — ค่าคงที่ 2 ค่าตามสเปค — เท่ากับ document id เสมอ |
| name | string | ชื่อหลักสูตร |
| is_active | boolean | ใช้งานอยู่ปัจจุบันหรือไม่ |

เป็น parent path ของ `plos`, `courses`, `clo_plo_mappings` (subcollection nest ตาม Hybrid hierarchy — §2.0.2)

### 2.2 `plo` → subcollection `curricula/{curriculum_id}/plos` (doc id = `code`)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = `code` (เช่น `"PLO1"`) | Firestore บังคับ unique **ภายใน curriculum เดียวกัน**ให้อัตโนมัติจากโครงสร้าง nest — คนละ curriculum ใช้ `code` ซ้ำกันได้เพราะอยู่คนละ subcollection |
| plo_id | string, เก็บซ้ำเท่ากับ document id | รหัส PLO — reference field ที่ `clo_plo_mapping`/`ai_match_result.linked_plo_ids` ใช้อ้างถึง |
| curriculum_id | string, denormalized จาก parent path | **required, ห้ามแก้ไขหลังสร้าง** (ตรวจที่ Cloud Function — Firestore ไม่มี constraint ห้ามแก้ field ให้อัตโนมัติ) — PLO ต้องอยู่ใต้ curriculum เดียวเสมอ (ซ้ำกับ parent path เพื่อให้ query แบบ `collectionGroup('plos')` กรอง curriculum ได้โดยไม่ต้อง parse path) |
| code | string | เช่น "PLO2" — เท่ากับ document id เสมอ |
| description | text | คำอธิบาย PLO |
| is_deleted | boolean, default `false` | **[ยืนยันแล้ว]** ธง soft-delete — `DELETE /curricula/{year}/plos/{plo_id}` (หัวข้อ 3, E1) เป็น soft-delete เสมอ ไม่ลบ document จริง แม้มี `clo_plo_mapping` ผูกอยู่แล้วก็ตาม เพื่อรักษาความสมบูรณ์ของ mapping/เอกสาร Word ที่เคย export ไปแล้ว (กฎ #4) — ดูรายละเอียดเหตุผลการตัดสินใจที่ align-api-schema-design.md §5.1/§3.2 |
| deleted_at | datetime, nullable | ต้อง not-null คู่กับ `is_deleted = true` |

> **Query rule**: ทุก query ที่ใช้แสดง PLO เป็นตัวเลือกให้ผูก CLO ใหม่ (เช่น dropdown ในหน้าจัดการ CLO–PLO) ต้องกรอง `where('is_deleted','==',false)` เสมอ — PLO ที่ถูก soft-delete แล้วยังคง valid ในข้อมูลย้อนหลัง (mapping เดิม, `ai_match_result.linked_plo_ids` ที่เคย snapshot ไว้) แต่ไม่แสดงเป็นตัวเลือกใหม่ — ถ้าการ soft-delete ทำให้ CLO ใดเหลือ PLO ที่ `is_deleted=false` ผูกอยู่ 0 ข้อ ต้อง re-evaluate `course.clo_plo_ready` ทันทีผ่าน Firestore transaction (กฎ #1, §2.0.4)
>
> **Delete**: `DELETE /curricula/{year}/plos/{plo_id}` เป็น soft-delete เสมอ (`is_deleted=true`, `deleted_at=now()`) ผ่าน Firestore transaction (§2.0.4)

> **Seed data**: ข้อมูลจริงของ `curriculum` (2.1), `plo` (2.2), และ `course` (2.5) สำหรับทั้งสองหลักสูตร (สาขา New Media Communication) มีอยู่แล้วที่ [[../../01-requirements/01-spec/plo-course-master-data|plo-course-master-data]] — ใช้ import เป็นข้อมูลตั้งต้นตอนสร้างระบบจริงได้เลย ไม่ต้องรอผู้บริหารหลักสูตรพิมพ์เข้าไปใหม่ทั้งหมด

### 2.3 `clo` → subcollection `curricula/{curriculum_id}/courses/{course_id}/clos` (doc id = `code`)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = `code` (เช่น `"CLO1"`) | unique **ภายใน course เดียวกัน** โดยอัตโนมัติจากโครงสร้าง nest |
| clo_id | string, เก็บซ้ำเท่ากับ document id | รหัส CLO — reference field จาก `clo_plo_mapping`, `ai_match_result`, `clo_coverage_summary`, `notification` (ทั้งหมดเป็น top-level ที่ไม่ nest ใต้ course) |
| course_id | string, denormalized จาก parent path | รายวิชาที่ CLO นี้สังกัด — required, ห้ามแก้ไขหลังสร้าง (ตรวจที่ Cloud Function) |
| curriculum_id | string, denormalized จาก `course.curriculum_id` | เพื่อให้ query/ตรวจ scope ข้าม curriculum ได้เร็วโดยไม่ต้องไล่ path 2 ชั้น — ต้องตรงกับ curriculum ใน path เสมอ (ตรวจตอนสร้าง) |
| code | string | เช่น "CLO1" — เท่ากับ document id เสมอ |
| description | text | คำอธิบาย CLO |
| is_deleted | boolean, default `false` | **[ยืนยันแล้ว]** ธง soft-delete — `DELETE /courses/{id}/clos/{clo_id}` (หัวข้อ 3, E1) เป็น soft-delete เสมอ ไม่ลบ document จริง แม้มี `ai_match_result` (รวมที่ confirmed แล้ว) อ้างอิงอยู่ก็ตาม — ดูรายละเอียดเหตุผลการตัดสินใจที่ align-api-schema-design.md §5.1/§3.3 |
| deleted_at | datetime, nullable | ต้อง not-null คู่กับ `is_deleted = true` |

> **Query rule**: ไม่แสดง CLO ที่ `is_deleted = true` ในรายการ CLO ของวิชาอีก — หลัง soft-delete ต้อง re-evaluate `course.clo_plo_ready` ทันทีผ่าน Firestore transaction (นับเฉพาะ CLO ที่ `is_deleted = false` ที่มี PLO ผูกอยู่ — กฎ #1) และ `total_clo_count` ใน `clo_coverage_summary` (หัวข้อ 2.10) ต้องนับเฉพาะ CLO ที่ `is_deleted = false` ของวิชานั้น (ฐาน 100% ไม่รวม CLO ที่ถูกลบแล้ว) — คำนวณด้วยการ query `clos` แล้วนับที่ Cloud Function (ไม่มี `COUNT()` ของ SQL ให้ใช้)

### 2.4 `clo_plo_mapping` → subcollection `curricula/{curriculum_id}/clo_plo_mappings` (doc id = `"{course_id}_{clo_code}_{plo_code}"`)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = `"{course_id}_{clo_code}_{plo_code}"` | composite key ทำให้คู่ (clo, plo) unique อัตโนมัติ — เขียนด้วย `create()` (ไม่ใช่ `set()`) เพื่อให้ Firestore ปฏิเสธ write ที่ id ซ้ำ (`ALREADY_EXISTS` = คู่นี้เคยผูกไปแล้ว) |
| mapping_id | string, เก็บซ้ำเท่ากับ document id | รหัส mapping |
| clo_id | string | reference field → `clos` subcollection — **ตรวจที่ Cloud Function ก่อนเขียนว่าอยู่ curriculum เดียวกับ path จริง** (ไม่มี FK บังคับให้อัตโนมัติ) |
| plo_id | string | reference field → `plos` subcollection — ตรวจเช่นเดียวกับ `clo_id` |
| confirmed_by | string (Firebase Auth UID) | ผู้ยืนยันการผูก (อาจารย์) — reference field → `users` |
| created_at | datetime | |

**Constraint สำคัญ (ไม่เปลี่ยนจากฉบับเดิม แต่กลไกบังคับเปลี่ยน)**: `clo_plo_mapping.clo.curriculum_id == clo_plo_mapping.plo.curriculum_id` เสมอ — ห้ามผูก CLO กับ PLO ต่างหลักสูตรกัน (ตรงกฎทางธุรกิจ + AB-03) — เพราะ mapping ถูก nest ใต้ curriculum เดียวกับทั้ง `clo` (ผ่าน `course`) และ `plo` อยู่แล้ว ความเป็นไปได้ที่จะผูกข้าม curriculum แทบเป็นศูนย์ทางโครงสร้าง แต่ Cloud Function ยังต้องตรวจซ้ำอีกชั้นว่า `clo_id` ที่ระบุมาอยู่ภายใต้ curriculum เดียวกันจริง (กัน bug ที่ระบุ id ผิดจาก client)

**Uniqueness**: แก้แล้วด้วย document ID composite ข้างต้น — ผูกซ้ำคู่เดิมจะล้มเหลวอัตโนมัติ ไม่ต้องเขียนโค้ดตรวจซ้ำเพิ่ม

**Delete**: hard-delete document นี้ได้ปกติเมื่อ unlink (`clo_plo_mapping` ไม่ใช่ entity ที่ soft-delete) — backend ต้อง re-evaluate `courses/{id}.clo_plo_ready` ทันทีหลัง unlink ผ่าน Firestore transaction (§2.0.4) — mapping ที่ชี้ไปยัง `plo`/`clo` ที่ถูก soft-delete ภายหลัง ยังคงใช้ตรรกะเดิมทุกประการ (ไม่นับเป็นส่วนหนึ่งของ `clo_plo_ready` อีกต่อไป)

### 2.5 `course` → subcollection `curricula/{curriculum_id}/courses` (doc id = รหัสวิชาจริง)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = รหัสวิชาจริง (เช่น `"127121"`) | unique **ภายใน curriculum เดียวกัน**โดยอัตโนมัติจากโครงสร้าง nest — unique **ทั่วทั้งระบบ** (ข้าม 2 curriculum) ต้องตรวจเพิ่มที่ Cloud Function ด้วย `collectionGroup('courses')` query ก่อน `create()` เสมอ (รหัสวิชาจริงไม่ซ้ำข้าม 2 หลักสูตรตามข้อมูลจริงใน plo-course-master-data.md อยู่แล้ว แต่ Firestore ไม่การันตีให้อัตโนมัติข้าม curriculum) |
| course_id | string, เก็บซ้ำเท่ากับ document id | reference field จาก `teaching_record`, `evidence`, `ai_match_result` ฯลฯ (top-level) |
| curriculum_id | string, denormalized จาก parent path | **บังคับ, ห้ามแก้ไขหลังสร้าง** — ทุกวิชาต้องระบุกลุ่มหลักสูตรก่อนป้อน CLO ได้ (AB-02) |
| code | string | รหัสวิชา — เท่ากับ document id เสมอ |
| name | string | ชื่อวิชา |
| instructor_id | string (Firebase Auth UID) | อาจารย์ผู้สอนหลักของวิชา (ใช้ตรวจสิทธิ์ PDPA) — required, ต้องเป็น `users.role='instructor'` เท่านั้น (ตรวจที่ Cloud Function) — reference field → `users` |
| clo_plo_ready | boolean (computed) | true เมื่อมี CLO ≥1 ที่ผูกกับ PLO ≥1 แล้ว — ใช้เป็นเงื่อนไข gate ก่อนบันทึกการสอน (กฎ #1) — **ไม่ใช่ input ตรง** คำนวณจาก query `clo_plo_mappings` ที่มี `clo_id` อยู่ในเซตของ `clos` ภายใต้ course นี้ (ไม่มี `COUNT()` ให้ใช้ ต้อง query แล้วนับที่ Cloud Function หรือเก็บเป็น counter field ที่ maintain เอง) |

เป็น parent path ของ `clos`, `syllabus` (subcollection) — หมายเหตุ: `GET /me/courses` (§3, E1) ของอาจารย์ที่สอนทั้ง 2 หลักสูตรพร้อมกัน ต้องใช้ `collectionGroup('courses')` query กรอง `instructor_id` แทนการอ่านผ่าน subcollection path เดียว

### 2.6 `syllabus` → single document `curricula/{curriculum_id}/courses/{course_id}/syllabus/main`
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | ค่าคงที่ `"main"` เสมอ | บังคับ 1:1 โดยโครงสร้าง (มี slot เดียวต่อ course หนึ่งวิชา ไม่ต้องมี unique index) |
| syllabus_id | string, เก็บซ้ำเท่ากับ `course_id` (1:1) | ไม่มี `curriculum_id`/`course_id` แยกเป็น field ที่ต้องตรวจ FK เพราะสืบทอด scope กลุ่มหลักสูตร (2565/2570) จาก parent path โดยตรงอยู่แล้ว (เข้ากับหมายเหตุคุมเอกสารด้านบน ห้าม query ข้าม curriculum) |
| content | JSON/array ของ `{week_no, topic, detail}` | **[ยืนยันแล้ว]** หัวข้อที่วางแผนสอนแต่ละสัปดาห์แบบสั้นๆ (ไม่ใช่เนื้อหาเต็มของ syllabus) — อาจารย์กรอกเองแยกจากไฟล์ทางการ เพื่อให้ AI gap analysis (§4.3, AB-22) เทียบกับ `teaching_record` ได้จริง — Firestore เก็บ array-of-map field ได้โดยตรงในเอกสารเดียว (ไม่ต้องแยก subcollection ถ้าจำนวนสัปดาห์ไม่เกินขีดจำกัดขนาด document 1 MiB — เพียงพอสำหรับ syllabus 1 ภาคเรียน) — required เมื่อใช้เป็น input gap analysis (ไม่บังคับตอนสร้างครั้งแรก) |
| origin_file_ref | string (Firebase Cloud Storage path), **บังคับ** | **[ยืนยันแล้ว]** ตัวชี้ไฟล์ syllabus ทางการที่อัปโหลด — สาขากำหนดให้ต้องมีไฟล์นี้เก็บไว้เป็นหลักฐานอ้างอิง ระบบ**ไม่แยกวิเคราะห์เนื้อหาไฟล์นี้อัตโนมัติ** (ไม่ parse) — ส่วนการเทียบ gap อัตโนมัติทั้งหมดใช้ `content` (ด้านบน) เป็น input — เก็บใน Firebase Cloud Storage เดียวกันกับ evidence แต่เป็น pointer แยก — syllabus ไม่ใช่ชิ้นงานนักศึกษา จึงไม่ต้องมี flag PII เหมือน `evidence` |
| updated_by | string (Firebase Auth UID) | อาจารย์ผู้แก้ไขล่าสุด — reference field → `users` |
| updated_at | datetime | เวลาที่แก้ไข/อัปเดตล่าสุด — รองรับ AB-19 ที่อนุญาตแก้ไข syllabus เมื่อแผนการสอนเปลี่ยน (เก็บเป็น update-in-place ไม่ทำ version history) |

> **Accepted Risk (ตัดสินใจแล้ว — update-in-place ไม่มี version history)**: ไม่เปลี่ยนแปลงจากฉบับเดิม — ถ้าอาจารย์แก้ไข `syllabus.content` กลางภาคการศึกษา ผลวิเคราะห์ gap ย้อนหลัง (`syllabus_gap_result` ของ `teaching_record` ที่บันทึกไว้ก่อนแก้ไข) จะถูกคำนวณ/แสดงผลโดยเทียบกับ **syllabus เวอร์ชันปัจจุบัน (ล่าสุด) เสมอ** ไม่ใช่เวอร์ชัน ณ ช่วงเวลาที่สอนจริง — ยอมรับความเสี่ยงนี้เพราะสเปคไม่ได้กำหนดให้ต้องมี version history (ดู [[../../01-requirements/03-task/task-breakdown|task-breakdown]] T-067)

### 2.7 `teaching_record` → top-level collection `teaching_records`
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | auto-generated | ไม่มี natural key ที่เหมาะสม (หลายบันทึกต่อวิชา/สัปดาห์ได้) |
| record_id | string, เก็บซ้ำเท่ากับ document id | reference field จาก `evidence`, `ai_match_result` |
| course_id | string | reference field → `courses` subcollection (ต้องรู้ `curriculum_id` ด้วยเพื่อประกอบ path เต็มตอนอ่าน `course`) — ต้องเป็นวิชาที่ `clo_plo_ready = true` เท่านั้น — Cloud Function ต้องปฏิเสธ (409) การสร้างถ้า `courses/{course_id}.clo_plo_ready = false` (บังคับที่ backend ก่อน insert ตามกฎ #1 — ไม่มี DB constraint ให้พึ่งเหมือนฉบับ SQL เดิม) |
| curriculum_id | string, **denormalized เพิ่มใหม่** จาก `course.curriculum_id` | เพื่อ query/ตรวจ scope ได้โดยไม่ต้องอ่าน `course` document ซ้อน — ใช้ใน Security Rules และ query ระดับหลักสูตรใน E4 |
| topic | string | หัวข้อการสอน (ใช้ทำแผนที่ CLO×สัปดาห์ และเทียบกับ `syllabus.content` สำหรับ gap analysis) |
| week_no | int | สัปดาห์ที่สอน |
| taught_at | date | วันที่สอนจริง (ไม่ใช่แผนล่วงหน้า) — ค่าเริ่มต้น = วันนี้ ไม่รับวันที่ในอนาคต (validate ที่ Cloud Function) |
| created_by | string (Firebase Auth UID) | อาจารย์ผู้บันทึก — required, ต้องเป็น `instructor_id` เดียวกับ `course.instructor_id` — reference field → `users` |
| status | enum('draft_ai_pending','confirmed') | สถานะยืนยันผล AI — default `draft_ai_pending` |
| is_deleted | boolean, default `false` | **[ยืนยันแล้ว]** ธง soft-delete — บันทึกการสอนที่เคยถูกใช้คำนวณ `ai_match_result`/ปรากฏในเอกสาร Word ที่ export ไปแล้วยังคง valid ครบถ้วนตามกฎ #4 แม้อาจารย์ "ลบ" ออกจากหน้าจอที่ใช้งานอยู่ก็ตาม — ดูรายละเอียดที่ align-api-schema-design.md §5.1/§3.7 |
| deleted_at | datetime, nullable | ต้อง not-null คู่กับ `is_deleted = true` |

> **Query rule**: แผนที่ CLO×สัปดาห์ (หัวข้อ 3, E4) และ `clo_coverage_summary` (หัวข้อ 2.10) ต้องกรอง `where('is_deleted','==',false)` ก่อนคำนวณ/แสดงผลเสมอ เพื่อไม่ให้บันทึกที่ "ลบ" แล้วยังถูกนับเป็นข้อมูลปัจจุบัน — เอกสาร Word ที่เคย export ไปแล้วยังอ้างอิงข้อมูลเดิมได้ครบ (ไม่กระทบย้อนหลัง)

### 2.8 `evidence` → top-level collection `evidence`
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | auto-generated | เป้าหมาย reference จาก `evidence_access_log` |
| evidence_id | string, เก็บซ้ำเท่ากับ document id | |
| teaching_record_id | string | reference field → `teaching_records` — แนบได้หลายไฟล์ต่อ 1 บันทึกการสอน (AB-06) |
| course_id, curriculum_id | string, **denormalized เพิ่มใหม่** จาก `teaching_record` | ลด `get()` ซ้อนใน Security Rules และรองรับ `GET /admin/evidence-access-log` (§4.5) โดยตรง |
| file_ref | string (Firebase Cloud Storage path) | ตัวชี้ไฟล์ใน Firebase Cloud Storage — ควบคุมสิทธิ์ตาม PDPA ผ่าน Storage Security Rules คู่ขนานกับ Firestore Security Rules — ไม่เก็บไฟล์จริงใน Firestore document |
| file_name | string | |
| uploaded_by | string (Firebase Auth UID) | reference field → `users` |
| uploaded_at | datetime | |
| contains_student_pii | boolean (default true, ระมัดระวังไว้ก่อน) | ใช้เป็น flag ประกอบการควบคุมสิทธิ์ PDPA |
| is_deleted | boolean, default `false` | **[ยืนยันแล้ว]** ธง soft-delete — สำคัญที่สุดในบรรดา entity ที่ soft-delete เพราะเป็น "หลักฐานจริง" ตามกฎ #4 โดยตรง — สิทธิ์เข้าถึง (หัวข้อ 2.13) ยังคงบังคับใช้เหมือนเดิมแม้ `is_deleted = true` แล้ว — ดูรายละเอียดที่ align-api-schema-design.md §5.1/§3.8 |
| deleted_at | datetime, nullable | ต้อง not-null คู่กับ `is_deleted = true` |

> **Query rule**: หน้าจอ Evidence Attachment List และรายการหลักฐานที่ใช้สร้างเอกสาร export ต้องกรอง `where('is_deleted','==',false)` เสมอ — การลบไฟล์จริงออกจาก Firebase Cloud Storage เป็นรายละเอียดเชิง implementation แยกต่างหาก (เช่น scheduled Cloud Function ลบไฟล์จริงหลังพ้นระยะเวลาที่กำหนด) ไม่ใช่ส่วนหนึ่งของ schema เชิงแนวคิดนี้
>
> **Access control**: ตรวจที่ Cloud Function ทุกครั้งที่ return ไฟล์/signed URL **และ** ที่ Firebase Cloud Storage Security Rules คู่ขนาน (สอง defense-in-depth: Firestore document metadata + Storage object เอง) — ดูหัวข้อ 2.13/§6

### 2.9 `ai_match_result` → top-level collection `ai_match_results` (ผลจับคู่ CLO/PLO ต่อบันทึกการสอน 1 รายการ — draft/confirmed)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | **auto-generated [ข้อเสนอ — ยังไม่ยืนยัน]** | ทางเลือกอื่นที่ยังไม่ปิด: composite `"{teaching_record_id}_{clo_id}"` (เสี่ยงเขียนทับผล confirmed ถ้า AI รันซ้ำ) หรือ hybrid (composite ระหว่าง draft แล้วเปลี่ยนเป็น auto-id ตอน confirm) — เอกสารนี้ใช้ auto-generated เป็น default เพราะปลอดภัยที่สุดต่อข้อมูลที่ confirmed แล้ว รายละเอียดข้อดี-ข้อเสียครบทั้ง 3 ทางเลือกอยู่ที่ align-api-schema-design.md §5.7 — **ห้ามถือว่าเป็นการตัดสินใจสุดท้าย** |
| match_result_id | string, เก็บซ้ำเท่ากับ document id | |
| teaching_record_id | string | reference field → `teaching_records` |
| course_id, curriculum_id | string, **denormalized เพิ่มใหม่** | จาก `teaching_record` |
| clo_id | string | reference field → `clos` (nested subcollection — ต้องรู้ `course_id`/`curriculum_id` ประกอบ path เต็มตอนอ่าน) — ต้องอยู่ curriculum เดียวกับ course ของ teaching_record — Cloud Function ตรวจก่อนเขียนเสมอ (ป้องกันข้ามหลักสูตร ตาม AB-08 — ไม่มี FK บังคับอัตโนมัติ) |
| match_confidence | decimal | ค่าความมั่นใจ/ความตรงที่ AI คำนวณสำหรับการจับคู่ **รายบันทึกการสอนนี้กับ CLO ข้อนี้โดยเฉพาะ** — เป็นสัญญาณเชิงเทคนิคภายใน **ไม่ใช่** ค่า "% ความสอดคล้อง" ระดับวิชาที่แสดงต่ออาจารย์ (ค่านั้นคำนวณจากสูตรใหม่ในหัวข้อ 2.10/4.2) |
| linked_plo_ids | array of string (denormalized) | PLO ที่เชื่อมต่อจาก CLO นี้ (อยู่ curriculum เดียวกันเท่านั้น) — ค่าเริ่มต้นดึงจาก `clo_plo_mapping` ปัจจุบันตอนสร้าง (`state=draft`) และแก้ไขได้ระหว่างที่ยังเป็น `draft`/`edited` แต่ **[ยืนยันแล้ว — snapshot ถาวรทันทีที่ `state` เปลี่ยนเป็น `confirmed`]** ห้ามเปลี่ยนแปลงอีกเลยหลังจากนั้น (Firestore array field เก็บ string list ได้ตรงไปตรงมา ดู align-api-schema-design.md §5.3) |
| state | enum('draft','edited','confirmed','rejected') | **draft** = ผลตั้งต้นจาก AI ยังไม่ผ่านตรวจ; **edited** = อาจารย์แก้ไข match confidence/ปลด CLO ก่อนยืนยัน; **confirmed** = ยืนยันแล้ว ใช้เป็นข้อมูลจริง; **rejected** = อาจารย์ปฏิเสธผลจับคู่นี้ ไม่ถูกนับ — **Draft-Confirmed: ฟิลด์ state หลัก พลาดไม่ได้ตามกฎ #3** |
| confirmed_by | string (Firebase Auth UID), nullable | ต้อง not-null เมื่อ `state=confirmed` — ตรวจที่ Cloud Function ว่าเป็น instructor เจ้าของวิชาเท่านั้น — reference field → `users` |
| confirmed_at | datetime, nullable | คู่กับ `confirmed_by` |

**กฎสำคัญ:** เฉพาะระเบียนที่ `state = 'confirmed'` เท่านั้นที่ถูกนำไปนับเป็น "การแมทช์" ของ CLO นั้นในการคำนวณ 2.10 (สัดส่วน % ระดับวิชา + ความถี่ที่แมทช์), แผนที่ CLO×สัปดาห์, และเอกสาร Word export — draft ที่ยังไม่ยืนยันจะไม่ถูกนับเป็นหลักฐานจริง (กฎ #3, #4)

### 2.10 `clo_coverage_summary` → top-level collection `clo_coverage_summaries` (doc id = `"{course_id}_{clo_id}"`, สรุปสัดส่วน % ความสอดคล้อง + ความถี่ที่แมทช์ระดับวิชา — คำนวณ/derived)
เอนทิตีนี้เป็นค่าที่ **คำนวณ** จาก `ai_match_result` ที่ `state = 'confirmed'` เท่านั้น (recompute เป็นระยะโดย Cloud Function trigger จากการ write ของ `ai_match_results`/`teaching_records`/`clos` ที่เกี่ยวข้อง หรือ query สดตอนอ่านก็ได้ — เอกสารนี้ไม่ฟันธงวิธี — ระวัง infinite trigger loop ถ้าใช้ on-write trigger) ตามสูตรใน AB-20/AB-21:

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = `"{course_id}_{clo_id}"` | composite key — Firestore การันตี 1 document ต่อคู่ course+clo โดยอัตโนมัติ (ตรงกับที่ระบุว่า "ไม่มี PK ของตัวเองแยกต่างหาก") |
| course_id | string | ขอบเขตการคำนวณ = รายวิชา |
| clo_id | string | ต้องอยู่ curriculum เดียวกับ course (สืบทอดจาก 2.3) |
| curriculum_id | string, **denormalized เพิ่มใหม่** | จาก `course.curriculum_id` — สำหรับ `GET /curricula/{year}/dashboard` (E4) |
| total_clo_count | int | จำนวน CLO ทั้งหมดที่ผูกกับรายวิชานี้ (ฐาน 100% ตาม AB-20) — เท่ากันทุก document ของ course เดียวกัน — คำนวณด้วยการ query `clos` (นับเฉพาะ `is_deleted=false`) แล้วเขียนกลับ (ไม่มี `COUNT()` ของ SQL ให้พึ่ง) |
| total_teaching_record_count | int | จำนวน `teaching_record` ทั้งหมดของรายวิชานี้ (นับสะสมตลอดที่มี `teaching_record` อยู่ในระบบสำหรับ `course_id` นี้ ไม่แยก/ไม่ reset ตามภาคการศึกษา) — เป็นตัวหารของสูตร % ความถี่ที่แมทช์ (AB-21) — นับจาก query `teaching_records` ที่ `is_deleted=false` ของ course นี้ |
| match_frequency | int | จำนวนครั้งที่มี `teaching_record` ตรงกับ CLO ข้อนี้ นับเฉพาะรายการที่ `ai_match_result.state='confirmed'` — นับสะสมตลอดที่มี `teaching_record` อยู่ในระบบสำหรับวิชานั้น (AB-21) — เป็นตัวเศษ (numerator) ของสูตร % ความถี่ที่แมทช์ |
| match_frequency_percent (derived) | decimal | **[ยืนยันแล้ว 2026-08-20]** = (`match_frequency` ÷ `total_teaching_record_count`) × 100 — เมื่อ `total_teaching_record_count=0` แสดง "ไม่มีข้อมูล" — ต้อง**แสดงคู่กัน**กับจำนวนครั้งดิบ (`match_frequency`) เสมอ **ไม่ใช่สูตรรวม**กับ `coverage_percent` เป็นตัวเลขเดียว — ยังไม่มี threshold ตัวเลขว่าเท่าไรถือว่า "เพียงพอ" |
| is_matched (derived) | boolean | `true` เมื่อ `match_frequency > 0` — ใช้เป็นตัวนับ CLO ที่ "แมทช์ได้จริง" ในสัดส่วนของวิชา |
| coverage_percent (ระดับวิชา, derived) | decimal | = (จำนวน CLO ที่ `is_matched=true` ÷ `total_clo_count`) × 100 — นี่คือค่า "% ความสอดคล้อง" ตัวที่แสดงในแดชบอร์ด/เอกสาร (ไม่ใช่ `match_confidence` ใน 2.9) — คนละค่ากับ `match_frequency_percent` ข้างต้น |

> **[ยืนยันแล้ว 2026-08-20] นิยาม "ความถี่ที่แมทช์" (match frequency, AB-21):** ไม่เปลี่ยนแปลง — ดูรายละเอียดเต็มที่หัวข้อ 4.2 และ `test-plan-align.md` §6.1

### 2.11 `syllabus_gap_result` → top-level collection `syllabus_gap_results` (append-only, ผลวิเคราะห์ gap เทียบ course syllabus — draft/confirmed, แยกจาก ai_match_result)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | auto-generated | append-only — ห้าม update/ลบ document นี้ไม่ว่ากรณีใด (ทุกรอบที่รัน gap analysis สร้าง document ใหม่เสมอ) |
| gap_result_id | string, เก็บซ้ำเท่ากับ document id | |
| course_id | string | reference field → `courses` (nested subcollection — ต้องรู้ `curriculum_id` ประกอบ path เต็มตอนอ่าน) |
| curriculum_id | string, **denormalized เพิ่มใหม่** จาก `course.curriculum_id` | ใช้กรอง scope หลักสูตรโดยไม่ต้องอ่าน `course` document ซ้อน |
| syllabus_id | string | reference field → `syllabus/main` ของ course เดียวกัน (= `course_id` เสมอ เพราะ syllabus เป็น 1:1 กับ course) |
| missing_topics | array of struct | หัวข้อใน `syllabus.content` ที่ยังไม่พบ `teaching_record` รองรับ (AB-22) |
| extra_topics | array of struct | หัวข้อที่มี `teaching_record` บันทึกจริง แต่ไม่พบใน `syllabus.content` (เนื้อหาที่สอนเพิ่มนอกแผน) |
| generated_at | datetime | เวลาที่ AI ประมวลผลรอบนี้ — วิเคราะห์จาก `teaching_record` ที่มีอยู่ ณ เวลานั้น — **[ยืนยันแล้ว]** เก็บทุกรอบที่รัน gap analysis เป็นประวัติ ไม่ overwrite ผลรอบเก่า (ทุกครั้งที่รันใหม่ เช่น หลังบันทึกการสอนเพิ่มหรือแก้ syllabus จะสร้าง document ใหม่เสมอด้วย `add()`/auto-id แถวเก่ายังคงอยู่ในฐานข้อมูลตลอดไปเป็นประวัติ) — ใช้ `generated_at` นี้เป็นตัวระบุลำดับเวลาหา document "ล่าสุด" |
| state | enum('draft','edited','confirmed','rejected') | รูปแบบเดียวกับ `ai_match_result` (2.9) — **draft** = ผลตั้งต้นจาก AI; **edited** = อาจารย์แก้ไขรายการหัวข้อที่ขาด/เกินก่อนยืนยัน; **confirmed** = ยืนยันแล้ว ใช้เป็นข้อมูลจริงในแดชบอร์ด/เอกสาร; **rejected** = ปฏิเสธผลรอบนี้ — **Draft-Confirmed: พลาดไม่ได้ตามกฎ #3** |
| confirmed_by | string (Firebase Auth UID), nullable | ต้อง not-null เมื่อ `state = 'confirmed'` — reference field → `users` |
| confirmed_at | datetime, nullable | คู่กับ `confirmed_by` |

**กฎสำคัญ:** เช่นเดียวกับ `ai_match_result` — เฉพาะ `state = 'confirmed'` เท่านั้นที่ถูกใช้ในแดชบอร์ด (AB-23) และเอกสาร Word export (Area of Improvement, AB-16); เป็นผลวิเคราะห์ **แยก** จากการจับคู่ CLO/PLO โดยสิ้นเชิง (กฎ #3, ตาม AB-10/AB-22)

**Indexing เชิงแนวคิด**: composite index บน `(course_id, generated_at DESC)` **จำเป็นเสมอ** ก่อน deploy จริง (Firestore ปฏิเสธ query ที่ไม่มี index รองรับ ไม่ใช่แค่ optimizer เลือกเองแบบ SQL) — ใช้ query `where('course_id','==',id).orderBy('generated_at','desc').limit(1)` เพื่อดึงเฉพาะรอบล่าสุด (ดู align-api-schema-design.md §3.11, §4.3)

### 2.12 `user` → collection `users` (top-level, doc id = Firebase Auth UID)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | = Firebase Authentication UID | ผูกกับ identity provider โดยตรง — ทำให้ Security Rules อ้าง `request.auth.uid` แล้ว lookup `users/{uid}` ได้ทันทีโดยไม่ต้อง query หา |
| user_id | string, เก็บซ้ำเท่ากับ document id (= UID) | reference field จากแทบทุก entity ที่เกี่ยวกับผู้ใช้ (`created_by`, `confirmed_by`, `instructor_id`, `approved_by` ฯลฯ) |
| name / email | string | `email` unique บังคับโดย **Firebase Authentication เอง** (ปฏิเสธสมัครซ้ำที่ชั้น auth provider ก่อนถึง Firestore ด้วยซ้ำ) — ไม่ต้องมี unique index ใน Firestore |
| password_hash | *(ไม่เก็บใน Firestore อีกต่อไป)* | **[ยืนยันแล้ว]** Firebase Authentication จัดการ credential เอง (hash/verify รหัสผ่าน) ทั้งหมด — อาจารย์ยังคงตั้งรหัสผ่านเองตอนสมัครสมาชิกผ่าน E6 (`POST /auth/register`) เหมือนเดิมทุกประการ เปลี่ยนแค่ว่าไม่มี field นี้ใน `users` document อีกต่อไป |
| role | enum('instructor','program_admin') | 2 บทบาทตามสเปค — `program_admin` คือผู้บริหารหลักสูตร (Program Administrator) อาจารย์ที่รับผิดชอบหลักสูตร ประสานหลักสูตร และจัดทำรายงานประเมินตนเอง (SAR) — บัญชีที่สมัครเองผ่าน E6 (`POST /auth/register`) ได้ `role = 'instructor'` เสมอ เพราะสเปค (E6) ระบุว่าเฉพาะอาจารย์ผู้สอนเท่านั้นที่สมัครใช้งานเองได้ — **[ยืนยันแล้ว]** บัญชี `role = 'program_admin'` ชุดแรก (และบัญชีเพิ่มเติมในอนาคตถ้าต้องการ) สร้างผ่าน **seed script/ข้อมูลเริ่มต้นตอน deploy ระบบเท่านั้น** ไม่มี endpoint ใดในระบบ ALIGN ที่ให้สร้างบัญชีบทบาทนี้โดยตรง (ไม่ใช่ผ่าน UI ในระบบ และไม่ใช่ผ่าน `POST /auth/register` ซึ่งสร้างได้แต่ `role = 'instructor'` ตามที่ระบุข้างต้น) — ห้ามเพิ่มค่า `qa` หรือค่าอื่นใด (Out of Scope) |
| account_status | enum('pending','approved','rejected') | **ใหม่ตาม E6/กฎทางธุรกิจ #6** — สถานะบัญชี: `pending` = "รออนุมัติ" (ค่าเริ่มต้นทันทีที่สมัครสำเร็จผ่าน `POST /auth/register`, AB-24), `approved` = "อนุมัติแล้ว" (เข้าใช้งานฟีเจอร์อื่น E1–E5 ได้ตามสิทธิ์บทบาท, AB-26), `rejected` = "ถูกปฏิเสธ" (เข้าถึงข้อมูล/ฟีเจอร์ใดๆ ของระบบไม่ได้เช่นเดียวกับ `pending`, AB-25/AB-26) — gate การเข้าถึงทุก endpoint ที่ต้อง login ผ่านการตรวจที่ **Cloud Function ทุกครั้งที่เรียก** (Security Rules helper `isApproved()` ที่ §6 เป็น defense-in-depth ชั้นที่สองเท่านั้น) — ดูหมายเหตุบังคับใช้ด้านล่างตาราง |
| approved_by | string (Firebase Auth UID), nullable | ผู้บริหารหลักสูตร (`program_admin`) ที่กดอนุมัติ/ปฏิเสธบัญชีนี้ครั้งล่าสุด — ต้อง not-null เมื่อ `account_status != 'pending'` (audit trail ตาม AB-26) — reference field → `users` (self-referencing) |
| approved_at | datetime, nullable | เวลาที่อนุมัติ/ปฏิเสธครั้งล่าสุด — ต้อง not-null คู่กับ `approved_by` |
| rejection_reason | text, nullable, ไม่บังคับกรอก | **[ยืนยันแล้ว]** เหตุผลที่ปฏิเสธบัญชี — ไม่บังคับกรอก เพราะเหตุผลปฏิเสธในทางปฏิบัติมีเพียงกรณีเดียวคือ "ไม่ใช่อาจารย์ผู้สอนของสาขา" คงฟิลด์นี้ไว้เป็น nullable เผื่อผู้บริหารหลักสูตรต้องการระบุรายละเอียดเพิ่มเติม แต่ backend ไม่ validate ว่าต้องมีค่า |
| program_admin_curriculum_scope | array of string (curriculum_id), nullable | สำหรับ `program_admin` (ผู้บริหารหลักสูตร) — ระบุว่าดูแลหลักสูตรกลุ่มใด (reference field แบบ array ไม่ใช่ FK[] บังคับ — แต่ละค่าไม่ถูกตรวจการมีอยู่จริงอัตโนมัติ ต้องตรวจที่ Cloud Function ถ้าจำเป็น) ใช้จำกัด scope การเข้าถึงข้อมูล/หลักฐานข้ามหลักสูตร — Security Rules อ่าน array นี้ตรงได้ด้วย `in` operator |
| created_at | datetime | **denormalized เพิ่มใหม่** — เวลาที่สร้างบัญชี |
| is_deleted | boolean, default `false` | **[ยืนยันแล้ว]** ธง soft-delete — ใช้เมื่ออาจารย์/ผู้บริหารหลักสูตรพ้นสภาพ (เช่น ลาออก) แยกจาก `account_status` โดยสิ้นเชิง (`account_status` คือสถานะการอนุมัติใช้งาน E1–E5, `is_deleted` คือบัญชีถูกปิดใช้งานถาวรแล้ว) — ดูรายละเอียดที่ align-api-schema-design.md §5.1/§3.12 |
| deleted_at | datetime, nullable | ต้อง not-null คู่กับ `is_deleted = true` |

> **หมายเหตุบังคับเพิ่มเติม — กลไกตรวจ `is_deleted` ของ `user`:** บัญชีที่ `is_deleted = true` ต้อง**ถูกปฏิเสธการ login/ทุก request ทันที** เสมือนเป็นอีกเงื่อนไข gate หนึ่งที่ประตูควบคุมสิทธิ์ต้องตรวจคู่กับ `account_status = 'approved'` (เพิ่มเติมจากหมายเหตุบังคับกฎ #6 ด้านล่าง) — บัญชีที่ `is_deleted = true` ต้องเข้าถึงอะไรไม่ได้เลยไม่ว่า `account_status` จะเป็นค่าใด — ข้อมูลที่บัญชีนี้เคยสร้าง/ยืนยันไว้ (`teaching_record.created_by`, `ai_match_result.confirmed_by` ฯลฯ) ยังคง valid ครบถ้วนตามกฎ #4 ไม่ได้รับผลกระทบ เพราะ reference field เหล่านั้นยังคงเก็บค่า `user_id` เดิมไว้ครบ (Firestore ไม่มี FK บังคับที่ลบ/แก้ reference ให้อัตโนมัติเมื่อ `user` document ถูก soft-delete — ต่างจาก SQL เดิมที่อาจมี cascade/`ON DELETE` policy แต่ที่นี่ค่าที่เก็บไว้เดิมไม่หายไปเองเช่นกัน เพียงแต่ไม่มีการตรวจการมีอยู่จริงอัตโนมัติ) — **ช่องว่างที่ยังไม่มีนิยาม**: ปัจจุบันยังไม่มี endpoint ที่ให้ deactivate/soft-delete บัญชี user โดยตรงทั้งในเอกสารนี้และ align-api-schema-design.md (มีแต่ field/กลไก แต่ยังไม่มี `DELETE`/`POST .../deactivate` ที่เรียกใช้จริง) ต้องออกแบบเพิ่มเมื่อ backlog ระบุ flow การ deactivate บัญชีชัดเจน
>
> **ข้อควรระวังเพิ่มเติมเฉพาะ Firestore — revoke session**: ถ้า soft-delete บัญชี (`is_deleted=true`) ต้องเรียก `revokeRefreshTokens()` ของ Firebase Admin SDK **คู่กับ**การ set `is_deleted=true` เสมอ — เพราะ Firestore Security Rules ประเมินค่า `is_deleted` ใหม่ทุกครั้งที่มี request ก็จริง แต่ Firebase Authentication session/JWT ที่ออกไปแล้วยังคง valid จนกว่าจะหมดอายุเองหรือถูก revoke แบบ explicit — ไม่ทำเช่นนี้จะทำให้ session เก่ายังเรียก endpoint ต่อได้จนกว่า token จะหมดอายุเอง (รายละเอียดนี้ไม่มีในฉบับ SQL เดิมเพราะ session ผูกกับ DB โดยตรงกว่า — ดู align-api-schema-design.md §3.12)

> **[ยืนยันแล้ว] ฟิลด์ฟอร์มสมัครสมาชิก:** `name`, `email`, `password` เท่านั้น — **ไม่มีฟิลด์ `department`** เพราะระบบ ALIGN ทั้งระบบให้บริการเฉพาะสาขา New Media Communication สาขาเดียว (ดู [[../../CLAUDE.md|CLAUDE.md]] และ [[../01-requirements/01-spec/plo-course-master-data|plo-course-master-data]]) การระบุสังกัดจึงไม่มีความหมาย/ไม่จำเป็น หลังสมัครสำเร็จ อาจารย์เลือกวิชาที่สอน → อัปโหลดไฟล์ syllabus ทางการ + กรอกหัวข้อที่วางแผนสอนแต่ละสัปดาห์ → กรอก CLO/ผูก PLO → กรอกข้อมูลการสอนจริงแต่ละสัปดาห์ (ลำดับตาม E1/E2 ที่มีอยู่แล้ว) ต้นแบบ `M-SignUp.dc.html` และ `align-app-screens.md` ได้อัปเดตให้สอดคล้องกับการยืนยันนี้แล้ว (2026-08-20) — ฟอร์มสมัครสมาชิกในต้นแบบมีเฉพาะ ชื่อ-นามสกุล/อีเมลสถาบัน/รหัสผ่าน/ยืนยันรหัสผ่าน ไม่มีฟิลด์ department/สังกัดหลงเหลืออยู่อีกต่อไป

> **หมายเหตุบังคับ — กลไกที่ทำให้กฎทางธุรกิจ #6 มีผลจริง (จุดที่ audit พบว่าขาดไปก่อนหน้านี้):** การมีฟิลด์ `account_status` เพียงอย่างเดียวไม่พอ — **ทุก endpoint ที่ต้อง authenticate (ต้อง login) ในระบบ ต้องตรวจสอบ `user.account_status == 'approved'` ก่อนดำเนินการเสมอทุกครั้งที่เรียก** ไม่ใช่ตรวจครั้งเดียวตอน login (ตาม AB-25 ที่ระบุชัดว่าต้องตรวจทุกครั้งที่ร้องขอ ไม่ใช่แค่ตอน login) มิฉะนั้นบัญชีที่ยังไม่ได้รับอนุมัติจะยังคงเรียก endpoint อื่นได้อยู่ดีแม้มีฟิลด์นี้ในฐานข้อมูล — **ยกเว้นเฉพาะ 2 endpoint เท่านั้น** ที่ไม่ต้องผ่านการตรวจนี้: (1) `POST /auth/register` (สมัครสมาชิก — ยังไม่มีบัญชีให้ตรวจ) และ (2) `GET /auth/me/account-status` (เช็คสถานะบัญชีตนเอง — บัญชีที่ยัง `pending`/`rejected` ต้องเรียกดูสถานะตนเองได้ตาม AB-27) ดู endpoint ทั้งหมดที่ §3 (E6) และการตรวจสิทธิ์ตามบทบาท/PDPA ที่ §2.13/§6 ซึ่งต้องรัน**ต่อจาก**การตรวจ `account_status` นี้เสมอ ไม่ใช่แทนกัน

> **หมายเหตุ — QA ไม่ใช่ role/entity ในระบบนี้:** งานประกันคุณภาพ (QA) **ไม่มี** account และ**ไม่ปรากฏ**เป็นค่าใน `role` enum ข้างต้น QA ไม่เคย login เข้าระบบ ALIGN โดยตรง — ได้รับเฉพาะเอกสาร Word ที่ `program_admin` ดาวน์โหลดจากระบบ (ดู E5 หัวข้อ 3) แล้วส่งต่อให้ QA ใช้ตรวจสอบภายนอกระบบเท่านั้น ห้ามเพิ่ม `qa` เป็นค่าใน enum หรือออกแบบ schema/endpoint ใดๆ ให้ QA เข้าถึงระบบ (ตามข้อ Out of Scope ในสเปค)

**Indexing เชิงแนวคิด**: composite index บน `(account_status)`, `(role)`, `(is_deleted)`, `(role, account_status)` (คิวอนุมัติกรองทั้งสองพร้อมกัน)

### 2.13 `evidence_access_log` → top-level collection `evidence_access_logs` (Access-control / PDPA ผูกกับ evidence)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | auto-generated | append-only — ไม่มีเหตุผลทางธุรกิจให้แก้ไข/ลบ |
| log_id | string, เก็บซ้ำเท่ากับ document id | |
| evidence_id | string | reference field → `evidence` |
| course_id, curriculum_id | string, **denormalized เพิ่มใหม่** จาก `evidence` | ให้ `GET /admin/evidence-access-log` (หัวข้อ 3, E5) และ Security Rules ตรวจ scope ของ log ได้โดยไม่ต้อง `get()` ซ้อนผ่าน `evidence` ก่อน |
| accessed_by | string (Firebase Auth UID) | reference field → `users` — บันทึกทุกครั้งที่มีการเรียกดู/ดาวน์โหลดไฟล์หลักฐาน (ตาม AB-07) |
| accessed_at | datetime | |
| action | enum('view','download') | |

> **กติกาสิทธิ์**: ผู้เข้าถึง `evidence` ได้ต้องเป็น (ก) `instructor_id` ของ course ที่ teaching_record นั้นสังกัด หรือ (ข) ผู้ใช้ role `program_admin` ที่มี `curriculum_id` ของ course นั้นอยู่ใน `program_admin_curriculum_scope` เท่านั้น — ตรวจที่ **Cloud Function ก่อนเสมอ** ทุก endpoint ที่ return ไฟล์/URL ของ evidence (ดูหัวข้อ 3) **และ** ที่ Firebase Cloud Storage Security Rules คู่ขนาน (สอง defense-in-depth เช่นเดียวกับ `evidence` เอง — ดูหัวข้อ 2.8/§6)

**Retention**: write-only, append-only — ไม่มีเหตุผลทางธุรกิจให้แก้ไข/ลบ

**Indexing เชิงแนวคิด**: composite index บน `(evidence_id)`, `(accessed_by)`, `(curriculum_id, accessed_at DESC)` (หน้าจอ Evidence Access Log ของผู้บริหารหลักสูตรกรองตามช่วงวันที่ + curriculum scope)

### 2.14 `notification` → top-level collection `notifications` (แจ้งเตือน CLO ที่ยังไม่มีหลักฐาน — กลไกบังคับใช้กฎทางธุรกิจ #2, AB-12/T-042–T-045)

เอนทิตีนี้เป็นข้อมูลที่ขาดหายจาก schema เดิมของเอกสารนี้ — เพิ่มตามที่ [[../../01-requirements/03-task/task-breakdown|task-breakdown]] T-043 อ้างถึง (ผูกกับ background job T-042 ที่ตรวจ CLO ไม่มี `teaching_record`/`evidence` รองรับ แล้วส่ง notification ทันทีตาม T-044 — นี่คือกลไกที่ทำให้กฎทางธุรกิจ #2 มีผลจริง ไม่ใช่ให้ผู้ใช้ไปตรวจสอบเองแบบ manual)

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | auto-generated (ต่อประวัติ 1 รายการ) | กันสร้างซ้ำผ่าน **Firestore transaction แบบ query-then-write** (§2.0.1, §2.0.4) ไม่ใช่ document ID pattern เพราะต้องรองรับหลาย document สะสมต่อ CLO ตลอดอายุการใช้งาน |
| notification_id | string, เก็บซ้ำเท่ากับ document id | |
| user_id | string (Firebase Auth UID) | ผู้รับแจ้งเตือน (อาจารย์ผู้สอนของวิชาที่ CLO นั้นสังกัด) — reference field → `users` — **[ยืนยันแล้วจาก T-043]** |
| clo_id | string | CLO ที่ตรวจพบว่ายังไม่มี `teaching_record`/`evidence` รองรับ (ตัวกระตุ้นการแจ้งเตือนจาก background job T-042) — reference field → `clos` (nested subcollection — ต้องประกอบ path เต็มด้วย `course_id`/`curriculum_id` ถ้าต้องอ่าน CLO จริง) — สืบทอด scope กลุ่มหลักสูตรผ่าน `clo.curriculum_id` (หัวข้อ 2.3) อยู่แล้ว — **[ยืนยันแล้วจาก T-043]** |
| curriculum_id | string, denormalized จาก `clo.curriculum_id` | **[ยืนยันแล้ว 2026-09-05]** เก็บซ้ำเพื่อกรองสิทธิ์เข้าถึง/แสดงกลุ่มหลักสูตรของแจ้งเตือนได้เร็วโดยไม่ต้องอ่าน `clo`→`course`→`curriculum` ซ้อนกันหลายชั้นทุกครั้ง (Firestore ไม่มี JOIN) — ตรงกับ `program_admin_curriculum_scope` (หัวข้อ 2.12) โดยตรง ทำให้กรองสิทธิ์เข้าถึงข้ามหลักสูตรได้ง่ายกว่าการ denormalize ผ่าน `course_id` (ปิดคำถามเปิดเดิมแล้ว เลือกแนวทางนี้แทน `course_id`) |
| message | text | ข้อความแจ้งเตือนระบุ CLO ที่ขาดหลักฐานเป็นรายข้อ (เช่น "CLO 4 ยังไม่มีข้อมูล" — ตาม AC ของ AB-12) — **[ยืนยันแล้วจาก T-043]** |
| is_resolved | boolean, default `false` | **[ยืนยันแล้ว 2026-09-05 — แนวทาง B: Auto-resolve ผูกสถานะ CLO จริง]** แทนที่แนวคิด "ทำเครื่องหมายว่าอ่านแล้ว" (`is_read`) แบบ manual เดิมทั้งหมด — ระบบ (ไม่ใช่ผู้ใช้) เป็นผู้ set ค่านี้เป็น `true` โดยอัตโนมัติผ่าน Firestore transaction ทันทีที่ CLO ที่แจ้งเตือนนี้อ้างถึงมีหลักฐาน/ผลจับคู่ที่ `confirmed` แล้ว (ไม่ gap อีกต่อไป) — ดูกลไก auto-resolve ด้านล่างตาราง |
| resolved_at | datetime, nullable | เวลาที่ระบบ set `is_resolved = true` โดยอัตโนมัติ — ต้อง not-null คู่กับ `is_resolved = true` เสมอ (เช่นเดียวกับรูปแบบ `confirmed_at` คู่ `confirmed_by` ใน `ai_match_result`/`syllabus_gap_result`) |
| created_at | datetime | เวลาที่สร้างแจ้งเตือน — ต้องเกิด**ทันที**ที่ background job ตรวจพบ (near-real-time เช่นเดียวกับ `gap_alerts` ที่ §3 E4) ไม่ใช่ batch job รายวัน (กฎ #2) — **[ยืนยันแล้วจาก T-043]** |

> **[ยืนยันแล้ว 2026-09-05] กลไก auto-resolve**: T-042 (background job) ต้อง**ตรวจซ้ำ**สถานะ gap ของ `clo_id` ที่ผูกกับ notification ที่ยัง `is_resolved = false` อยู่ทุกครั้งที่มีเหตุการณ์ที่อาจปิด gap ได้ — คือทันทีหลังเรียก `POST /ai-match-results/{id}/confirm` (หัวข้อ 3, E3) สำเร็จ (`ai_match_result` ของ CLO นั้น `state` → `confirmed`, ตาม 2.9) ให้ backend เปิด **Firestore transaction** ตรวจว่า CLO นั้นมี `clo_coverage_summary.is_matched = true` แล้วหรือยัง (คือมี `match_frequency > 0` จาก `ai_match_result` ที่ confirmed) — ถ้าใช่ ให้ query `notifications` where `clo_id == X AND is_resolved == false` แล้วอัปเดต `is_resolved = true, resolved_at = now()` ให้ทุก document ที่พบภายในทรานแซกชันเดียวกันทันที ไม่ต้องรอรอบ background job ถัดไป (ตรงกับพฤติกรรม Gap Alert Banner ใน prototype ที่หายไปเองเมื่อแก้ปัญหาแล้ว) — ในทางกลับกัน ถ้าอาจารย์ `reject` ผลจับคู่ (`state` → `rejected`) หรือ soft-delete `teaching_record`/`evidence` ที่เคยปิด gap ไว้ ทำให้ CLO นั้นกลับไม่มีหลักฐานยืนยันอีก ระบบต้องสร้าง document ใหม่ (ไม่ reopen document เดิมที่ resolved ไปแล้ว เพื่อรักษาประวัติ) ตาม T-042/T-044 ตามปกติ
>
> **แทนที่ Unique constraint (Firestore ไม่มี partial unique index)**: กันสร้างแจ้งเตือนซ้ำซ้อนสำหรับ CLO เดียวกันที่ยัง unresolved อยู่ ด้วย **Firestore transaction แบบ query-then-write** (§2.0.1, §2.0.4 — รายละเอียดเต็ม/ทางเลือกอื่นที่ align-api-schema-design.md §2.6-ข) — background job (T-042) ต้องเปิด transaction ที่ (1) query `notifications` where `clo_id == X AND is_resolved == false` (ต้องมี composite index บน `(clo_id, is_resolved)` เตรียมไว้ล่วงหน้าก่อน deploy จริง) (2) ถ้าไม่พบ document ใดเลย จึงค่อย `set()` document ใหม่ภายใน transaction เดียวกัน — ไม่ query แล้วเขียนแยกขั้นตอน (เสี่ยง race condition ถ้ารัน job ซ้อนกัน) และไม่ `set()`/`add()` ตรงๆ โดยไม่ query ก่อน
>
> **Query rule / ขอบเขตสิทธิ์**: `GET` รายการแจ้งเตือนต้องกรอง `user_id = current_user` เสมอ (อาจารย์เห็นเฉพาะแจ้งเตือนของตนเอง) และ default กรองเฉพาะ `is_resolved = false` (ดู §3 E4) — ไม่มีข้อมูลส่วนบุคคลของนักศึกษาปะปนใน entity นี้โดยตรง (อ้างอิงเพียง `clo_id`/`curriculum_id`) จึงไม่ต้องมี flag PII เหมือน `evidence`

**Delete — ไม่มี hard-delete/soft-delete** สำหรับ document ที่ `is_resolved=true` — เก็บไว้เป็นประวัติสะสม

**Indexing เชิงแนวคิด**: composite index บน `(user_id, is_resolved, created_at DESC)` (รายการแจ้งเตือนของอาจารย์แต่ละคน T-045), `(curriculum_id)`, และ **composite index บน `(clo_id, is_resolved)` — จำเป็นเสมอ** สำหรับกลไก transaction query-then-write ข้างต้น (แทน unique/partial-unique index ของฉบับเดิม)

### 2.15 `account_approval_log` → top-level collection `account_approval_logs` (audit trail การอนุมัติ/ปฏิเสธบัญชี — กลไกบังคับใช้ AB-26)

เอนทิตีนี้เป็นข้อมูลที่ขาดหายจาก schema เดิมของเอกสารนี้ — เพิ่มตามที่ [[../../01-requirements/03-task/task-breakdown|task-breakdown]] T-092 ระบุไว้ชัดเจนแล้ว นี่คือกลไกที่ทำให้ **audit trail ของ AB-26 (การอนุมัติ/ปฏิเสธบัญชี) ตรวจสอบย้อนหลังได้จริงในระดับ schema** แยกจาก `user.approved_by`/`user.approved_at` (หัวข้อ 2.12) ที่เก็บได้เฉพาะ "การตัดสินใจล่าสุดครั้งเดียว" ต่อบัญชี

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| *(document id)* | auto-generated | insert-only (append-only) |
| log_id | string, เก็บซ้ำเท่ากับ document id | |
| account_id | string (Firebase Auth UID) | บัญชีที่ถูกอนุมัติ/ปฏิเสธ (อาจารย์ผู้สอนที่สมัครผ่าน `POST /auth/register`, AB-24) — reference field → `users` — **[ยืนยันแล้วจาก T-092]** |
| action | enum('approve','reject') | การตัดสินใจของผู้บริหารหลักสูตรครั้งนี้ — **[ยืนยันแล้วจาก T-092]** |
| decided_by | string (Firebase Auth UID) | ผู้บริหารหลักสูตร (`role = 'program_admin'`) ที่กดอนุมัติ/ปฏิเสธบัญชีนี้ (ตรวจ role ที่ Cloud Function) — reference field → `users` — **[ยืนยันแล้วจาก T-092]** |
| decided_at | datetime | เวลาที่ตัดสินใจ — **[ยืนยันแล้วจาก T-092]** |

> **กลไกบังคับใช้**: `account_approval_log` เก็บเป็น**ประวัติสะสมทุกครั้ง (append-only)** ไม่ overwrite ของเดิม — ตรวจสอบย้อนหลังได้ว่าใครอนุมัติ/ปฏิเสธเมื่อไรแม้บัญชีหนึ่งถูกตัดสินใจไปมาหลายรอบ (เช่น ปฏิเสธไปก่อนแล้วอนุมัติภายหลัง) — backend ต้อง**สร้าง document ใหม่**ใน collection นี้ทุกครั้งที่เรียก `POST /admin/accounts/{user_id}/approve` หรือ `.../reject` (หัวข้อ 3, E6) **ควบคู่กัน**กับการอัปเดต `users/{uid}.account_status`/`approved_by`/`approved_at` เสมอ โดยทั้งสองการเขียนนี้ต้องอยู่ใน **Firestore transaction เดียวกัน (`runTransaction`)** — อ่าน `users/{uid}` ปัจจุบันก่อน (ตรวจ state transition ถูกต้อง) แล้วเขียนอัปเดตทั้งสองจุดพร้อมกัน ไม่ใช่แยกคำสั่งที่เสี่ยงสำเร็จแค่จุดเดียว

**Delete/Update — ไม่มี soft-delete, ไม่มี hard-delete**

**Indexing เชิงแนวคิด**: composite index บน `(account_id)`, `(decided_by)`

**สรุปความสัมพันธ์แบบย่อ (Firestore: subcollection/nest = เส้นทึบทางโครงสร้าง, reference field = เส้นประเชิงแนวคิด — ไดอะแกรมแบบเต็ม mermaid อยู่ที่ align-api-schema-design.md §2.4, ดูโครงสร้าง collection hierarchy ที่ §2.0.2 ด้านบนประกอบ):**

```
curricula/{curriculum_id}                                    (doc id = year_code)
  └─ plos/{plo_id}                                            (subcollection, doc id = code)
  └─ courses/{course_id}                                      (subcollection, doc id = รหัสวิชา)
       └─ clos/{clo_id}                                       (subcollection, doc id = code)
       └─ syllabus/main                                       (single document, บังคับ 1:1)
  └─ clo_plo_mappings/{mapping_id}                             (subcollection; reference → clo_id, plo_id, confirmed_by→users)

teaching_records/{record_id}                -- reference: course_id; denormalized: curriculum_id
evidence/{evidence_id}                      -- reference: teaching_record_id, uploaded_by→users; denormalized: course_id, curriculum_id
evidence_access_logs/{log_id}               -- reference: evidence_id, accessed_by→users; denormalized: course_id, curriculum_id
ai_match_results/{match_result_id}          -- reference: teaching_record_id, clo_id, confirmed_by→users; denormalized: course_id, curriculum_id
clo_coverage_summaries/{course_id}_{clo_id} -- reference: course_id, clo_id; denormalized: curriculum_id (derived จาก ai_match_result ที่ confirmed)
syllabus_gap_results/{gap_result_id}        -- reference: course_id, syllabus_id, confirmed_by→users; denormalized: curriculum_id
users/{user_id}                             -- reference (self): approved_by; reference (array): program_admin_curriculum_scope→curriculum_id; course.instructor_id→users
account_approval_logs/{log_id}              -- reference: account_id→users, decided_by→users
notifications/{notification_id}             -- reference: user_id→users, clo_id; denormalized: curriculum_id
```

ทุกเส้น "reference"/"denormalized" ข้างต้น **ไม่ใช่ FK บังคับที่ระดับ storage** — Firestore ไม่ตรวจการมีอยู่จริงของปลายทางหรือความตรงกันของ `curriculum_id` ให้อัตโนมัติ ต้องตรวจที่ Cloud Function ก่อนเขียนทุกครั้งตามหลักการ §2.0.1

---

## 3. API Design

รูปแบบ REST/JSON เป็นแนวทางหลัก (ยังไม่ fix เป็น spec สมบูรณ์ — ระบุ method + จุดประสงค์ + ฟิลด์สำคัญพอให้ทีมพัฒนาเริ่มออกแบบ endpoint จริงได้) จัดกลุ่มตาม Epic:

### E1 — ตั้งค่า CLO/PLO แยกตามหลักสูตร
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /curricula/{year}/plos` | เพิ่ม PLO ให้กลุ่มหลักสูตร 2565 หรือ 2570 | req: `{code, description}` (curriculum ระบุจาก path) |
| `GET /curricula/{year}/plos` | ดึงรายการ PLO ของหลักสูตรนั้น (ไม่ปนกลุ่มอื่น) — กรอง `is_deleted = false` เสมอเมื่อใช้เป็นตัวเลือกให้ผูก CLO ใหม่ | res: `[{plo_id, code, description}]` |
| `DELETE /curricula/{year}/plos/{plo_id}` | **[ยืนยันแล้ว]** soft-delete PLO — ตั้ง `is_deleted = true`, `deleted_at = now()` เสมอ ไม่ลบแถวจริง ไม่บล็อกด้วย 409 แม้มี `clo_plo_mapping` ผูกอยู่แล้ว (ดูผลกระทบที่หัวข้อ 2.2) | res: `{plo_id, is_deleted: true, deleted_at}` |
| `POST /courses` | สร้างรายวิชา ต้องระบุ `curriculum_id` | req: `{code, name, curriculum_id, instructor_id}` |
| `POST /courses/{id}/clos` | เพิ่ม CLO ให้วิชา (tag curriculum ตามวิชาอัตโนมัติ) | req: `{code, description}` |
| `DELETE /courses/{id}/clos/{clo_id}` | **[ยืนยันแล้ว]** soft-delete CLO — ตั้ง `is_deleted = true`, `deleted_at = now()` เสมอ ไม่ลบแถวจริง ไม่บล็อกด้วย 409 แม้มี `ai_match_result` (รวมที่ confirmed แล้ว) อ้างอิงอยู่ — backend ต้อง re-evaluate `clo_plo_ready`/`total_clo_count` ทันทีหลัง soft-delete (ดูหัวข้อ 2.3) | res: `{clo_id, is_deleted: true, deleted_at}` |
| `POST /courses/{id}/clo-plo-mappings` | ผูก CLO–PLO | req: `{clo_id, plo_id}` — backend ต้อง validate `clo.curriculum_id == plo.curriculum_id` มิฉะนั้น 422 |
| `GET /courses/{id}/setup-status` | เช็คว่าวิชาผูก CLO–PLO ครบเงื่อนไข (gate ก่อนบันทึกการสอน) หรือยัง | res: `{clo_plo_ready: boolean}` |
| `GET /curricula/{year}/courses/status-overview` | ภาพรวมความครบถ้วนการตั้งค่าของทุกวิชาในกลุ่มหลักสูตร (สำหรับผู้บริหารหลักสูตร/`program_admin`, AB-04) | res: `[{course_id, name, clo_plo_ready}]` |
| `PUT /courses/{id}/syllabus` | ป้อน/แก้ไข course syllabus ของรายวิชา (สร้างใหม่ถ้ายังไม่มี, อัปเดตทับถ้ามีอยู่แล้ว) — ใหม่ตาม AB-19 | req: `{content: [{week_no, topic, detail}]}` → res: `{syllabus_id, updated_at}` |
| `POST /courses/{id}/syllabus/upload` | อัปโหลดไฟล์ syllabus ทางการ (**บังคับ** ตามข้อกำหนดของสาขา) — backend เก็บไฟล์ที่ File Storage แล้วบันทึก `origin_file_ref` เท่านั้น **ไม่มีการ parse/สกัดเนื้อหาจากไฟล์อัตโนมัติ** — เป็นการเก็บไว้อ้างอิงเฉยๆ ส่วนข้อมูลที่ใช้เทียบ gap จริงมาจาก `PUT /courses/{id}/syllabus` (`content`) แยกต่างหาก | req: multipart file → res: `{syllabus_id, origin_file_ref}` |
| `GET /courses/{id}/syllabus` | ดึง course syllabus ปัจจุบันของรายวิชา (ใช้แสดงในหน้าจัดการวิชา และเป็น input ให้ AI gap analysis ใน E3) | res: `{syllabus_id, content, origin_file_ref, updated_at}` |

### E2 — บันทึกการสอน + แนบหลักฐาน
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /courses/{id}/teaching-records` | บันทึกการสอน — backend ปฏิเสธ (409) ถ้า `clo_plo_ready = false` | req: `{topic, week_no, taught_at}` |
| `POST /teaching-records/{id}/evidence` | แนบไฟล์หลักฐาน (เรียกซ้ำได้หลายไฟล์) | req: multipart file → res: `{evidence_id, file_name}` |
| `DELETE /teaching-records/{id}/evidence/{evidence_id}` | **[ยืนยันแล้ว]** soft-delete evidence เสมอ (ตั้ง `is_deleted = true`, `deleted_at = now()`) ไม่ลบแถว/ไฟล์จริงทันที ทั้งกรณีลบไฟล์ที่แนบผิดก่อนยืนยันบันทึก (AB-06) และกรณีอื่นใด — เพื่อรักษาความสมบูรณ์ของเอกสาร Word ที่เคย export อ้างอิงไฟล์นี้ไปแล้ว (กฎ #4) และรักษา audit trail ของ PDPA (กฎ #5) ดูหัวข้อ 2.8 | res: `{evidence_id, is_deleted: true, deleted_at}` |
| `GET /teaching-records/{id}/evidence` | ดูรายชื่อไฟล์ที่แนบ (เฉพาะผู้มีสิทธิ์ตาม PDPA) — กรอง `is_deleted = false` เสมอ | res: `[{evidence_id, file_name, uploaded_at}]` |
| `GET /evidence/{id}/download` | ดาวน์โหลดไฟล์หลักฐาน — backend ตรวจสิทธิ์ตามหัวข้อ 2.13 ก่อน proxy ไปยัง storage ทุกครั้ง และเขียน `evidence_access_log` | — |

### E3 — AI ประมวลผลจับคู่ CLO/PLO + วิเคราะห์ gap เทียบ course syllabus
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /teaching-records/{id}/ai-match` | สั่งให้ AI Matching Service ประมวลผล — backend ส่งเฉพาะ CLO ของ curriculum เดียวกับวิชานั้น | res: `[{clo_id, match_confidence, linked_plo_ids, state:"draft"}]` — สร้างระเบียน `ai_match_result` state=draft |
| `GET /teaching-records/{id}/ai-match-results` | ดึงผลจับคู่ล่าสุด (draft หรือ confirmed) เพื่อแสดงในหน้าบันทึกการสอน | res: รายการ ai_match_result |
| `PATCH /ai-match-results/{id}` | อาจารย์แก้ไข match confidence/ปลด CLO ก่อนยืนยัน (state → edited) | req: `{match_confidence?, remove: boolean}` |
| `POST /ai-match-results/{id}/confirm` | ยืนยันผล (state → confirmed, บันทึก confirmed_by/at) — **จุดเดียวที่ทำให้ผล AI กลายเป็นข้อมูลจริง**, CLO นี้ถูกนับเข้า `match_frequency`/`coverage_percent` ของวิชา (กฎ #3) | — |
| `POST /ai-match-results/{id}/reject` | ปฏิเสธผลจับคู่ที่ผิด (state → rejected, ไม่ถูกนับเป็นหลักฐาน) | — |
| `GET /courses/{id}/clo-coverage` | ดึงสัดส่วน % ความสอดคล้องระดับวิชา (ฐาน `total_clo_count` = 100%) พร้อม % ความถี่ที่แมทช์ต่อ CLO — คำนวณจาก `ai_match_result` ที่ confirmed เท่านั้น (ตามสูตร AB-20/AB-21 ที่ยืนยันแล้ว, หัวข้อ 2.10) | res: `{course_id, total_clo_count, matched_clo_count, coverage_percent, total_teaching_record_count, per_clo: [{clo_id, match_frequency, match_frequency_percent, is_matched}]}` |
| `POST /courses/{id}/syllabus-gap-analysis` | สั่งให้ AI เปรียบเทียบ `teaching_record` ทั้งหมดของวิชา (ที่บันทึกจริง) กับ `syllabus.content` — ต้องมี syllabus ของวิชานี้แล้ว (ไม่เช่นนั้น 409) — งานแยกจาก ai-match (AB-22) | res: `{missing_topics, extra_topics, state:"draft"}` — สร้างระเบียน `syllabus_gap_result` state=draft |
| `GET /courses/{id}/syllabus-gap-results` | ดึงผลวิเคราะห์ gap **ล่าสุดเพียงชุดเดียว** ของวิชานั้น (draft หรือ confirmed) — แม้ฐานข้อมูลจะเก็บ `syllabus_gap_result` ทุกรอบไว้เป็นประวัติแบบ append-only (ดูหัวข้อ 2.11) endpoint นี้คืนเฉพาะแถวที่ `generated_at` ล่าสุดของ `course_id` นั้น (เทียบเท่า `ORDER BY generated_at DESC LIMIT 1`) **[ยืนยันแล้ว, ดู align-api-schema-design.md §4.3]** — ถ้าต้องการดูประวัติทุกรอบ ให้เพิ่ม endpoint แยกต่างหาก (เช่น `GET /courses/{id}/syllabus-gap-results/history`) แทนการเปลี่ยนพฤติกรรม endpoint นี้ | res: `syllabus_gap_result` (**object เดียว** ไม่ใช่ array) |
| `PATCH /syllabus-gap-results/{id}` | อาจารย์แก้ไขรายการหัวข้อที่ขาด/เกินก่อนยืนยัน (state → edited) | req: `{missing_topics?, extra_topics?}` |
| `POST /syllabus-gap-results/{id}/confirm` | ยืนยันผล gap analysis (state → confirmed) — เช่นเดียวกับ ai-match ต้องผ่านอาจารย์ก่อนใช้เป็นหลักฐานทางการ (กฎ #3) | — |
| `POST /syllabus-gap-results/{id}/reject` | ปฏิเสธผลวิเคราะห์ gap รอบนี้ (state → rejected) | — |

### E4 — แดชบอร์ดและแจ้งเตือน
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `GET /me/dashboard` | หน้าแรกอาจารย์: % ความสอดคล้องรวม (ตามสูตรใหม่ 2.10/AB-20), รายวิชาที่สอน, แจ้งเตือน CLO ขาดหลักฐาน — `gap_alerts` อ่านจากตาราง `notification` (หัวข้อ 2.14) กรอง `user_id = current_user AND is_resolved = false` เสมอ (T-045) | res: `{courses:[{course_id, curriculum_year, coverage_percent, matched_clo_count, total_clo_count}], gap_alerts:[{notification_id, clo_id, code, course_id, curriculum_id, message, created_at}]}` |
| `GET /courses/{id}/clo-week-map` | แผนที่ CLO×สัปดาห์ + จำนวนชิ้นงานสะสม + สถานะเชื่อม PLO | res: `[{clo_id, week_no, evidence_count, linked_plo_status}]` |
| `GET /curricula/{year}/dashboard` | ภาพรวมความสอดคล้องระดับหลักสูตร แยกกลุ่ม (สำหรับผู้บริหารหลักสูตร/`program_admin`, AB-14) — ตรวจ scope สิทธิ์ก่อนตอบ | res: `{curriculum_id, courses:[{course_id, coverage_percent}]}` |
| `GET /courses/{id}/teaching-vs-syllabus` | **ใหม่ (AB-23)** — ส่วนเปรียบเทียบ "การสอนจริงที่บันทึก" กับ "CLO/course syllabus" สำหรับแดชบอร์ด แยกจากส่วน % ความสอดคล้องรวม (AB-11) และแจ้งเตือน CLO ขาดหลักฐาน (AB-12) อย่างชัดเจน — อ่านเฉพาะ `syllabus_gap_result` ที่ `state = 'confirmed'` เท่านั้น | res: `{course_id, missing_topics_count, extra_topics_count, missing_topics:[...], extra_topics:[...], last_confirmed_at}` — ถ้ายังไม่มีผลที่ confirmed ให้ตอบสถานะ `not_yet_confirmed` แทนตัวเลข |

หมายเหตุ: `gap_alerts` มาจากระเบียน `notification` (หัวข้อ 2.14) ที่สร้างโดย background job T-042 แบบ near-real-time (ทันทีที่ตรวจพบ CLO ขาดหลักฐาน ไม่ใช่ batch job รายวัน — กฎ #2) และ**หายไปเองอัตโนมัติ**จากรายการนี้เมื่อ backend set `is_resolved = true` ให้ (กลไก auto-resolve ดูหัวข้อ 2.14) — ไม่ต้องให้ผู้ใช้กดอ่าน/ปิดแจ้งเตือนเอง — ส่วนเปรียบเทียบ `teaching-vs-syllabus` เป็นคนละส่วนกับ `gap_alerts`: `gap_alerts` แจ้งเตือน "CLO ที่ไม่มีข้อมูลการสอน/หลักฐานรองรับเลย" (กฎ #2) ในขณะที่ `teaching-vs-syllabus` เทียบ "เนื้อหาที่สอนจริง" กับ "แผน syllabus" (หัวข้อขาด/หัวข้อเกิน — AB-22/AB-23) ทั้งสองใช้ข้อมูลคนละชุดและต้องแสดงแยกส่วนกันในหน้าจอ

### E5 — ออกเอกสาร Word
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /courses/{id}/export-word` | สร้างเอกสารสรุป CLO/PLO ของวิชา — อ่านเฉพาะ `ai_match_result.state = 'confirmed'`, `clo_coverage_summary` ที่ได้จากค่า confirmed, `syllabus_gap_result.state = 'confirmed'` (สำหรับส่วน Area of Improvement ตาม AB-16), และ evidence ที่แนบจริง — **[ยืนยันแล้ว, AB-18 ถูกตัดออกจากขอบเขต]** เอกสารแสดงส่วน Area of Improvement เสมอ ไม่มี toggle/parameter ให้เลือกซ่อน | req: `{}` (ไม่มีพารามิเตอร์เลือกรวม/ไม่รวม Area of Improvement) → res: `{file_url}` หรือไฟล์ตรง |
| `GET /export-jobs/{id}` | เช็คสถานะงานสร้างเอกสาร (ถ้าออกแบบเป็น async job) | res: `{status, download_url}` |
| `GET /curricula/{year}/courses/{id}/export-word` (program_admin) | ผู้บริหารหลักสูตร (`program_admin`) ดาวน์โหลดเอกสารของวิชาที่ตนดูแลตาม scope เพื่อนำไปส่งต่อ QA ภายนอกระบบ | ตรวจ `program_admin_curriculum_scope` ก่อนตอบ (กฎ #5) |

### E6 — สมัครและอนุมัติบัญชีผู้ใช้ (User Registration & Approval)
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /auth/register` | สมัครใช้งานเอง (self-service, **public — ไม่ต้อง auth**) — สร้างบัญชีอาจารย์ผู้สอนใหม่เสมอด้วย `account_status = 'pending'` ทันที (AB-24) ไม่พาเข้าใช้งานฟีเจอร์ใดของระบบทันทีหลังสมัคร | req: `{name, email, password}` (**[ยืนยันแล้ว]** ไม่มี `department` ดูหมายเหตุที่ §2.12) → res: `{user_id, account_status: "pending"}` — ถ้า `email` ซ้ำในระบบ ตอบ 409 |
| `GET /auth/me/account-status` | อาจารย์ผู้สอนที่เคยสมัครไว้เช็คสถานะบัญชีของตนเอง (ต้อง auth ด้วย credential พื้นฐาน แต่**ไม่ต้องผ่านการตรวจ `account_status = 'approved'`** เพราะบัญชี pending/rejected ต้องเรียก endpoint นี้ได้ตาม AB-27) — จำกัดเห็นเฉพาะสถานะของตนเองเท่านั้น ห้ามรับพารามิเตอร์ user อื่น | res: `{account_status, rejection_reason}` (แสดง `rejection_reason` เฉพาะเมื่อ `account_status = 'rejected'` และมีค่า — มักเป็น null เพราะไม่บังคับกรอก ดู §2.12) |
| `GET /admin/accounts?status=pending` | ผู้บริหารหลักสูตร (`program_admin`, **admin-only visibility** ตาม AB-26) ดูรายการบัญชีที่รออนุมัติ — ไม่ระบุ `status` = ดึงบัญชีทั้งหมดที่เคยสมัคร (ทุกสถานะ) | res: `[{user_id, name, email, account_status, approved_by, approved_at}]` — role อื่นเรียก endpoint นี้ต้องได้ 403 |
| `POST /admin/accounts/{user_id}/approve` | ผู้บริหารหลักสูตรอนุมัติบัญชี (`account_status → 'approved'`, บันทึก `approved_by`/`approved_at` เป็นผู้อนุมัติ+เวลาปัจจุบัน) — บัญชีเข้าใช้งาน E1–E5 ได้ทันทีหลังจากนี้ (AB-26) | res: `{user_id, account_status: "approved", approved_by, approved_at}` |
| `POST /admin/accounts/{user_id}/reject` | ผู้บริหารหลักสูตรปฏิเสธบัญชี (`account_status → 'rejected'`, บันทึก `approved_by`/`approved_at` เช่นกัน) — บัญชียังคงเข้าถึงข้อมูลใดๆ ของระบบไม่ได้ (กฎทางธุรกิจ #6) | req: `{reason?}` (nullable — ดูหมายเหตุ `rejection_reason` ที่ §2.12) → res: `{user_id, account_status: "rejected", approved_by, approved_at}` |

ทุก endpoint ที่แตะ `evidence` หรือ export เอกสาร ต้องผ่าน middleware ตรวจสิทธิ์ตามบทบาท+scope ก่อนถึง business logic เสมอ — และตาม E6 ทุก endpoint ที่ต้อง auth ในเอกสารนี้ (ทั้งหมดใน E1–E5 และ E6 ยกเว้น `POST /auth/register` กับ `GET /auth/me/account-status` ที่ระบุไว้ข้างต้น) ต้องผ่านการตรวจ `account_status = 'approved'` ก่อนไปถึงการตรวจสิทธิ์ตามบทบาท/scope นั้นเสมอ (ดูหมายเหตุบังคับที่ §2.12)

---

## 4. แนวทาง AI Matching และ Gap Analysis (Conceptual)

เอกสารนี้แยกงานของ AI Matching Service เป็น **2 งานที่เป็นอิสระจากกัน** ตามสเปคที่ปรับใหม่ (requirement E3, AB-08/AB-20/AB-21 สำหรับงานแรก และ AB-22 สำหรับงานที่สอง) — ทั้งสองงานยัง human-in-the-loop เหมือนกันตามกฎ #3 แต่เก็บผลเป็นคนละ entity (`ai_match_result` vs `syllabus_gap_result`, ดูหัวข้อ 2.9/2.11) และคนละ endpoint (หัวข้อ 3)

### 4.1 จับคู่ CLO/PLO ต่อบันทึกการสอน 1 รายการ

**Input ต่อการเรียกใช้งาน 1 ครั้ง:**
- ข้อมูลบันทึกการสอน (`teaching_record`: หัวข้อ, สัปดาห์)
- เนื้อหา/ข้อความจากไฟล์หลักฐานที่แนบ (`evidence` — ข้อความที่สกัดได้จากไฟล์ เช่น หัวข้องาน/รายละเอียดชิ้นงาน)
- **ชุด CLO ที่อนุญาตให้จับคู่ได้ = เฉพาะ CLO ของ `course.curriculum_id` เดียวกับวิชานั้นเท่านั้น** — backend เป็นผู้กำหนดขอบเขตนี้ก่อนส่งให้ AI Matching Service ประมวลผล ไม่ใช่ให้ AI เลือกเองจากทุก CLO ในระบบ (ป้องกันการจับคู่ข้ามหลักสูตร 2565↔2570 ตาม AB-08)

**Output:**
- รายการ `{clo_id, match_confidence}` ต่อ CLO แต่ละข้อในชุดที่อนุญาต — `match_confidence` เป็นค่าความมั่นใจของ AI สำหรับการจับคู่รายการนี้โดยเฉพาะ (เก็บใน `ai_match_result`, ดูหัวข้อ 2.9)
- รายการ PLO ที่เชื่อมโยงต่อจาก CLO ที่จับคู่ได้ (ดึงจาก `clo_plo_mapping` ที่มีอยู่แล้ว ไม่ใช่ AI เดาเอง) — จึงมั่นใจได้ว่า PLO ที่โยงมาอยู่ curriculum เดียวกันเสมอ เพราะสืบทอดจาก mapping ที่ผ่าน constraint ในหัวข้อ 2.4 มาแล้ว

**สถานะผลลัพธ์ (สำคัญที่สุด — กฎ #3):**
ผลจากขั้นตอนนี้ทั้งหมดถูกเขียนเป็น `ai_match_result` ที่ `state = 'draft'` เท่านั้น ระบบ**ห้าม**เปลี่ยน state เป็น `confirmed` เอง ไม่ว่าค่า match confidence จะสูงแค่ไหนก็ตาม ต้องรอเรียก `POST /ai-match-results/{id}/confirm` โดยอาจารย์ผู้สอนวิชานั้นเท่านั้น อาจารย์สามารถแก้ไข/ปลด CLO ที่จับคู่ผิดได้ก่อนยืนยัน (`state = 'edited'`) เอกสาร/แดชบอร์ด/รายงานใดๆ ในระบบต้องอ่านจากผลที่ `confirmed` แล้วเท่านั้น

### 4.2 คำนวณ % ความสอดคล้องระดับวิชา + ความถี่ที่แมทช์ (สูตรใหม่ — AB-20/AB-21)

การคำนวณนี้ **ไม่ใช่งานของ AI โดยตรง** แต่เป็นการรวมผล (aggregation) จาก `ai_match_result` ที่ `state = 'confirmed'` แล้ว ตามสูตร:

1. `total_clo_count` ของรายวิชา = จำนวน CLO ทั้งหมดที่ผูกกับวิชานั้น (ฐาน 100%, แยกตามกลุ่มหลักสูตร 2565/2570 ของวิชาเสมอ)
2. CLO ข้อหนึ่งถือว่า "แมทช์แล้ว" (`is_matched = true`) เมื่อมี `ai_match_result` ที่ confirmed อย่างน้อย 1 รายการสำหรับ CLO นั้น
3. `coverage_percent` (ค่า % ความสอดคล้องที่แสดงต่ออาจารย์) = (จำนวน CLO ที่ `is_matched = true` ÷ `total_clo_count`) × 100
4. `match_frequency` ต่อ CLO = จำนวนรายการ `ai_match_result` ที่ confirmed ทั้งหมดสำหรับ CLO นั้น (นับข้ามหลาย `teaching_record` ได้ สะสมตลอดที่มี `teaching_record` อยู่ในระบบสำหรับวิชานั้น ไม่แยก/ไม่ reset ตามภาคการศึกษา)
5. `total_teaching_record_count` ของรายวิชา = จำนวน `teaching_record` ทั้งหมดของวิชานั้น (สะสมแบบเดียวกับข้อ 4 ไม่แยกภาคการศึกษา)
6. `match_frequency_percent` ต่อ CLO **[ยืนยันแล้ว 2026-08-20]** = (`match_frequency` ÷ `total_teaching_record_count`) × 100 — แสดง**คู่กัน**กับ `match_frequency` (raw count) เสมอเคียงข้างกันในหน้าเดียวกัน **ไม่ใช่สูตรรวม**กับ `coverage_percent` เป็นตัวเลขเดียว (AB-21) — เป็นคนละค่ากับ `coverage_percent` ในข้อ 3

ค่าที่ได้ทั้งหมดข้อ 1–6 (`clo_coverage_summary`, หัวข้อ 2.10) จึง**สืบทอด human-in-the-loop จาก `ai_match_result` โดยอัตโนมัติ** — เพราะคำนวณจากเฉพาะรายการที่อาจารย์ยืนยันแล้วเท่านั้น ไม่ต้องมีขั้นตอนยืนยันซ้ำอีกชั้น แต่ยังต้องแสดงค่าให้อาจารย์ตรวจสอบก่อนนำไปอ้างอิงในเอกสารทางการเสมอตาม AB-20/AB-21

> **[ยืนยันแล้ว 2026-08-20] นิยาม "ความถี่ที่แมทช์":** ปิดคำถามเปิดแล้วตามคำตอบยืนยันจากผู้ใช้ (รายละเอียดเต็มที่ `test-plan-align.md` §6.1) — นับสะสมตลอดที่มี `teaching_record` อยู่ในระบบสำหรับ `course_id` นั้น ไม่แยก/ไม่ reset ตามภาคการศึกษา (เพราะ `teaching_record`/`course` ไม่มี field แยกภาคการศึกษา ดูหัวข้อ 2.6/2.7) จึงไม่มีกรณีต้องแยกนับข้ามหลายภาคการศึกษา — ยังไม่มี threshold ตัวเลขว่าความถี่เท่าไรถือว่า "เพียงพอ" คงเป็นค่าที่แสดงให้อาจารย์ตัดสินใจเอง ดูฟิลด์เต็มที่หัวข้อ 2.10

### 4.3 วิเคราะห์ Gap เทียบ course syllabus (แยกจาก CLO/PLO matching — AB-22)

**Input ต่อการเรียกใช้งาน 1 ครั้ง (ระดับรายวิชา ไม่ใช่ระดับบันทึกการสอนเดียว):**
- เนื้อหา course syllabus **เวอร์ชันปัจจุบัน** ของรายวิชานั้น (`syllabus.content` — update-in-place ไม่มี version history ดู Accepted Risk ที่ §2.6)
- หัวข้อการสอนจริงทั้งหมดที่บันทึกไว้ของรายวิชานั้น (`teaching_record.topic` ทุกรายการ ณ เวลาที่ประมวลผล)

**วิธีเทียบหัวข้อ ([ยืนยันแล้ว]):** การเทียบ `syllabus.content` (หัวข้อรายสัปดาห์ที่วางแผนสอน) กับ `teaching_record.topic` (หัวข้อที่สอนจริง) ใช้วิธี**เทียบความหมาย/คำสำคัญร่วม (semantic similarity)** ไม่ใช่การเทียบ string ตรงตัวเป๊ะ (exact match) — เป็นหลักการเดียวกับที่ใช้ในงานจับคู่ CLO/PLO (4.1) เพราะถ้อยคำที่อาจารย์เขียนในแผน syllabus กับที่บันทึกการสอนจริงมักไม่ตรงกันคำต่อคำ เช่น หัวข้อ syllabus เขียนว่า "การตรวจสอบข้อเท็จจริงในสื่อดิจิทัล" กับหัวข้อที่สอนจริงเขียนว่า "Fact-checking เนื้อหาออนไลน์" ต้องถือว่า **"ตรงกัน"** (ไม่ใช่ missing/extra) แม้ถ้อยคำไม่เหมือนกัน — เทคนิคที่ใช้ (เช่น text embedding + similarity threshold) ไม่ผูกมัดในเอกสารนี้ เช่นเดียวกับ 4.1 (ดูข้อเสนอด้านล่าง)

**Output:**
- `missing_topics` — หัวข้อใน syllabus ที่ยังไม่พบ `teaching_record` ที่มีความหมายตรงกัน (ไม่ใช่แค่ไม่พบคำที่เขียนเหมือนกัน) รองรับ
- `extra_topics` — หัวข้อที่สอนจริงแต่ไม่พบหัวข้อที่มีความหมายตรงกันใน syllabus (เนื้อหาที่เพิ่มนอกแผน)

ผลลัพธ์ถูกเขียนเป็น `syllabus_gap_result` ที่ `state = 'draft'` เท่านั้น เช่นเดียวกับ 4.1 — ต้องรอ `POST /syllabus-gap-results/{id}/confirm` โดยอาจารย์ก่อนนำไปใช้ในแดชบอร์ด (AB-23) หรือเอกสาร Area of Improvement (AB-16) เพราะการเทียบแบบ semantic อาจจับคู่ผิดได้ จึงยังต้องผ่านการตรวจของอาจารย์ก่อนเสมอ (กฎ #3 ใน [[../../CLAUDE.md|CLAUDE.md]])

**ข้อเสนอ — ยืนยันกับทีมพัฒนาก่อนเริ่มจริง:** รายละเอียดโมเดล AI ที่ใช้ทั้งงานจับคู่ CLO/PLO (4.1) และงานวิเคราะห์ gap (4.3) เช่น text embedding + similarity scoring, หรือเรียก LLM API ภายนอก ยังไม่ได้ระบุในสเปค เอกสารนี้จงใจอธิบายเฉพาะ contract (input/output/state) ไม่ผูกกับโมเดลใดโมเดลหนึ่ง เพื่อให้ทีมพัฒนาเลือกเทคนิคที่เหมาะสมได้อิสระ ขอเพียงคง constraint เรื่อง curriculum scope และ human-in-the-loop ไว้เสมอทั้งสองงาน

---

## 5. Tech Stack — สรุป (รายละเอียดเต็มอยู่ที่ [[align-tech-stack|align-tech-stack]])

> อัปเดต 2026-08-23: หัวข้อนี้เคยเป็นข้อเสนอคร่าวๆ ที่เขียนก่อนสัมภาษณ์ทีมพัฒนาจริง — เนื้อหาเดิมย้ายไปเก็บถาวรที่ [[../00-archived/align-technical-design-section5-tech-stack-draft|align-technical-design-section5-tech-stack-draft]] แล้ว (ไม่ใช่เพราะผิด แต่เพราะตอนนี้มีคำตอบจากการสัมภาษณ์จริงมาแทนที่) ปัจจุบันยึด [[align-tech-stack|align-tech-stack]] เป็น **แหล่งข้อมูลเต็มรูปแบบและเป็นทางการ** (rationale ทีละชั้น, ทางเลือกที่ไม่เลือกพร้อมเหตุผล, ประเด็นที่ยังต้องกลับมายืนยันซ้ำ) — หัวข้อนี้เหลือไว้เฉพาะบทสรุปสั้นๆ เพื่อให้เห็นภาพทันทีโดยไม่ต้องเปิดไฟล์อื่น
>
> **อัปเดต 2026-09-05 — เปลี่ยนเป็น Firebase**: [[align-tech-stack|align-tech-stack]] ยืนยันแล้วว่าโปรเจกต์นี้ **ต้องใช้ Firebase ทั้ง suite** (ข้อกำหนดบังคับ ไม่ใช่ทางเลือกทางเทคนิค — ดูข้อ 1.4-1.7 ในเอกสารนั้น) ตารางด้านล่างปรับให้ตรงกับ "รอบที่ 2" ของ align-tech-stack.md แล้ว

Stack ที่เลือกจริง (สรุปจาก [[align-tech-stack|align-tech-stack]] รอบที่ 2 — บังคับใช้ Firebase, ยอมรับ full lock-in, ใช้งานเฉพาะอาจารย์ผู้สอนไม่ deploy จริงกับข้อมูลนักศึกษา, งบ/data residency/SSO/deployment สุดท้ายยังไม่ยืนยัน):

| ส่วนประกอบ | Stack ที่เลือก |
|---|---|
| Frontend | Next.js (React) + Tailwind CSS — ไม่เปลี่ยน |
| Backend/API | Next.js API Routes / Server Actions เดิม (เป็น Access Gate + Core Orchestration ตามหัวข้อ 3) แต่เรียก Firestore ผ่าน **Firebase Admin SDK** แทน Supabase client |
| ฐานข้อมูล | **Cloud Firestore** (บังคับตามข้อกำหนด ไม่ใช่เหตุผลทางเทคนิคที่ดีกว่าเดิม — Firestore Security Rules เป็น defense-in-depth ชั้นที่สอง ไม่ใช่กลไกบังคับกฎหลัก ดูหัวข้อ 2.0) |
| Auth | **Firebase Authentication** (email/password) รองรับ flow E6 — ให้ Firestore Security Rules อ้าง `request.auth` ชุดเดียวกันได้โดยตรง |
| Evidence storage | **Firebase Cloud Storage** (Google Cloud Storage) — *ไม่ใช่ S3-compatible* จึงเสียทางย้าย self-host MinIO ที่เคยวางแผนไว้ |
| AI/LLM (จับคู่ CLO/PLO + gap analysis) | Hybrid: Transformers.js (`@xenova/transformers`, in-process, default เปิดเสมอ) + external LLM API (feature-flag, ปิดโดย default) — แนวทางไม่เปลี่ยน แต่ต้องทบทวนตำแหน่งรัน (cold start/memory) บน Firebase — ผลลัพธ์ทุกเส้นทางเขียนเป็น `state = 'draft'` เสมอตามกฎ #3 |
| Word export | ไลบรารี `docx`/`docxtemplater` (npm) เรียกจาก Server Action ที่อ่านเฉพาะข้อมูล `confirmed` — ไม่เปลี่ยน (ไม่ผูกกับ database) |
| Hosting | **Firebase App Hosting** (frontend+API, รัน Next.js บน Cloud Run เบื้องหลัง) + Firestore/Auth/Storage อยู่ใน Firebase project เดียวกัน region `asia-southeast1` (สิงคโปร์) — ต้องใช้ Blaze plan (ผูก billing account) |

หลักการเลือกภาพรวม: ยังคงหลัก "deployable unit เดียว" เพื่อลดภาระดูแลของทีมเล็กที่ไม่มีโปรแกรมเมอร์มืออาชีพดูแลต่อ เปลี่ยนจาก 1 โปรเจกต์ Next.js + 1 บริการ Supabase เป็น **1 โปรเจกต์ Next.js + 1 Firebase project** (Firestore+Auth+Storage+App Hosting) — แลกกับการเสียความ portable ที่เคยมีเกือบทั้งหมด (Firebase เป็น proprietary ล้วน ยืนยันแล้วว่ายอมรับ trade-off นี้) — ดูรายละเอียดเหตุผล/ทางเลือกที่ไม่เลือก/ตารางประเด็นค้างยืนยันทั้งหมดที่ [[align-tech-stack|align-tech-stack]] §1–4

---

## 6. PDPA / Security Note

เอกสารนี้ยึดกฎทางธุรกิจ #5 (ข้อมูลส่วนบุคคลของนักศึกษาต้องเข้าถึงแบบจำกัดสิทธิ์) เป็นหลัก และแปลงเป็นกลไกระดับออกแบบดังนี้:

1. **ขอบเขตสิทธิ์ (Authorization scope):** ผู้ใช้ที่เข้าถึงข้อมูล `evidence` ของวิชาใดวิชาหนึ่งได้ ต้องเป็น (ก) อาจารย์ที่เป็น `instructor_id` ของ `course` นั้น หรือ (ข) ผู้บริหารหลักสูตร (`program_admin`) ที่มี `curriculum_id` ของ `course` นั้นอยู่ใน `program_admin_curriculum_scope` ของตนเองเท่านั้น — ตรวจที่ backend API layer ทุกครั้ง (ดูหัวข้อ 3) ไม่ใช่พึ่งการซ่อน UI ฝั่ง frontend อย่างเดียว
2. **ห้ามเข้าถึง storage ตรง:** client (frontend) ไม่มีสิทธิ์อ่านไฟล์จาก Evidence/File Storage โดยตรง ต้องผ่าน backend API เท่านั้น (proxy download หรือ signed URL ที่หมดอายุเร็ว) เพื่อให้ทุกการเข้าถึงถูกตรวจสิทธิ์และบันทึก log ได้
3. **Audit log:** ทุกครั้งที่มีการเรียกดู/ดาวน์โหลดหลักฐาน ต้องเขียนลง `evidence_access_log` (ใคร, เมื่อไร, ไฟล์ไหน) เพื่อตรวจสอบย้อนหลังได้ ตาม AB-07
4. **Flag ข้อมูลส่วนบุคคล:** ตาราง `evidence` มีฟิลด์ `contains_student_pii` (default true) เพื่อเตือนทีมพัฒนา/ผู้ดูแลระบบว่าไฟล์เหล่านี้ต้องได้รับการปฏิบัติเป็นข้อมูลอ่อนไหวเสมอ แม้จะยังไม่ได้ตรวจสอบเนื้อหาจริงทีละไฟล์
5. **แยก scope ตามหลักสูตร:** เนื่องจากผู้บริหารหลักสูตร (`program_admin`) อาจดูแลเฉพาะหลักสูตร 2565 หรือ 2570 (ไม่จำเป็นต้องดูแลทั้งสองกลุ่ม) การตรวจสิทธิ์ระดับ endpoint ของ dashboard/export ระดับหลักสูตร (`/curricula/{year}/...`) ต้องตรวจ `program_admin_curriculum_scope` ควบคู่กับสิทธิ์ evidence เสมอ ไม่ใช่ตรวจแค่บทบาท (role) อย่างเดียว
6. **QA ไม่ใช่ role/entity ในระบบ:** งานประกันคุณภาพ (QA) เป็นผู้ตรวจสอบ/ประเมินผลจากรายงานที่ผู้บริหารหลักสูตรจัดทำ **อยู่นอกขอบเขตของระบบ ALIGN โดยเจตนา** — ไม่มี login, ไม่มี account, ไม่มีค่าใน `role` enum (หัวข้อ 2.12) และไม่มี endpoint ใดๆ ที่ให้ QA เข้าถึงระบบโดยตรง QA ได้รับเฉพาะเอกสาร Word ที่ `program_admin` ดาวน์โหลดจากระบบ (E5) แล้วส่งต่อภายนอกระบบด้วยตนเองเท่านั้น
7. **ขอบเขตของหัวข้อนี้:** เอกสารนี้ระบุเฉพาะกลไกควบคุมสิทธิ์ระดับออกแบบ (design-level access control) ยังไม่ครอบคลุมรายละเอียดเชิงกฎหมาย/นโยบายองค์กร (เช่น ระยะเวลาการเก็บข้อมูล, ขั้นตอนขอความยินยอม) ซึ่งควรปรึกษาหน่วยงานที่รับผิดชอบด้าน PDPA ของมหาวิทยาลัยเพิ่มเติมก่อนใช้งานจริง — ดู [[align-nfr|align-nfr]] §3 สำหรับค่าที่เสนอไว้ก่อน (retention 5 ปี, file size/type limit) ที่ยังต้องยืนยันตัวเลขซ้ำกับหน่วยงานนั้นก่อน implement จริง

---

ย้อนกลับไปยังต้นแบบหน้าจอที่เอกสารนี้ต่อยอดมา: [[../01-prototypes/align-app-screens|align-app-screens]]

ส่งต่อไปวางแผนการทดสอบใน [[../../03-testing/01-test-plan/index|01-test-plan]]

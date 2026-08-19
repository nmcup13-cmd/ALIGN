# Technical Design: ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)

ต่อยอดจากต้นแบบหน้าจอใน [[../01-prototypes/align-app-screens|align-app-screens]] และยึด [[../../01-requirements/01-spec/requirement-align|requirement-align]] เป็น source of truth — เอกสารนี้เป็นพิมพ์เขียวสำหรับทีมพัฒนา ยังไม่มีโค้ดจริง จึงเป็นข้อเสนอเชิงออกแบบที่ต้องยืนยันร่วมกับทีมพัฒนาก่อนเริ่มลงมือสร้างจริง โดยเฉพาะหัวข้อ "เทคโนโลยีที่เลือกใช้" ที่ระบุไว้ชัดเจนว่าเป็นข้อเสนอ

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
[ฐานข้อมูล          [AI Matching Service     [Evidence/File Storage
 เชิงสัมพันธ์          จับคู่ CLO/PLO +          เก็บชิ้นงาน/หลักฐานที่แนบ
 (Relational DB)]      คำนวณสัดส่วน/ความถี่      + ไฟล์ course syllabus
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
- **Evidence/File Storage แยกจาก DB เชิงสัมพันธ์** เพื่อให้ควบคุมสิทธิ์การเข้าถึงไฟล์ (ที่อาจมีข้อมูลส่วนบุคคลของนักศึกษา) ได้อย่างละเอียด ตาม PDPA (กฎ #5) โดย backend API เป็นประตูเดียวที่คุยกับ storage — ห้าม client เข้าถึง storage ตรง
- **Word-export Service อ่านเฉพาะข้อมูลที่ยืนยันแล้ว** (confirmed) ไม่ใช่ draft จาก AI เพื่อไม่ให้เอกสารอ้างอิงหลักฐานที่ยังไม่ผ่านการตรวจสอบ (กฎ #4)
- **งานประกันคุณภาพ (QA) ไม่ใช่ user/role ของระบบ ALIGN** — เอกสารที่ Word-export Service สร้างขึ้น (มคอ./QA ในไดอะแกรมด้านบน) มีไว้ให้ **ผู้บริหารหลักสูตร** เป็นผู้ดาวน์โหลดจากระบบแล้วนำไปส่งต่อให้ QA ใช้ตรวจสอบภายนอกระบบเท่านั้น QA ไม่มี login, ไม่มี account, และไม่มี endpoint ใดในระบบนี้ที่ให้ QA เข้าถึงโดยตรง (ตามขอบเขตในสเปค)

---

## 2. Database Schema

เอนทิตีหลักและความสัมพันธ์ (แสดงเฉพาะฟิลด์สำคัญ):

### 2.1 `curriculum` (หลักสูตร)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| curriculum_id | PK | รหัสหลักสูตร |
| year_code | enum('2565','2570') | ปีหลักสูตร — ค่าคงที่ 2 ค่าตามสเปค |
| name | string | ชื่อหลักสูตร |
| is_active | boolean | ใช้งานอยู่ปัจจุบันหรือไม่ |

### 2.2 `plo` (Program Learning Outcome)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| plo_id | PK | รหัส PLO |
| curriculum_id | FK → curriculum | **บังคับ** — PLO ต้องผูกกับหลักสูตรเดียวเสมอ |
| code | string | เช่น "PLO2" |
| description | text | คำอธิบาย PLO |

### 2.3 `clo` (Course Learning Outcome)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| clo_id | PK | รหัส CLO |
| course_id | FK → course | รายวิชาที่ CLO นี้สังกัด |
| curriculum_id | FK → curriculum | **denormalized จาก course.curriculum_id** เพื่อให้ query/ตรวจ constraint ข้าม curriculum ได้เร็วโดยไม่ต้อง join ทุกครั้ง |
| code | string | เช่น "CLO1" |
| description | text | คำอธิบาย CLO |

### 2.4 `clo_plo_mapping`
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| mapping_id | PK | รหัส mapping |
| clo_id | FK → clo | |
| plo_id | FK → plo | |
| confirmed_by | FK → user | ผู้ยืนยันการผูก (อาจารย์) |
| created_at | datetime | |

**Constraint สำคัญ (บังคับที่ระดับ application และควรบังคับด้วย DB constraint/trigger ถ้าเป็นไปได้):**
`clo_plo_mapping.clo.curriculum_id == clo_plo_mapping.plo.curriculum_id` เสมอ — ห้ามผูก CLO กับ PLO ต่างหลักสูตรกัน (ตรงกฎทางธุรกิจ + AB-03)

### 2.5 `course` (รายวิชา)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| course_id | PK | |
| curriculum_id | FK → curriculum | **บังคับ** — ทุกวิชาต้องระบุกลุ่มหลักสูตรก่อนป้อน CLO ได้ (AB-02) |
| code | string | รหัสวิชา |
| name | string | ชื่อวิชา |
| instructor_id | FK → user | อาจารย์ผู้สอนหลักของวิชา (ใช้ตรวจสิทธิ์ PDPA) |
| clo_plo_ready | boolean (computed) | true เมื่อมี CLO ≥1 ที่ผูกกับ PLO ≥1 แล้ว — ใช้เป็นเงื่อนไข gate ก่อนบันทึกการสอน (กฎ #1) |

### 2.6 `syllabus` (course syllabus — ข้อมูลหลักเพิ่มใหม่)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| syllabus_id | PK | |
| course_id | FK → course, unique | course syllabus ผูกกับรายวิชาแบบ 1:1 — ไม่มี `curriculum_id` แยก เพราะสืบทอด scope กลุ่มหลักสูตร (2565/2570) จาก `course.curriculum_id` โดยตรงอยู่แล้ว (เข้ากับหมายเหตุคุมเอกสารด้านบน ห้าม query ข้าม curriculum) |
| content | JSON/text (โครงสร้างยืดหยุ่น) | เนื้อหาแผนการสอน เก็บเป็นรายการหัวข้อ เช่น `[{week_no, topic, detail}]` — สเปค (AB-19) ไม่ได้กำหนดโครงสร้างข้อมูลที่แน่นอน จึงออกแบบเป็น JSON ยืดหยุ่นแทน schema ตายตัว ทีมพัฒนาปรับรายละเอียดฟิลด์ย่อยได้ตามฟอร์แมต syllabus จริงที่ใช้ |
| origin_file_ref | string, nullable | ตัวชี้ไฟล์ต้นฉบับที่อัปโหลด (ถ้าอาจารย์อัปโหลดไฟล์ syllabus แทน/ร่วมกับการป้อนเนื้อหาเอง) เก็บใน File Storage เดียวกันกับ evidence แต่เป็น pointer แยก — syllabus ไม่ใช่ชิ้นงานนักศึกษา จึงไม่ต้องมี flag PII เหมือน `evidence` |
| updated_by | FK → user | อาจารย์ผู้แก้ไขล่าสุด |
| updated_at | datetime | เวลาที่แก้ไข/อัปเดตล่าสุด — รองรับ AB-19 ที่อนุญาตแก้ไข syllabus เมื่อแผนการสอนเปลี่ยน (เก็บเป็น update-in-place ไม่ทำ version history) |

> **Accepted Risk (ตัดสินใจแล้ว — update-in-place ไม่มี version history)**: ถ้าอาจารย์แก้ไข `syllabus.content` กลางภาคการศึกษา ผลวิเคราะห์ gap ย้อนหลัง (`syllabus_gap_result` ของ `teaching_record` ที่บันทึกไว้ก่อนแก้ไข) จะถูกคำนวณ/แสดงผลโดยเทียบกับ **syllabus เวอร์ชันปัจจุบัน (ล่าสุด) เสมอ** ไม่ใช่เวอร์ชัน ณ ช่วงเวลาที่สอนจริง ซึ่งอาจทำให้ `missing_topics`/`extra_topics` ของสัปดาห์ที่ผ่านมาคลาดเคลื่อนหากมีการแก้ไขแผนการสอนภายหลัง — ยอมรับความเสี่ยงนี้เพราะสเปคไม่ได้กำหนดให้ต้องมี version history และเพื่อลดความซับซ้อนของ schema ในระยะแรก ถ้าพบว่าเป็นปัญหาจริงในการใช้งาน ให้พิจารณาเพิ่ม versioning ในเวอร์ชันถัดไป (ดู [[../../01-requirements/03-task/task-breakdown|task-breakdown]] T-067 ที่ปรับให้ตรงกับการตัดสินใจนี้แล้ว)

### 2.7 `teaching_record` (บันทึกการสอน)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| record_id | PK | |
| course_id | FK → course | ต้องเป็นวิชาที่ `clo_plo_ready = true` เท่านั้น (บังคับที่ backend ก่อน insert) |
| topic | string | หัวข้อการสอน |
| week_no | int | สัปดาห์ที่สอน (ใช้ทำแผนที่ CLO×สัปดาห์ และเทียบกับ `syllabus.content` สำหรับ gap analysis) |
| taught_at | date | วันที่สอนจริง (ไม่ใช่แผนล่วงหน้า) |
| created_by | FK → user | อาจารย์ผู้บันทึก |
| status | enum('draft_ai_pending','confirmed') | สถานะยืนยันผล AI |

### 2.8 `evidence` (ชิ้นงาน/หลักฐาน)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| evidence_id | PK | |
| teaching_record_id | FK → teaching_record | แนบได้หลายไฟล์ต่อ 1 บันทึกการสอน (AB-06) |
| file_ref | string | ตัวชี้ไฟล์ใน Evidence/File Storage (ไม่เก็บไฟล์จริงในตารางนี้) |
| file_name | string | |
| uploaded_by | FK → user | |
| uploaded_at | datetime | |
| contains_student_pii | boolean (default true, ระมัดระวังไว้ก่อน) | ใช้เป็น flag ประกอบการควบคุมสิทธิ์ PDPA |

### 2.9 `ai_match_result` (ผลจับคู่ CLO/PLO ต่อบันทึกการสอน 1 รายการ — draft/confirmed)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| match_result_id | PK | |
| teaching_record_id | FK → teaching_record | |
| clo_id | FK → clo | ต้องอยู่ใน curriculum เดียวกับ course ของ teaching_record (ตรวจตอนสร้าง) |
| match_confidence | decimal | ค่าความมั่นใจ/ความตรงที่ AI คำนวณสำหรับการจับคู่ **รายบันทึกการสอนนี้กับ CLO ข้อนี้โดยเฉพาะ** — เป็นสัญญาณเชิงเทคนิคภายใน **ไม่ใช่** ค่า "% ความสอดคล้อง" ระดับวิชาที่แสดงต่ออาจารย์ (ค่านั้นคำนวณจากสูตรใหม่ในหัวข้อ 2.10/4.2 โดยอิงจากจำนวน CLO ที่แมทช์ได้ ไม่ใช่ค่า confidence นี้) |
| linked_plo_ids | FK[] → plo | PLO ที่เชื่อมต่อจาก CLO นี้ (อยู่ curriculum เดียวกันเท่านั้น) |
| state | enum('draft','edited','confirmed','rejected') | **draft** = ผลตั้งต้นจาก AI ยังไม่ผ่านตรวจ; **edited** = อาจารย์แก้ไข match confidence/ปลด CLO ก่อนยืนยัน; **confirmed** = ยืนยันแล้ว ใช้เป็นข้อมูลจริง — CLO นี้จะถูกนับว่า "แมทช์แล้ว 1 ครั้ง" ในการคำนวณของ 2.10; **rejected** = อาจารย์ปฏิเสธผลจับคู่นี้ ไม่ถูกนับ |
| confirmed_by | FK → user, nullable | ต้อง not-null เมื่อ state = confirmed |
| confirmed_at | datetime, nullable | |

**กฎสำคัญ:** เฉพาะระเบียนที่ `state = 'confirmed'` เท่านั้นที่ถูกนำไปนับเป็น "การแมทช์" ของ CLO นั้นในการคำนวณ 2.10 (สัดส่วน % ระดับวิชา + ความถี่ที่แมทช์), แผนที่ CLO×สัปดาห์, และเอกสาร Word export — draft ที่ยังไม่ยืนยันจะไม่ถูกนับเป็นหลักฐานจริง (กฎ #3, #4)

### 2.10 `clo_coverage_summary` (สรุปสัดส่วน % ความสอดคล้อง + ความถี่ที่แมทช์ระดับวิชา — คำนวณ/derived)
เอนทิตีนี้เป็นค่าที่ **คำนวณ** จาก `ai_match_result` ที่ `state = 'confirmed'` เท่านั้น (อาจ implement เป็นตารางสรุปที่ recompute เป็นระยะ หรือเป็น query/materialized view แบบ near-real-time — ไม่ fix วิธี implement ในเอกสารนี้) ตามสูตรใหม่ใน AB-20/AB-21:

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| course_id | FK → course | ขอบเขตการคำนวณ = รายวิชา |
| clo_id | FK → clo | ต้องอยู่ curriculum เดียวกับ course (สืบทอดจาก 2.3) |
| total_clo_count | int | จำนวน CLO ทั้งหมดที่ผูกกับรายวิชานี้ (ฐาน 100% ตาม AB-20) — เท่ากันทุกแถวของ course เดียวกัน คำนวณจาก `COUNT(clo) WHERE clo.course_id = course_id` |
| match_frequency | int | จำนวนครั้งที่ CLO ข้อนี้ถูกจับคู่แล้ว **ยืนยันแล้ว** (`ai_match_result.state = 'confirmed'`) กับบันทึกการสอนของรายวิชานี้ตลอดภาคการศึกษา (AB-21) — นับจากหลายรายการ `teaching_record` ได้ ไม่ใช่แค่ครั้งเดียว |
| is_matched | boolean (derived) | `true` เมื่อ `match_frequency > 0` — ใช้เป็นตัวนับ CLO ที่ "แมทช์ได้จริง" ในสัดส่วนของวิชา |
| coverage_percent (ระดับวิชา, derived) | decimal | = (จำนวน CLO ที่ `is_matched = true` ของวิชานี้ ÷ `total_clo_count`) × 100 — นี่คือค่า "% ความสอดคล้อง" ตัวที่แสดงในแดชบอร์ด/เอกสาร (ไม่ใช่ `match_confidence` ใน 2.9) |

> **ต้องยืนยันกับทีมพัฒนา/ผู้เกี่ยวข้องก่อนเริ่มจริง (ยังไม่มีคำตอบชัดในสเปค):** "ความถี่ที่แมทช์" (`match_frequency`) นับข้าม **บันทึกการสอนกี่รายการ/ช่วงเวลาใด** — สเปค (AB-21, requirement E3) ระบุเพียงว่านับ "ตลอดภาคการศึกษา" แต่ไม่ได้กำหนดว่าถ้ามีหลายภาคการศึกษาซ้อนกันในรายวิชาเดียวกันจะแยก/รวมกันอย่างไร และไม่ได้กำหนด threshold ว่าความถี่เท่าไรถึงถือว่า "เพียงพอ" (AB-21 ระบุแค่ต้องให้อาจารย์เห็นค่าและยืนยันเอง) — เอกสารนี้จงใจไม่ฟันธง เก็บไว้เป็น field ให้ทีมพัฒนา/อาจารย์ตกลง scope ช่วงเวลาที่แน่นอนร่วมกันก่อน implement

### 2.11 `syllabus_gap_result` (ผลวิเคราะห์ gap เทียบ course syllabus — draft/confirmed, แยกจาก ai_match_result)
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| gap_result_id | PK | |
| course_id | FK → course | |
| syllabus_id | FK → syllabus | syllabus ที่ใช้เทียบ (ของรายวิชาเดียวกัน) |
| missing_topics | JSON list | หัวข้อใน `syllabus.content` ที่ยังไม่พบ `teaching_record` รองรับ (AB-22) |
| extra_topics | JSON list | หัวข้อที่มี `teaching_record` บันทึกจริง แต่ไม่พบใน `syllabus.content` (เนื้อหาที่สอนเพิ่มนอกแผน) |
| generated_at | datetime | เวลาที่ AI ประมวลผลรอบนี้ — วิเคราะห์จาก `teaching_record` ที่มีอยู่ ณ เวลานั้น |
| state | enum('draft','edited','confirmed','rejected') | รูปแบบเดียวกับ `ai_match_result` (2.9) — **draft** = ผลตั้งต้นจาก AI; **edited** = อาจารย์แก้ไขรายการหัวข้อที่ขาด/เกินก่อนยืนยัน; **confirmed** = ยืนยันแล้ว ใช้เป็นข้อมูลจริงในแดชบอร์ด/เอกสาร; **rejected** = ปฏิเสธผลรอบนี้ |
| confirmed_by | FK → user, nullable | ต้อง not-null เมื่อ state = confirmed |
| confirmed_at | datetime, nullable | |

**กฎสำคัญ:** เช่นเดียวกับ `ai_match_result` — เฉพาะ `state = 'confirmed'` เท่านั้นที่ถูกใช้ในแดชบอร์ด (AB-23) และเอกสาร Word export (Area of Improvement, AB-16); เป็นผลวิเคราะห์ **แยก** จากการจับคู่ CLO/PLO โดยสิ้นเชิง (กฎ #3, ตาม AB-10/AB-22)

### 2.12 `user` / role
| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| user_id | PK | |
| name / email | string | |
| role | enum('instructor','program_admin') | 2 บทบาทตามสเปค — `program_admin` คือผู้บริหารหลักสูตร (Program Administrator) อาจารย์ที่รับผิดชอบหลักสูตร ประสานหลักสูตร และจัดทำรายงานประเมินตนเอง (SAR) |
| program_admin_curriculum_scope | FK[] → curriculum, nullable | สำหรับ `program_admin` (ผู้บริหารหลักสูตร) — ระบุว่าดูแลหลักสูตรกลุ่มใด ใช้จำกัด scope การเข้าถึงข้อมูล/หลักฐานข้ามหลักสูตร |

> **หมายเหตุ — QA ไม่ใช่ role/entity ในระบบนี้:** งานประกันคุณภาพ (QA) **ไม่มี** account และ**ไม่ปรากฏ**เป็นค่าใน `role` enum ข้างต้น QA ไม่เคย login เข้าระบบ ALIGN โดยตรง — ได้รับเฉพาะเอกสาร Word ที่ `program_admin` ดาวน์โหลดจากระบบ (ดู E5 หัวข้อ 3) แล้วส่งต่อให้ QA ใช้ตรวจสอบภายนอกระบบเท่านั้น ห้ามเพิ่ม `qa` เป็นค่าใน enum หรือออกแบบ schema/endpoint ใดๆ ให้ QA เข้าถึงระบบ (ตามข้อ Out of Scope ในสเปค)

### 2.13 Access-control / PDPA (ผูกกับ evidence)
| ฟิลด์/แนวคิด | คำอธิบาย |
|---|---|
| `evidence_access_log` | ตาราง log แยก บันทึกทุกครั้งที่มีการเรียกดู/ดาวน์โหลดไฟล์หลักฐาน: `(log_id, evidence_id, accessed_by, accessed_at, action)` — ตาม AB-07 |
| กติกาสิทธิ์ | ผู้เข้าถึง `evidence` ได้ต้องเป็น (ก) `instructor_id` ของ course ที่ teaching_record นั้นสังกัด หรือ (ข) ผู้ใช้ role `program_admin` ที่มี `curriculum_id` ของ course นั้นอยู่ใน `program_admin_curriculum_scope` เท่านั้น — ตรวจที่ backend API layer ทุก endpoint ที่ return ไฟล์/URL ของ evidence (ดูหัวข้อ 3) |

**แผนภาพความสัมพันธ์แบบย่อ:**

```
curriculum 1──* plo
curriculum 1──* course 1──* clo
plo *──* clo          (ผ่าน clo_plo_mapping, บังคับ curriculum เดียวกัน)
course 1──1 syllabus
course 1──* teaching_record 1──* evidence
teaching_record 1──* ai_match_result *──1 clo
ai_match_result *──* plo   (ผ่าน linked_plo_ids)
course 1──* clo_coverage_summary *──1 clo   (derived จาก ai_match_result ที่ confirmed)
course 1──* syllabus_gap_result *──1 syllabus   (derived จาก teaching_record เทียบ syllabus.content)
user 1──* course (instructor_id)
user *──* curriculum (program_admin_curriculum_scope)
evidence 1──* evidence_access_log
```

---

## 3. API Design

รูปแบบ REST/JSON เป็นแนวทางหลัก (ยังไม่ fix เป็น spec สมบูรณ์ — ระบุ method + จุดประสงค์ + ฟิลด์สำคัญพอให้ทีมพัฒนาเริ่มออกแบบ endpoint จริงได้) จัดกลุ่มตาม Epic:

### E1 — ตั้งค่า CLO/PLO แยกตามหลักสูตร
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /curricula/{year}/plos` | เพิ่ม PLO ให้กลุ่มหลักสูตร 2565 หรือ 2570 | req: `{code, description}` (curriculum ระบุจาก path) |
| `GET /curricula/{year}/plos` | ดึงรายการ PLO ของหลักสูตรนั้น (ไม่ปนกลุ่มอื่น) | res: `[{plo_id, code, description}]` |
| `POST /courses` | สร้างรายวิชา ต้องระบุ `curriculum_id` | req: `{code, name, curriculum_id, instructor_id}` |
| `POST /courses/{id}/clos` | เพิ่ม CLO ให้วิชา (tag curriculum ตามวิชาอัตโนมัติ) | req: `{code, description}` |
| `POST /courses/{id}/clo-plo-mappings` | ผูก CLO–PLO | req: `{clo_id, plo_id}` — backend ต้อง validate `clo.curriculum_id == plo.curriculum_id` มิฉะนั้น 422 |
| `GET /courses/{id}/setup-status` | เช็คว่าวิชาผูก CLO–PLO ครบเงื่อนไข (gate ก่อนบันทึกการสอน) หรือยัง | res: `{clo_plo_ready: boolean}` |
| `GET /curricula/{year}/courses/status-overview` | ภาพรวมความครบถ้วนการตั้งค่าของทุกวิชาในกลุ่มหลักสูตร (สำหรับผู้บริหารหลักสูตร/`program_admin`, AB-04) | res: `[{course_id, name, clo_plo_ready}]` |
| `PUT /courses/{id}/syllabus` | ป้อน/แก้ไข course syllabus ของรายวิชา (สร้างใหม่ถ้ายังไม่มี, อัปเดตทับถ้ามีอยู่แล้ว) — ใหม่ตาม AB-19 | req: `{content: [{week_no, topic, detail}]}` → res: `{syllabus_id, updated_at}` |
| `POST /courses/{id}/syllabus/upload` | อัปโหลดไฟล์ syllabus ต้นฉบับ (ทางเลือกเสริมจากป้อนเนื้อหาเอง) — backend เก็บไฟล์ที่ File Storage แล้วบันทึก `origin_file_ref`; วิธีสกัดเนื้อหา/โครงสร้างจากไฟล์ (parsing) ยังไม่ระบุในสเปค ต้องตกลงกับทีมพัฒนาก่อนเริ่มจริง | req: multipart file → res: `{syllabus_id, origin_file_ref}` |
| `GET /courses/{id}/syllabus` | ดึง course syllabus ปัจจุบันของรายวิชา (ใช้แสดงในหน้าจัดการวิชา และเป็น input ให้ AI gap analysis ใน E3) | res: `{syllabus_id, content, origin_file_ref, updated_at}` |

### E2 — บันทึกการสอน + แนบหลักฐาน
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /courses/{id}/teaching-records` | บันทึกการสอน — backend ปฏิเสธ (409) ถ้า `clo_plo_ready = false` | req: `{topic, week_no, taught_at}` |
| `POST /teaching-records/{id}/evidence` | แนบไฟล์หลักฐาน (เรียกซ้ำได้หลายไฟล์) | req: multipart file → res: `{evidence_id, file_name}` |
| `DELETE /teaching-records/{id}/evidence/{evidence_id}` | ลบไฟล์ที่แนบผิดก่อนยืนยันบันทึก | — |
| `GET /teaching-records/{id}/evidence` | ดูรายชื่อไฟล์ที่แนบ (เฉพาะผู้มีสิทธิ์ตาม PDPA) | res: `[{evidence_id, file_name, uploaded_at}]` |
| `GET /evidence/{id}/download` | ดาวน์โหลดไฟล์หลักฐาน — backend ตรวจสิทธิ์ตามหัวข้อ 2.13 ก่อน proxy ไปยัง storage ทุกครั้ง และเขียน `evidence_access_log` | — |

### E3 — AI ประมวลผลจับคู่ CLO/PLO + วิเคราะห์ gap เทียบ course syllabus
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /teaching-records/{id}/ai-match` | สั่งให้ AI Matching Service ประมวลผล — backend ส่งเฉพาะ CLO ของ curriculum เดียวกับวิชานั้น | res: `[{clo_id, match_confidence, linked_plo_ids, state:"draft"}]` — สร้างระเบียน `ai_match_result` state=draft |
| `GET /teaching-records/{id}/ai-match-results` | ดึงผลจับคู่ล่าสุด (draft หรือ confirmed) เพื่อแสดงในหน้าบันทึกการสอน | res: รายการ ai_match_result |
| `PATCH /ai-match-results/{id}` | อาจารย์แก้ไข match confidence/ปลด CLO ก่อนยืนยัน (state → edited) | req: `{match_confidence?, remove: boolean}` |
| `POST /ai-match-results/{id}/confirm` | ยืนยันผล (state → confirmed, บันทึก confirmed_by/at) — **จุดเดียวที่ทำให้ผล AI กลายเป็นข้อมูลจริง**, CLO นี้ถูกนับเข้า `match_frequency`/`coverage_percent` ของวิชา (กฎ #3) | — |
| `POST /ai-match-results/{id}/reject` | ปฏิเสธผลจับคู่ที่ผิด (state → rejected, ไม่ถูกนับเป็นหลักฐาน) | — |
| `GET /courses/{id}/clo-coverage` | ดึงสัดส่วน % ความสอดคล้องระดับวิชา (ฐาน `total_clo_count` = 100%) พร้อมความถี่ที่แมทช์ต่อ CLO — คำนวณจาก `ai_match_result` ที่ confirmed เท่านั้น (ตามสูตร AB-20/AB-21, หัวข้อ 2.10) | res: `{course_id, total_clo_count, matched_clo_count, coverage_percent, per_clo: [{clo_id, match_frequency, is_matched}]}` |
| `POST /courses/{id}/syllabus-gap-analysis` | สั่งให้ AI เปรียบเทียบ `teaching_record` ทั้งหมดของวิชา (ที่บันทึกจริง) กับ `syllabus.content` — ต้องมี syllabus ของวิชานี้แล้ว (ไม่เช่นนั้น 409) — งานแยกจาก ai-match (AB-22) | res: `{missing_topics, extra_topics, state:"draft"}` — สร้างระเบียน `syllabus_gap_result` state=draft |
| `GET /courses/{id}/syllabus-gap-results` | ดึงผลวิเคราะห์ gap ล่าสุด (draft หรือ confirmed) | res: รายการ syllabus_gap_result |
| `PATCH /syllabus-gap-results/{id}` | อาจารย์แก้ไขรายการหัวข้อที่ขาด/เกินก่อนยืนยัน (state → edited) | req: `{missing_topics?, extra_topics?}` |
| `POST /syllabus-gap-results/{id}/confirm` | ยืนยันผล gap analysis (state → confirmed) — เช่นเดียวกับ ai-match ต้องผ่านอาจารย์ก่อนใช้เป็นหลักฐานทางการ (กฎ #3) | — |
| `POST /syllabus-gap-results/{id}/reject` | ปฏิเสธผลวิเคราะห์ gap รอบนี้ (state → rejected) | — |

### E4 — แดชบอร์ดและแจ้งเตือน
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `GET /me/dashboard` | หน้าแรกอาจารย์: % ความสอดคล้องรวม (ตามสูตรใหม่ 2.10/AB-20), รายวิชาที่สอน, แจ้งเตือน CLO ขาดหลักฐาน | res: `{courses:[{course_id, curriculum_year, coverage_percent, matched_clo_count, total_clo_count}], gap_alerts:[{clo_id, code, course_id}]}` |
| `GET /courses/{id}/clo-week-map` | แผนที่ CLO×สัปดาห์ + จำนวนชิ้นงานสะสม + สถานะเชื่อม PLO | res: `[{clo_id, week_no, evidence_count, linked_plo_status}]` |
| `GET /curricula/{year}/dashboard` | ภาพรวมความสอดคล้องระดับหลักสูตร แยกกลุ่ม (สำหรับผู้บริหารหลักสูตร/`program_admin`, AB-14) — ตรวจ scope สิทธิ์ก่อนตอบ | res: `{curriculum_id, courses:[{course_id, coverage_percent}]}` |
| `GET /courses/{id}/teaching-vs-syllabus` | **ใหม่ (AB-23)** — ส่วนเปรียบเทียบ "การสอนจริงที่บันทึก" กับ "CLO/course syllabus" สำหรับแดชบอร์ด แยกจากส่วน % ความสอดคล้องรวม (AB-11) และแจ้งเตือน CLO ขาดหลักฐาน (AB-12) อย่างชัดเจน — อ่านเฉพาะ `syllabus_gap_result` ที่ `state = 'confirmed'` เท่านั้น | res: `{course_id, missing_topics_count, extra_topics_count, missing_topics:[...], extra_topics:[...], last_confirmed_at}` — ถ้ายังไม่มีผลที่ confirmed ให้ตอบสถานะ `not_yet_confirmed` แทนตัวเลข |

หมายเหตุ: `gap_alerts` คำนวณจาก query แบบ near-real-time (เช่น เมื่อโหลดแดชบอร์ดหรือ trigger หลังบันทึกการสอน/ยืนยันผล AI) เพื่อให้ตรงกฎ #2 ที่ต้องแจ้งทันที ไม่ใช่ batch job รายวัน — ส่วนเปรียบเทียบ `teaching-vs-syllabus` เป็นคนละส่วนกับ `gap_alerts`: `gap_alerts` แจ้งเตือน "CLO ที่ไม่มีข้อมูลการสอน/หลักฐานรองรับเลย" (กฎ #2) ในขณะที่ `teaching-vs-syllabus` เทียบ "เนื้อหาที่สอนจริง" กับ "แผน syllabus" (หัวข้อขาด/หัวข้อเกิน — AB-22/AB-23) ทั้งสองใช้ข้อมูลคนละชุดและต้องแสดงแยกส่วนกันในหน้าจอ

### E5 — ออกเอกสาร Word
| Method & Path | จุดประสงค์ | Request/Response สำคัญ |
|---|---|---|
| `POST /courses/{id}/export-word` | สร้างเอกสารสรุป CLO/PLO ของวิชา — อ่านเฉพาะ `ai_match_result.state = 'confirmed'`, `clo_coverage_summary` ที่ได้จากค่า confirmed, `syllabus_gap_result.state = 'confirmed'` (สำหรับส่วน Area of Improvement ตาม AB-16), และ evidence ที่แนบจริง | req: `{include_area_of_improvement: boolean}` (AB-18) → res: `{file_url}` หรือไฟล์ตรง |
| `GET /export-jobs/{id}` | เช็คสถานะงานสร้างเอกสาร (ถ้าออกแบบเป็น async job) | res: `{status, download_url}` |
| `GET /curricula/{year}/courses/{id}/export-word` (program_admin) | ผู้บริหารหลักสูตร (`program_admin`) ดาวน์โหลดเอกสารของวิชาที่ตนดูแลตาม scope เพื่อนำไปส่งต่อ QA ภายนอกระบบ | ตรวจ `program_admin_curriculum_scope` ก่อนตอบ (กฎ #5) |

ทุก endpoint ที่แตะ `evidence` หรือ export เอกสาร ต้องผ่าน middleware ตรวจสิทธิ์ตามบทบาท+scope ก่อนถึง business logic เสมอ

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
4. `match_frequency` ต่อ CLO = จำนวนรายการ `ai_match_result` ที่ confirmed ทั้งหมดสำหรับ CLO นั้น (นับข้ามหลาย `teaching_record` ได้) — แสดงประกอบ `coverage_percent` เสมอ ไม่ใช่แสดงแยกเดี่ยว (AB-21)

ค่าที่ได้ทั้งหมดข้อ 1–4 (`clo_coverage_summary`, หัวข้อ 2.10) จึง**สืบทอด human-in-the-loop จาก `ai_match_result` โดยอัตโนมัติ** — เพราะคำนวณจากเฉพาะรายการที่อาจารย์ยืนยันแล้วเท่านั้น ไม่ต้องมีขั้นตอนยืนยันซ้ำอีกชั้น แต่ยังต้องแสดงค่าให้อาจารย์ตรวจสอบก่อนนำไปอ้างอิงในเอกสารทางการเสมอตาม AB-20/AB-21

> **ยังไม่ฟันธง — ต้องยืนยันกับทีมพัฒนาก่อนเริ่มจริง:** นิยามที่แน่นอนของ "ความถี่ที่แมทช์" (นับข้ามกี่ `teaching_record`/ช่วงเวลาใดถึงเรียกว่า "ตลอดภาคการศึกษา" เมื่อมีหลายภาคการศึกษาในวิชาเดียวกัน) ดูรายละเอียดที่ flag ไว้ในหัวข้อ 2.10

### 4.3 วิเคราะห์ Gap เทียบ course syllabus (แยกจาก CLO/PLO matching — AB-22)

**Input ต่อการเรียกใช้งาน 1 ครั้ง (ระดับรายวิชา ไม่ใช่ระดับบันทึกการสอนเดียว):**
- เนื้อหา course syllabus **เวอร์ชันปัจจุบัน** ของรายวิชานั้น (`syllabus.content` — update-in-place ไม่มี version history ดู Accepted Risk ที่ §2.6)
- หัวข้อการสอนจริงทั้งหมดที่บันทึกไว้ของรายวิชานั้น (`teaching_record.topic` ทุกรายการ ณ เวลาที่ประมวลผล)

**Output:**
- `missing_topics` — หัวข้อใน syllabus ที่ยังไม่พบ `teaching_record` รองรับ
- `extra_topics` — หัวข้อที่สอนจริงแต่ไม่มีใน syllabus (เนื้อหาที่เพิ่มนอกแผน)

ผลลัพธ์ถูกเขียนเป็น `syllabus_gap_result` ที่ `state = 'draft'` เท่านั้น เช่นเดียวกับ 4.1 — ต้องรอ `POST /syllabus-gap-results/{id}/confirm` โดยอาจารย์ก่อนนำไปใช้ในแดชบอร์ด (AB-23) หรือเอกสาร Area of Improvement (AB-16)

**ข้อเสนอ — ยืนยันกับทีมพัฒนาก่อนเริ่มจริง:** รายละเอียดโมเดล AI ที่ใช้ทั้งงานจับคู่ CLO/PLO (4.1) และงานวิเคราะห์ gap (4.3) เช่น text embedding + similarity scoring, หรือเรียก LLM API ภายนอก ยังไม่ได้ระบุในสเปค เอกสารนี้จงใจอธิบายเฉพาะ contract (input/output/state) ไม่ผูกกับโมเดลใดโมเดลหนึ่ง เพื่อให้ทีมพัฒนาเลือกเทคนิคที่เหมาะสมได้อิสระ ขอเพียงคง constraint เรื่อง curriculum scope และ human-in-the-loop ไว้เสมอทั้งสองงาน

---

## 5. Tech Stack — ข้อเสนอ (ยืนยันกับทีมพัฒนาก่อนเริ่มจริง)

> หัวข้อนี้ทั้งหมดเป็น**ข้อเสนอ**เท่านั้น ยังไม่มีการตัดสินใจจริงจากทีมพัฒนา — เลือกจาก pattern ที่พบทั่วไปสำหรับ web app + backend API + relational DB + document-generation ลักษณะนี้ ไม่ใช่ข้อสรุปสุดท้าย

| ส่วนประกอบ | ข้อเสนอ | เหตุผลคร่าวๆ |
|---|---|---|
| Frontend | Web app (SPA) เช่น React/Vue หรือ framework ที่ทีมคุ้นเคย | ต้องรองรับหน้าจอเชิงโต้ตอบ (แก้ไขผล AI ก่อนยืนยัน, ตารางแผนที่ CLO×สัปดาห์) ซึ่งเหมาะกับ SPA มากกว่า server-rendered ล้วน |
| Backend API | REST API บน framework เชิง object-oriented หรือ Node.js/Python framework ที่ทีมคุ้นเคย | ต้องมี middleware สำหรับสิทธิ์ตามบทบาท/PDPA ได้ง่าย และ ecosystem ไลบรารีสร้างเอกสาร Word ที่พร้อมใช้ |
| ฐานข้อมูล | Relational DB (เช่น PostgreSQL/MySQL) | โมเดลข้อมูลเป็นเชิงสัมพันธ์ชัดเจน (curriculum → PLO/CLO → mapping → course → teaching_record) และต้องบังคับ constraint เรื่อง curriculum เดียวกันได้แน่นหนา ซึ่ง RDBMS รองรับผ่าน foreign key + check constraint ได้ตรงจุด |
| Evidence/File Storage | Object storage (เช่น S3-compatible) แยกจาก DB หลัก + ควบคุมสิทธิ์ผ่าน backend (signed URL ระยะสั้น หรือ proxy download) | ไฟล์ชิ้นงานมีขนาด/ชนิดหลากหลาย และต้องคุมสิทธิ์เข้าถึงตาม PDPA ได้ละเอียดกว่าเก็บเป็น BLOB ใน DB |
| AI Matching Service | บริการแยก (internal service หรือเรียก LLM API ภายนอก) อยู่หลัง backend API เท่านั้น ไม่ให้ frontend เรียกตรง | แยก concern และควบคุม scope ข้อมูล (ส่งเฉพาะ CLO ของ curriculum ที่ถูกต้อง) ได้ง่ายกว่าให้ client คุยตรงกับ AI |
| Word-export Service | ไลบรารี generate เอกสาร Word ฝั่ง backend (เช่น ไลบรารีสร้าง .docx จาก template) | ต้อง generate เอกสารตาม template มคอ./QA ที่มีรูปแบบคงที่ และอ่านข้อมูลจาก DB โดยตรงได้สะดวกกว่าทำฝั่ง client |
| Auth | Session/token-based authentication พร้อม role (`instructor`/`program_admin`) และ scope (`program_admin_curriculum_scope`) แนบใน token/session | ต้องใช้ตรวจสิทธิ์ในทุก endpoint ที่แตะ evidence/เอกสารส่งออก — QA ไม่มี account จึงไม่มี role สำหรับ QA ในระบบนี้ |

---

## 6. PDPA / Security Note

เอกสารนี้ยึดกฎทางธุรกิจ #5 (ข้อมูลส่วนบุคคลของนักศึกษาต้องเข้าถึงแบบจำกัดสิทธิ์) เป็นหลัก และแปลงเป็นกลไกระดับออกแบบดังนี้:

1. **ขอบเขตสิทธิ์ (Authorization scope):** ผู้ใช้ที่เข้าถึงข้อมูล `evidence` ของวิชาใดวิชาหนึ่งได้ ต้องเป็น (ก) อาจารย์ที่เป็น `instructor_id` ของ `course` นั้น หรือ (ข) ผู้บริหารหลักสูตร (`program_admin`) ที่มี `curriculum_id` ของ `course` นั้นอยู่ใน `program_admin_curriculum_scope` ของตนเองเท่านั้น — ตรวจที่ backend API layer ทุกครั้ง (ดูหัวข้อ 3) ไม่ใช่พึ่งการซ่อน UI ฝั่ง frontend อย่างเดียว
2. **ห้ามเข้าถึง storage ตรง:** client (frontend) ไม่มีสิทธิ์อ่านไฟล์จาก Evidence/File Storage โดยตรง ต้องผ่าน backend API เท่านั้น (proxy download หรือ signed URL ที่หมดอายุเร็ว) เพื่อให้ทุกการเข้าถึงถูกตรวจสิทธิ์และบันทึก log ได้
3. **Audit log:** ทุกครั้งที่มีการเรียกดู/ดาวน์โหลดหลักฐาน ต้องเขียนลง `evidence_access_log` (ใคร, เมื่อไร, ไฟล์ไหน) เพื่อตรวจสอบย้อนหลังได้ ตาม AB-07
4. **Flag ข้อมูลส่วนบุคคล:** ตาราง `evidence` มีฟิลด์ `contains_student_pii` (default true) เพื่อเตือนทีมพัฒนา/ผู้ดูแลระบบว่าไฟล์เหล่านี้ต้องได้รับการปฏิบัติเป็นข้อมูลอ่อนไหวเสมอ แม้จะยังไม่ได้ตรวจสอบเนื้อหาจริงทีละไฟล์
5. **แยก scope ตามหลักสูตร:** เนื่องจากผู้บริหารหลักสูตร (`program_admin`) อาจดูแลเฉพาะหลักสูตร 2565 หรือ 2570 (ไม่จำเป็นต้องดูแลทั้งสองกลุ่ม) การตรวจสิทธิ์ระดับ endpoint ของ dashboard/export ระดับหลักสูตร (`/curricula/{year}/...`) ต้องตรวจ `program_admin_curriculum_scope` ควบคู่กับสิทธิ์ evidence เสมอ ไม่ใช่ตรวจแค่บทบาท (role) อย่างเดียว
6. **QA ไม่ใช่ role/entity ในระบบ:** งานประกันคุณภาพ (QA) เป็นผู้ตรวจสอบ/ประเมินผลจากรายงานที่ผู้บริหารหลักสูตรจัดทำ **อยู่นอกขอบเขตของระบบ ALIGN โดยเจตนา** — ไม่มี login, ไม่มี account, ไม่มีค่าใน `role` enum (หัวข้อ 2.12) และไม่มี endpoint ใดๆ ที่ให้ QA เข้าถึงระบบโดยตรง QA ได้รับเฉพาะเอกสาร Word ที่ `program_admin` ดาวน์โหลดจากระบบ (E5) แล้วส่งต่อภายนอกระบบด้วยตนเองเท่านั้น
7. **ขอบเขตของหัวข้อนี้:** เอกสารนี้ระบุเฉพาะกลไกควบคุมสิทธิ์ระดับออกแบบ (design-level access control) ยังไม่ครอบคลุมรายละเอียดเชิงกฎหมาย/นโยบายองค์กร (เช่น ระยะเวลาการเก็บข้อมูล, ขั้นตอนขอความยินยอม) ซึ่งควรปรึกษาหน่วยงานที่รับผิดชอบด้าน PDPA ของมหาวิทยาลัยเพิ่มเติมก่อนใช้งานจริง

---

ย้อนกลับไปยังต้นแบบหน้าจอที่เอกสารนี้ต่อยอดมา: [[../01-prototypes/align-app-screens|align-app-screens]]

ส่งต่อไปวางแผนการทดสอบใน [[../../03-testing/01-test-plan/index|01-test-plan]]

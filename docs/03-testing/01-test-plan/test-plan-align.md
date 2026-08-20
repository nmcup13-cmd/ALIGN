# Test Plan: ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)

แตกมาจาก Acceptance Criteria ใน [[../../01-requirements/02-plan/product-backlog|product-backlog]] (AB-01 ถึง AB-27 **ไม่รวม AB-18** ที่ถูกตัดออกจากขอบเขตทั้งหมดแล้ว — ผู้ใช้ยืนยัน 2026-08-20 ว่าไม่ต้องการฟีเจอร์ toggle รวม/ไม่รวม Area of Improvement ดู [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived/backlog-ab-18-area-of-improvement-toggle]]) อ้างอิงกฎทางธุรกิจ #1–#6 และ User Roles ใน [[../../01-requirements/01-spec/requirement-align|requirement-align]] และยึด entity/state จริงตาม [[../../02-design/02-technical/align-technical-design|align-technical-design]] (`ai_match_result`, `syllabus_gap_result`, `clo_coverage_summary`, `user.account_status` ฯลฯ) รวมถึงชื่อ state ฝั่ง UI (Draft/Confirmed) ตาม `DESIGN.md`

นี่คือ **Test Plan ฉบับแรก** ของโปรเจกต์ (ยังไม่มีการทดสอบจริงเกิดขึ้น เพราะยังไม่มีแอปพลิเคชันจริง — เอกสารนี้เตรียมพร้อมไว้ล่วงหน้าให้ทีมพัฒนาใช้อ้างอิงทันทีที่มีระบบให้ทดสอบ)

---

## 1. ขอบเขตการทดสอบ (Scope)

### In Scope
- Test case เชิงฟังก์ชัน (functional) ครอบคลุม Acceptance Criteria ของ **User Story ทั้ง 26 เรื่อง (AB-01–AB-27 ไม่รวม AB-18)** ใน Epic E1–E6
- Test case ปฏิเสธ/ละเมิดกฎทางธุรกิจ (negative/rejection) สำหรับกฎที่เป็นเงื่อนไขบังคับ โดยเฉพาะ:
  - ผูก CLO–PLO ก่อนบันทึกการสอน (BR#1) และห้ามผูกข้ามกลุ่มหลักสูตร 2565↔2570
  - แจ้งเตือน CLO ที่ไม่มีหลักฐาน (BR#2)
  - AI เป็นค่าตั้งต้น ต้องยืนยันก่อนเสมอ / ห้ามบันทึกผล AI (match, %, ความถี่, gap) ทันทีโดยไม่ผ่านการยืนยัน (BR#3)
  - เอกสารส่งออกอ้างอิงเฉพาะหลักฐานจริง (BR#4)
  - จำกัดสิทธิ์เข้าถึงหลักฐาน/รายงานตาม PDPA (BR#5)
  - บัญชีที่สมัครเองต้องผ่านการอนุมัติจากผู้บริหารหลักสูตรก่อนเข้าถึงฟีเจอร์ใดๆของระบบ — บัญชี "รออนุมัติ"/"ถูกปฏิเสธ" ต้องถูกปิดกั้นทุก request ไม่ใช่แค่ตอน login (BR#6, E6)
- การแยกข้อมูล/สิทธิ์ตามกลุ่มหลักสูตร 2565/2570 ในทุกจุดที่ปรากฏ (cross-cutting ทุก Epic)
- สถานะ Draft vs Confirmed ต้องแยกกันถูกต้องตาม `DESIGN.md` (UX Rule 4.1) ทุกจุดที่แสดงผลจาก AI

### Out of Scope (ของรอบทดสอบนี้)
- **Performance/Load testing** และ **ความแม่นยำเชิงสถิติของโมเดล AI** (precision/recall ของการจับคู่ CLO/gap analysis) — สเปคไม่ได้กำหนดเกณฑ์ตัวเลขความแม่นยำที่ต้องผ่าน จึงทดสอบได้เฉพาะ **contract เชิงพฤติกรรม** (draft ต้องรอยืนยัน, ใช้เฉพาะ CLO ใน curriculum เดียวกัน ฯลฯ) ไม่ใช่ความถูกต้องของผลลัพธ์ AI เอง
- **สิทธิ์/บัญชีผู้ใช้สำหรับงานประกันคุณภาพ (QA)** — QA ไม่ใช่ user ของระบบ ALIGN, ไม่มี login/role ในระบบ (ตามสเปค Out of Scope และ `align-technical-design.md` §2.12) จึง **ไม่มี** test case ใดที่จำลอง QA ยืนยันตัวตนหรือเรียก endpoint ของระบบโดยตรง — มีเพียง test case ตรวจว่าเอกสารที่ผู้บริหารหลักสูตรดาวน์โหลดไปส่งต่อ QA ภายนอกระบบมีข้อมูลถูกต้อง (AB-17)
- ระบบจัดตารางสอน, ระบบให้คะแนน/เกรดรายบุคคล, ระบบบริหารจัดการหลักสูตรเต็มรูปแบบ (มคอ.2) — อยู่นอกขอบเขตสเปคทั้งหมด ไม่มี test case
- การทดสอบ formatting/binary ของไฟล์ .docx ที่สร้างจริง (เช่น layout, ฟอนต์) — ทดสอบเฉพาะ **เนื้อหา/ข้อมูลอ้างอิง** ที่ต้องปรากฏ/ห้ามปรากฏในเอกสารเท่านั้น
- Visual regression / pixel-level UI testing เทียบ `DESIGN.md` — ใช้ `DESIGN.md` อ้างอิงชื่อ state/คำที่ต้องปรากฏ (เช่น badge "Draft"/"Confirmed") เท่านั้น ไม่ทดสอบสี/ระยะห่างจริง
- รายละเอียดที่ยังเป็นคำถามเปิด (ดูหัวข้อ 6) — เขียนเป็น test case แบบ placeholder เท่านั้น ยังไม่ยืนยันผลลัพธ์ที่คาดหวังที่แน่นอน
- **AB-18** (ตัวเลือกรวม/ไม่รวม Area of Improvement ตอน export) — ผู้ใช้ยืนยัน (2026-08-20) ว่าไม่ต้องการฟีเจอร์นี้ ถูกตัดออกจาก scope ทั้งหมด ไม่มี test case ใดทดสอบ toggle นี้อีก (test case เดิมถูกย้ายไปที่ [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived/backlog-ab-18-area-of-improvement-toggle]]) — พฤติกรรมที่ถูกต้องคือเอกสาร Word export แสดง Area of Improvement เสมอ ตรวจสอบด้วย TC-AB16-06 ใน [[e5-word-export|e5-word-export]] แทน

---

## 2. บทบาทผู้ใช้ที่ใช้ในการทดสอบ (Test Roles)

| รหัส | บทบาท | ขอบเขต |
|---|---|---|
| `U-INSTR-A` | อาจารย์ผู้สอน (Instructor) | สอน `COS101` (หลักสูตร 2565) และ `COS301` (หลักสูตร 2570) |
| `U-INSTR-B` | อาจารย์ผู้สอน (Instructor) | สอน `COS201` (หลักสูตร 2565) เท่านั้น — ใช้ทดสอบว่าเข้าถึงข้อมูล/หลักฐานของวิชาที่ตนไม่ได้สอนไม่ได้ (PDPA) |
| `U-PA-2565` | ผู้บริหารหลักสูตร (Program Administrator) | `program_admin_curriculum_scope = [2565]` เท่านั้น |
| `U-PA-2570` | ผู้บริหารหลักสูตร (Program Administrator) | `program_admin_curriculum_scope = [2570]` เท่านั้น |

**หมายเหตุ**: ไม่มี test role สำหรับ QA เพราะ QA ไม่ authenticate กับระบบ (ดู Out of Scope หัวข้อ 1)

**หมายเหตุ**: ทุกบัญชีข้างต้น (`U-INSTR-A`, `U-INSTR-B`, `U-PA-2565`, `U-PA-2570`) สมมติว่ามี `account_status = 'approved'` อยู่แล้วเป็นค่าตั้งต้น (E1–E5 ทุก test case ในเอกสารนี้ตั้งอยู่บนสมมติฐานนี้) — บัญชีที่อยู่ในสถานะ `pending`/`rejected` (`U-PENDING`, `U-REJECTED`) และผู้สมัครใหม่ (`U-NEWREG`) เป็น test role เฉพาะของ Epic E6 เท่านั้น กำหนดไว้ใน [[e6-user-registration-approval|e6-user-registration-approval]]

---

## 3. ชุดข้อมูลทดสอบ (Test Data) ที่ต้องเตรียมล่วงหน้า

### 3.1 หลักสูตรและ PLO
| รหัส | ปีหลักสูตร | PLO ที่ตั้งไว้ |
|---|---|---|
| `CUR-2565` | 2565 (เก่า) | `PLO1565-1`, `PLO1565-2`, `PLO1565-3`, `PLO1565-4` (4 ข้อ) |
| `CUR-2570` | 2570 (ใหม่) | `PLO1570-1`, `PLO1570-2`, `PLO1570-3` (3 ข้อ) |

> จงใจให้จำนวน PLO ของสองกลุ่ม **ไม่เท่ากัน** เพื่อให้ตรวจจับได้ทันทีถ้าเกิดการ merge/query ข้ามกลุ่มโดยไม่ตั้งใจ

### 3.2 รายวิชา (Course)
| รหัส | ชื่อวิชา | หลักสูตร | อาจารย์ | จำนวน CLO | สถานะผูก CLO–PLO | Course Syllabus |
|---|---|---|---|---|---|---|
| `COS101` | หลักการเขียนโปรแกรม | 2565 | `U-INSTR-A` | CLO1–CLO4 (4 ข้อ) | ผูกครบทั้ง 4 ข้อกับ PLO ของ `CUR-2565` | มี (15 สัปดาห์ตัวอย่าง — ดู 3.4) |
| `COS102` | วิชานำร่อง (ยังไม่ตั้งค่าอะไรเลย) | 2565 | `U-INSTR-A` | **ไม่มี CLO เลย (0 ข้อ)** — edge case | ยังไม่มี CLO ให้ผูก | ไม่มี |
| `COS301` | การพัฒนาเว็บสมัยใหม่ | 2570 | `U-INSTR-A` | CLO1–CLO3 (3 ข้อ) | ผูกครบกับ PLO ของ `CUR-2570` | มี (12 สัปดาห์) |
| `COS201` | ฐานข้อมูล | 2565 | `U-INSTR-B` | CLO1–CLO3 | ผูกครบกับ PLO ของ `CUR-2565` | มี |

**CLO–PLO mapping ของ `COS101`** (ใช้ซ้ำในหลาย test case):
- CLO1 → PLO1565-1
- CLO2 → PLO1565-2
- CLO3 → PLO1565-2, PLO1565-3
- CLO4 → PLO1565-4 — **ตั้งใจไม่ให้มี teaching_record/หลักฐานใดๆ รองรับตลอดภาคการศึกษา** (ใช้ทดสอบการแจ้งเตือนตาม BR#2 — ตรงกับตัวอย่าง "CLO 4" ในสเปคต้นฉบับ)

### 3.3 ผู้ใช้/สิทธิ์เพิ่มเติมสำหรับทดสอบ CLO ที่ยังไม่มีกลุ่มหลักสูตร
| รหัส | รายละเอียด |
|---|---|
| `COS-DRAFT` | รายวิชาที่สร้างแล้วแต่ **ยังไม่ระบุกลุ่มหลักสูตร** (edge case สำหรับ AB-08: "หากรายวิชายังไม่ระบุกลุ่มหลักสูตร ระบบต้องไม่ประมวลผล AI") |

### 3.4 Course Syllabus ตัวอย่าง (`COS101`) — ใช้กับ AB-19/AB-22/AB-23
โครงสร้างสมมติตามที่ `align-technical-design.md` §2.6 เสนอไว้ (`[{week_no, topic, detail}]`) — **โครงสร้างจริงยังเป็นคำถามเปิด** (ดูหัวข้อ 6.2) ใช้ตัวอย่างนี้เพื่อให้เขียน test case เชิงพฤติกรรมได้ก่อน:

```json
[
  {"week_no": 1,  "topic": "แนะนำภาษา Python และเครื่องมือพัฒนา"},
  {"week_no": 5,  "topic": "การเขียนโปรแกรมเชิงวัตถุ (OOP) เบื้องต้น"},
  {"week_no": 10, "topic": "โครงสร้างข้อมูล Stack และ Queue"},
  {"week_no": 14, "topic": "การจัดการข้อผิดพลาด (Exception Handling)"}
]
```

### 3.5 บันทึกการสอน (Teaching Record) ตัวอย่างของ `COS101`
| รหัส | หัวข้อที่บันทึก | สัปดาห์ | เทียบกับ syllabus (3.4) | หลักฐานที่แนบ |
|---|---|---|---|---|
| `TR-001` | "โครงสร้างข้อมูล Stack และ Queue" | 10 | ตรงกับ week 10 | `EV-001.pdf` |
| `TR-002` | "การเขียนโปรแกรมเชิงวัตถุ (OOP) เบื้องต้น" | 5 | ตรงกับ week 5 | `EV-002.docx` |
| `TR-003` | "Workshop เสริม: Git และ GitHub Workflow" | 12 | **ไม่มีใน syllabus** (extra topic) | `EV-003.jpg` |

> สังเกต: week 1 ("แนะนำภาษา Python...") และ week 14 ("Exception Handling") **ไม่มี** teaching_record ใดๆ รองรับ → คาดหวังว่าเป็น `missing_topics` จาก gap analysis (AB-22)
> สังเกต: ไม่มี teaching_record ใดจับคู่กับ CLO4 → ใช้ทดสอบ gap alert (AB-12, BR#2) และ coverage_percent = 3/4 = 75% (AB-20)

### 3.6 ไฟล์หลักฐานตัวอย่าง (Evidence) — มี PII ปะปนตามสภาพจริง
| รหัส | ชื่อไฟล์ | ประเภท | มี PII นักศึกษา |
|---|---|---|---|
| `EV-001.pdf` | รายงานกลุ่ม_Stack_Queue.pdf | เอกสาร | ใช่ (ชื่อ-รหัสนักศึกษาในหน้าปก) |
| `EV-002.docx` | ใบงาน_OOP_เบื้องต้น.docx | เอกสาร | ใช่ |
| `EV-003.jpg` | ภาพกิจกรรม_Git_Workshop.jpg | รูปภาพ | ใช่ (มีใบหน้านักศึกษา) |

### 3.7 ผลจับคู่ AI ตัวอย่าง (`ai_match_result`, สถานะ draft เริ่มต้น) — seed สำหรับทดสอบ AI Review Panel
| รหัส | teaching_record | จับคู่กับ | match_confidence | state เริ่มต้น |
|---|---|---|---|---|
| `AIM-001` | `TR-001` | CLO3 | 0.82 | `draft` |
| `AIM-002` | `TR-002` | CLO2 | 0.75 | `draft` |
| `AIM-003` | `TR-003` | CLO1 | 0.40 (ค่าต่ำ — ใช้ทดสอบการแก้ไข/ปฏิเสธ) | `draft` |

---

## 4. Test Case ตาม Epic

| Epic | เรื่อง | User Story ที่ครอบคลุม | ไฟล์ |
|---|---|---|---|
| E1 | ป้อนข้อมูลวิชา (course syllabus + CLO + PLO) | AB-01, AB-02, AB-03, AB-04, AB-19 | [[e1-clo-plo-syllabus-setup\|e1-clo-plo-syllabus-setup]] |
| E2 | บันทึกการสอนและแนบหลักฐาน | AB-05, AB-06, AB-07 | [[e2-teaching-record-evidence\|e2-teaching-record-evidence]] |
| E3 | AI ประมวลผลจับคู่ CLO/PLO + gap analysis | AB-08, AB-09, AB-10, AB-20, AB-21, AB-22 | [[e3-ai-matching-gap-analysis\|e3-ai-matching-gap-analysis]] |
| E4 | แดชบอร์ดและแจ้งเตือนความสอดคล้อง | AB-11, AB-12, AB-13, AB-14, AB-23 | [[e4-dashboard-alerts\|e4-dashboard-alerts]] |
| E5 | ออกเอกสารหลักฐาน (Word Export) | AB-15, AB-16, AB-17 | [[e5-word-export\|e5-word-export]] |
| E6 | สมัครและอนุมัติบัญชีผู้ใช้ (User Registration & Approval) | AB-24, AB-25, AB-26, AB-27 | [[e6-user-registration-approval\|e6-user-registration-approval]] |

---

## 5. สรุปจำนวน Test Case ต่อ Epic

| Epic | จำนวน Test Case | รวม Happy path | รวม Edge case | รวม Rejection/ละเมิดกฎ | รวม Placeholder (คำถามเปิด) |
|---|---|---|---|---|---|
| E1 | 27 | 11 | 8 | 8 | 0 |
| E2 | 16 | 6 | 3 | 7 | 0 |
| E3 | 32 | 15 | 6 | 11 | 0 |
| E4 | 20 | 9 | 5 | 6 | 0 |
| E5 | 15 | 6 | 3 | 6 | 0 |
| E6 | 25 | 12 | 4 | 9 | 0 |
| **รวม** | **135** | **59** | **29** | **47** | **0** |

(ตัวเลขนับตามจริงจากตารางในแต่ละไฟล์ย่อย — นับ 1 แถว = 1 test case; TC-AB19-06 ใน E1 ที่มีประเภท "Accepted Risk" ถูกนับรวมในคอลัมน์ Edge case เพื่อให้ผลรวมของแต่ละแถวตรงกับจำนวน test case จริง)
(อัปเดตหลังตอบคำถามเปิด §6.1: E3 TC-AB21-04/05 เปลี่ยนจาก placeholder เป็น Edge case/Happy path ที่ยืนยันแล้ว และเพิ่ม TC-AB11-05 ใหม่ใน E4)
(อัปเดตหลังตอบคำถามเปิด §6.2/§6.3/§6.5/§6.6 — รอบก่อน:
- **E1**: แก้ไขยอดรวมจาก 25 เป็น 27 ให้ตรงกับไฟล์จริง (ก่อนหน้านี้ตารางนี้ยังไม่ถูกอัปเดตหลัง TC-AB19-05/06 เปลี่ยนจาก placeholder เป็น test case ยืนยันแล้ว และเพิ่ม TC-AB19-07/08 ใหม่ ในรอบแก้ §6.2 ก่อนหน้า)
- **E3**: เพิ่ม TC-AB22-07 (Happy path), TC-AB22-08 (Rejection) ยืนยัน §6.2 ว่า gap analysis ใช้ `syllabus.content` เท่านั้น ไม่อ่านไฟล์ `origin_file_ref` — TC-AB22-06 ยังเป็น placeholder แต่แคบลงเหลือเฉพาะคำถามเรื่อง algorithm จับคู่คำพ้องความหมาย (ดู §6.2)
- **E5**: TC-AB16-04 เปลี่ยนจาก placeholder เป็น Happy path ยืนยันแล้ว (§6.3 — ไม่มี "3 ระดับ") และเพิ่ม TC-AB16-05 ใหม่
- **E6**: TC-AB24-04 เปลี่ยนจาก placeholder เป็น Rejection ยืนยันแล้ว (§6.5), เพิ่ม TC-AB24-06 ใหม่, TC-AB27-05 เปลี่ยนจาก placeholder เป็น Happy path ยืนยันแล้ว (§6.6), เพิ่ม TC-AB27-06 ใหม่ — placeholder ของ E6 หมดแล้วทั้งคู่)
(อัปเดตล่าสุด 2026-08-20 หลังตอบคำถามเปิดที่เหลือ + AB-18 ถูกตัดออกจาก scope — รอบนี้:
- **E3**: TC-AB22-06 เปลี่ยนจาก placeholder เป็น Happy path ยืนยันแล้ว (§6.2 — วิธีเทียบหัวข้อ syllabus ใช้ semantic similarity ไม่ใช่ exact string match) จำนวนรวม E3 ไม่เปลี่ยน (ยังเป็น 32) แต่ placeholder ลดจาก 1 เหลือ 0, happy path เพิ่มจาก 14 เป็น 15
- **E5**: AB-18 ถูกตัดออกจาก scope ทั้งหมด — ย้าย TC-AB18-01/02/03 (เดิม 2 happy + 1 rejection) ไปที่ [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived]] และเพิ่ม TC-AB16-06 ใหม่ (Happy path) ยืนยันว่า export แสดง Area of Improvement เสมอ ไม่มี option ให้ซ่อน — จำนวนรวม E5 ลดจาก 17 เป็น 15 (happy path 7→6, rejection 7→6, edge case คงที่ 3)
- **รวมทั้งหมด**: ลดจาก 137 เหลือ **135 test case** และ **placeholder เหลือ 0 รายการ — ปิดคำถามเปิดครบทุกข้อแล้ว** (ดูหัวข้อ 6))

---

## 6. หมายเหตุ — คำถามเปิดที่ต้องตอบก่อน implement/ทดสอบจริง

เอกสารนี้ **ไม่สมมติคำตอบ** ให้คำถามต่อไปนี้ตามกฎการทำงาน — Test case ที่เกี่ยวข้องถูกทำเป็น placeholder และ tag `[PLACEHOLDER — รอคำตอบ]` ไว้ในไฟล์ย่อย

> **สถานะล่าสุด (2026-08-20): ปิดคำถามเปิดครบทุกข้อแล้ว** — คำถามทั้งหมด §6.1–§6.7 ด้านล่างได้รับคำตอบยืนยันจากผู้ใช้แล้วทุกข้อ (§6.4 ปิดในลักษณะ "ตัดฟีเจอร์ออกจาก scope" ไม่ใช่ตอบคำถามเดิมตรงๆ) ไม่มี test case ใดในเอกสารนี้หรือไฟล์ย่อยที่ยังเป็น `[PLACEHOLDER — รอคำตอบ]` อีกต่อไป (ยืนยันจำนวน placeholder = 0 ในตาราง §5)

### 6.1 [แก้ไขแล้ว] "ความถี่ที่แมทช์" (match frequency) — เดิมกระทบ AB-21, AB-11 (ไฟล์ e3, e4)
**คำตอบยืนยันจากผู้ใช้**:
- **สูตร**: % ความถี่ที่แมทช์ = (จำนวนครั้งที่มี `teaching_record` ตรงกับ CLO/หัวข้อนั้นๆ) ÷ (จำนวนครั้ง `teaching_record` ทั้งหมดของวิชานั้น) × 100
- **การแสดงผล**: แสดง % นี้**คู่กัน**กับจำนวนครั้งดิบ (raw count `match_frequency`) เสมอ เคียงข้างกันในหน้าเดียวกัน — ยึดตาม `align-technical-design.md` §4.2 ("แสดงประกอบกัน" = แสดงคู่กัน) **ไม่ใช่สูตรรวม**กับ `coverage_percent` ของ CLO เป็นตัวเลขเดียว — coverage % (วัดว่า CLO มีหลักฐานยืนยันแล้วหรือไม่ ในสัดส่วน CLO ทั้งวิชา) และความถี่ % (วัดสัดส่วน teaching_record ที่ตรงกับ CLO นั้น) เป็นคนละค่ากัน คำว่า "ตามสูตรที่ระบุในสเปค" ใน backlog AB-21 AC ข้อ 2 หมายถึงสูตร % ความถี่ข้างต้นเท่านั้น ไม่ใช่สูตรรวมกับ coverage
- **ช่วงเวลานับ**: เนื่องจาก `teaching_record`/`course` ไม่มี field แยกภาคการศึกษา (`align-technical-design.md` §2.6/§2.7) การนับ "ทั้งหมดของวิชานั้น" คือการนับสะสมตลอดที่มี `teaching_record` อยู่ในระบบสำหรับ `course_id` นั้น ไม่แยก/ไม่ reset ตามภาคการศึกษา
- ยังไม่มี threshold ตัวเลขว่าความถี่เท่าไรถือว่า "เพียงพอ" — คงเป็นค่าที่แสดงให้อาจารย์ตัดสินใจเองตามสเปคเดิม (ไม่ใช่ gap ที่ต้องแก้เพิ่ม เพราะเป็นการตัดสินใจของผู้ใช้ ไม่ใช่ระบบ ไม่กระทบการเขียน test case)

TC-AB21-04 และ TC-AB21-05 ใน [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]] จึงไม่ใช่ placeholder อีกต่อไป เขียนเป็น test case ยืนยันแล้วตามสูตรนี้ (TC-AB21-04 ครอบคลุมการนับสะสมไม่แยกภาคการศึกษา, TC-AB21-05 ครอบคลุมการแสดงคู่กันไม่ใช่สูตรรวม) และเพิ่ม TC-AB11-05 ใหม่ใน [[e4-dashboard-alerts|e4-dashboard-alerts]] (เดิมไม่มี test case ทดสอบความถี่ที่แมทช์บนแดชบอร์ดเลย เพราะติดคำถามนี้)

### 6.2 [แก้ไขแล้ว] โครงสร้างข้อมูล Course Syllabus — กระทบ AB-19, AB-22 (ไฟล์ e1, e3)
**คำตอบยืนยันจากผู้ใช้**: โครงสร้างข้อมูล syllabus แบ่งเป็น **2 ส่วนคู่กัน** ที่แยกจากกันจริง (คนละ endpoint, คนละฟอร์ม):
- **(ก) ไฟล์ syllabus ทางการ** (`origin_file_ref`) — อาจารย์ต้องอัปโหลดเป็นไฟล์แนบ (บังคับ เพราะสาขากำหนดให้ต้องมีและส่งเป็นไฟล์) เก็บไว้อ้างอิงเฉยๆ **ระบบไม่ parse/วิเคราะห์เนื้อหาไฟล์นี้อัตโนมัติ**
- **(ข) หัวข้อที่วางแผนสอนแต่ละสัปดาห์แบบสั้นๆ** (`content` = `[{week_no, topic, detail}]`) — ข้อมูลโครงสร้าง (structured per-week) นี้เท่านั้นที่ AI gap analysis (AB-22) ใช้เป็น input เทียบกับ `teaching_record` จริง ไม่ใช่การอ่านไฟล์ที่อัปโหลดใน (ก)

ยึดตาม `align-technical-design.md` §2.6 (field `content`/`origin_file_ref`) และ §3 E1 (`PUT /courses/{id}/syllabus` กับ `POST /courses/{id}/syllabus/upload` เป็น 2 endpoint แยกกัน) — Test case ที่ยืนยันแล้วอยู่ใน [[e1-clo-plo-syllabus-setup|e1-clo-plo-syllabus-setup]] (TC-AB19-05, 07, 08) และ [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]] (TC-AB22-07, TC-AB22-08 — ใหม่)

**หมายเหตุ — คำถามย่อย [แก้ไขแล้ว, 2026-08-20]**: คำถามที่ว่าอัลกอริทึมที่ใช้เทียบหัวข้อ `topic`/`detail` ของแต่ละสัปดาห์ (ซึ่งเป็นข้อความอิสระ/free text) จะถือว่าข้อความที่เป็นคำพ้องความหมายกัน (เช่น "OOP เบื้องต้น" กับ "Object-Oriented Programming เบื้องต้น") "ตรงกัน" หรือไม่ — **คำตอบยืนยันจากผู้ใช้**: ใช้วิธี**เทียบความหมายร่วม (semantic similarity) ไม่ใช่ exact string match** เป็นหลักการเดียวกับการจับคู่ CLO/PLO (align-technical-design §4.1) ยึดตาม `align-technical-design.md` §4.3 ที่ปรับไว้แล้ว (ตัวอย่าง: "การตรวจสอบข้อเท็จจริงในสื่อดิจิทัล" กับ "Fact-checking เนื้อหาออนไลน์" ต้องนับว่า "ตรงกัน") TC-AB22-06 ใน [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]] จึงไม่ใช่ placeholder อีกต่อไป เขียนเป็น test case ยืนยันแล้ว

### 6.2b [แก้ไขแล้ว] Course Syllabus Versioning — เดิมเป็นความขัดแย้งระหว่าง `align-technical-design.md` กับ `task-breakdown.md`
**ตัดสินใจแล้ว**: เก็บแบบ **update-in-place ไม่มี version history** (Accepted Risk — ดู `align-technical-design.md` §2.6 และ §4.3) — `task-breakdown.md` T-067 ปรับให้ตรงกับการตัดสินใจนี้แล้ว TC-AB19-06 ใน `e1-clo-plo-syllabus-setup.md` จึงไม่ใช่ placeholder อีกต่อไป เขียนเป็น test case ยืนยันพฤติกรรม accepted-risk แทน

### 6.3 [แก้ไขแล้ว] AB-16 "Area of Improvement 3 ระดับ" — กระทบ AB-16 (ไฟล์ e5)
**คำตอบยืนยันจากผู้ใช้**: **ไม่ต้องมี "3 ระดับ"** — ส่วน Area of Improvement เป็น**คำบรรยายข้อความอิสระ (free-text)** ที่อธิบายว่าควรพัฒนาอะไร/ประเด็นอะไรบ้าง ไม่มีการแบ่งเป็นระดับ/หมวดหมู่ตายตัว เนื้อหายังต้องอ้างอิงเฉพาะข้อมูลจริงที่ยืนยันแล้วเท่านั้นตาม BR#3/BR#4 เหมือนเดิม

TC-AB16-04 ใน [[e5-word-export|e5-word-export]] จึงไม่ใช่ placeholder อีกต่อไป เขียนเป็น test case ยืนยันแล้วว่าส่วนนี้แสดงเป็นความเรียงข้อความเดียว ไม่มี label ระดับ/หมวดหมู่ปรากฏในเอกสาร และเพิ่ม TC-AB16-05 ใหม่ (ตรวจว่าไม่ถูกเติมข้อความลอยๆให้ครบตามจำนวน/ระดับที่ตายตัว เมื่อพบประเด็นจริงเพียงประเด็นเดียว)

### 6.4 [ปิด — AB-18 ถูกตัดออกจาก scope, 2026-08-20] AB-18 (toggle รวม/ไม่รวม Area of Improvement) — ความเชื่อมั่นต่ำ (ไฟล์ e5)
Story นี้เป็นข้อสรุปที่ backlog-analyst อนุมานเพิ่มเติม ไม่ได้ระบุตรงในสเปคต้นฉบับ เดิมเขียน test case ตาม AC ที่มีอยู่ได้ปกติ แต่ระบุว่า **ทั้งฟีเจอร์นี้ควรได้รับการยืนยันจากผู้ใช้ก่อนพัฒนาจริง**

**คำตอบยืนยันจากผู้ใช้ (2026-08-20)**: **ไม่ต้องการฟีเจอร์นี้** — AB-18 ถูกตัดออกจาก product-backlog.md ทั้งหมด (เนื้อหาเดิมย้ายไปที่ [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived/backlog-ab-18-area-of-improvement-toggle]]) พฤติกรรมที่ถูกต้องคือเอกสาร Word export **แสดง Area of Improvement เสมอ ไม่มี toggle/parameter ให้เลือกซ่อน** (`align-technical-design.md` §3 E5 ปรับไว้แล้ว) Test case TC-AB18-01/02/03 ใน [[e5-word-export|e5-word-export]] ถูกย้ายไปยังไฟล์ archive เดียวกัน และแทนที่ด้วย TC-AB16-06 (ยืนยันพฤติกรรม "แสดงเสมอ") คำถามนี้จึงปิดแล้ว ไม่ใช่คำถามเปิดที่ต้องตอบก่อน implement อีกต่อไป

### 6.5 [แก้ไขแล้ว] ฟิลด์ฟอร์มสมัครสมาชิก (self-service registration) — กระทบ AB-24 (ไฟล์ e6)
**คำตอบยืนยันจากผู้ใช้**: ฟอร์มสมัครสมาชิกมีเพียง **3 ฟิลด์: ชื่อ, อีเมล, รหัสผ่าน** เท่านั้น — **ไม่มีฟิลด์ "สังกัด/ภาควิชา"** เพราะระบบทั้งระบบให้บริการเฉพาะสาขา New Media Communication สาขาเดียว (การระบุสังกัดจึงไม่มีความหมาย) อาจารย์ต้องตั้งรหัสผ่านเอง ไม่ใช้ SSO

TC-AB24-04 ใน [[e6-user-registration-approval|e6-user-registration-approval]] จึงไม่ใช่ placeholder อีกต่อไป เขียนเป็น test case ยืนยัน validation ของ 3 ฟิลด์บังคับนี้ และเพิ่ม TC-AB24-06 ใหม่ (ยืนยันว่าสมัครสำเร็จด้วย 3 ฟิลด์นี้โดยไม่มีฟิลด์สังกัด) — แก้ไข field list ที่อ้างถึง `department` ในตารางข้อมูลทดสอบและ TC-AB26-01 ของไฟล์เดียวกันให้ตรงกับคำตอบนี้ด้วย

### 6.6 [แก้ไขแล้ว] `rejection_reason` บังคับกรอกหรือไม่ — กระทบ AB-26/AB-27 (ไฟล์ e6)
**คำตอบยืนยันจากผู้ใช้**: **ไม่บังคับกรอก** (`rejection_reason` เป็น optional) เพราะในทางปฏิบัติเหตุผลปฏิเสธมีกรณีเดียวคือ "ไม่ใช่อาจารย์ผู้สอนของสาขา" — ผู้บริหารหลักสูตรจะระบุเพิ่มเติมหรือไม่ก็ได้

TC-AB27-05 ใน [[e6-user-registration-approval|e6-user-registration-approval]] จึงไม่ใช่ placeholder อีกต่อไป เขียนเป็น test case ยืนยันว่าปฏิเสธบัญชีโดยไม่กรอกเหตุผลต้องทำสำเร็จตามปกติ (ไม่ error/ไม่บังคับ) และเพิ่ม TC-AB27-06 ใหม่ (ปฏิเสธพร้อมระบุเหตุผล ก็ต้องทำสำเร็จเช่นกัน — พิสูจน์ว่า optional ทำงานได้ทั้งสองทาง)

### 6.7 [แก้ไขแล้ว] วิธีสร้างบัญชี `program_admin` ชุดแรก — กระทบ E6 โดยรวม (ไม่ใช่ story เดียว)
`align-technical-design.md` §2.12 ระบุว่า E6 (`POST /auth/register`) สร้างได้เฉพาะบัญชี `role = 'instructor'` เท่านั้น เดิมสเปคไม่ได้ระบุว่าบัญชี `program_admin` ชุดแรกถูกสร้างขึ้นอย่างไร

**คำตอบยืนยันจากผู้ใช้**: บัญชี `role = 'program_admin'` ชุดแรก (และบัญชีเพิ่มเติมในอนาคตถ้าต้องการ) สร้างผ่าน **seed script/ข้อมูลเริ่มต้นตอน deploy ระบบเท่านั้น** — **ไม่มี endpoint ใดในระบบ ALIGN ที่ให้สร้างบัญชีบทบาทนี้โดยตรง** (ไม่ใช่ผ่าน UI ในระบบ และไม่ใช่ผ่าน `POST /auth/register` ซึ่งสร้างได้แต่ `role = 'instructor'`) ยึดตาม `align-technical-design.md` §2.12 ที่ปรับไว้แล้ว

คำตอบนี้ไม่กระทบการเขียน test case ของ `e6-user-registration-approval.md` โดยตรง (ใช้ `U-PA-2565`/`U-PA-2570` เป็นบัญชีที่มีอยู่แล้วตามข้อสมมติของ Test Plan §2 อยู่แล้ว — สอดคล้องกับคำตอบนี้พอดี เพราะบัญชีเหล่านี้ถือเป็นบัญชีที่ seed ไว้ล่วงหน้าตอน deploy) จึงไม่มี test case ใหม่ต้องเพิ่ม — เป็นเพียงคำถามเชิงกระบวนการ deploy ที่ไม่ใช่ AC/test case

---

## 7. เชื่อมโยง

- ย้อนกลับไปยัง [[../../01-requirements/02-plan/product-backlog|product-backlog]] (ที่มาของ Acceptance Criteria) และ [[../../02-design/02-technical/align-technical-design|align-technical-design]] (ที่มาของ entity/state)
- ผลการทดสอบจริงตาม test case ในเอกสารนี้ให้บันทึกต่อใน [[../02-test-result/index|02-test-result]]

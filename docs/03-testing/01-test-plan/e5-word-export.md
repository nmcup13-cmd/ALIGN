# Test Case: E5 — ออกเอกสารหลักฐาน (Word Export)

ครอบคลุม AB-15, AB-16, AB-17 จาก [[../../01-requirements/02-plan/product-backlog|product-backlog]] — ใช้ชุดข้อมูลทดสอบตาม [[test-plan-align|test-plan-align §3 (ชุดข้อมูลทดสอบ)]]

> **หมายเหตุ (2026-08-20):** AB-18 (ตัวเลือกรวม/ไม่รวม Area of Improvement ตอน export) ถูกตัดออกจากขอบเขตทั้งหมด — ผู้ใช้ยืนยันว่าไม่ต้องการฟีเจอร์นี้ (ดู [[test-plan-align|test-plan-align §6.4]]) Test Case เดิม (TC-AB18-01/02/03) ถูกย้ายไปที่ [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived/backlog-ab-18-area-of-improvement-toggle]] แทนการลบทิ้ง พฤติกรรมที่ถูกต้องตอนนี้คือ **เอกสาร Word export แสดงส่วน Area of Improvement เสมอ ไม่มี option ให้ซ่อน/เลือกไม่รวม** — เพิ่ม test case ใหม่ยืนยันพฤติกรรมนี้ที่ TC-AB16-06 ด้านล่าง

อ้างอิงกฎทางธุรกิจ: **BR#4** (เอกสารส่งออกอ้างอิงเฉพาะหลักฐานจริง), **BR#3** (ห้ามใช้ผล AI ที่ยังไม่ยืนยัน), **BR#5** (PDPA — ขอบเขตสิทธิ์ผู้บริหารหลักสูตร)

**ขอบเขตการทดสอบของ Epic นี้**: ทดสอบเฉพาะ **เนื้อหา/ข้อมูลอ้างอิง** ที่ต้องปรากฏหรือห้ามปรากฏในเอกสาร ไม่ทดสอบ formatting/layout ของไฟล์ .docx จริง (ดู Out of Scope ใน [[test-plan-align|test-plan-align]])

---

## AB-15 — ออกเอกสาร Word สรุปความสอดคล้อง CLO/PLO ของรายวิชา

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB15-01 | Happy path | `COS101` มี `ai_match_result` ที่ `confirmed` แล้ว 3 รายการ (CLO2, CLO3 ผูกกับ `TR-001`/`TR-002` ที่แนบ `EV-001.pdf`/`EV-002.docx`) | `U-INSTR-A` เรียก `POST /courses/{COS101}/export-word` | เอกสารที่สร้างอ้างอิงเฉพาะ `EV-001.pdf`/`EV-002.docx` ที่แนบไว้จริง ไม่มีชิ้นงาน/หลักฐานอื่นที่ไม่มีอยู่ในระบบถูกอ้างถึง | AB-15 AC ข้อ 1, BR#4 |
| TC-AB15-02 | **Rejection — ห้ามอ้างอิงหลักฐานที่ไม่มีจริง** | `EV-003.jpg` เคยถูกแนบใน `TR-003` แต่ถูกลบออกก่อนกดยืนยันบันทึก (ตาม TC-AB06-02) | สร้างเอกสาร Word ของ `COS101` | เอกสารที่ได้ **ต้องไม่มี** การอ้างอิงถึง `EV-003.jpg` เลย เพราะไม่มีอยู่จริงในระบบแล้ว | AB-15 AC ข้อ 1, BR#4 |
| TC-AB15-03 | Happy path | `COS101` อยู่ในกลุ่มหลักสูตร 2565 | เปิดดูเอกสารที่สร้างขึ้น | เอกสารระบุ "หลักสูตร 2565" อย่างชัดเจนในหัวเอกสาร/ส่วนข้อมูลวิชา ไม่ปนกับ 2570 | AB-15 AC ข้อ 2 |
| TC-AB15-04 | **Rejection — ห้ามใช้ผล AI ที่ยังไม่ยืนยัน** | CLO1 ของ `COS101` มีผลจับคู่ AI ที่ยังเป็น `draft` (ยังไม่ยืนยัน) | สร้างเอกสาร Word | สรุป CLO/PLO ในเอกสาร**ต้องไม่รวม** CLO1 เป็นรายการที่ "แมทช์แล้ว" เพราะยังไม่ผ่านการยืนยัน (BR#3) — Word-export Service อ่านเฉพาะ `state = confirmed` เท่านั้นตาม align-technical-design §1 | AB-15 AC ข้อ 3, BR#3, BR#4 |
| TC-AB15-05 | Edge case | `COS102` ไม่มี CLO เลยและไม่มี `ai_match_result` ใดๆ | `U-INSTR-A` พยายามสร้างเอกสาร Word ของ `COS102` | ระบบแจ้งว่ายังไม่มีข้อมูลเพียงพอสำหรับสร้างเอกสาร (โทนเป็นกลาง) แทนการสร้างเอกสารเปล่า/error ที่ทำให้สับสน | AB-15, edge case ไม่มีข้อมูล |
| TC-AB15-06 | Rejection | `COS201` สอนโดย `U-INSTR-B` เท่านั้น | `U-INSTR-A` พยายามเรียก `POST /courses/{COS201}/export-word` | ระบบปฏิเสธ (403) เพราะไม่ใช่อาจารย์ผู้สอนวิชานี้ | BR#5 |

## AB-16 — เอกสารมีส่วน "ข้อเสนอแนะจุดที่ควรพัฒนา (Area of Improvement)"

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB16-01 | Happy path | `COS101` มี CLO4 ที่ไม่มีหลักฐาน (gap alert, BR#2) และ `syllabus_gap_result` ที่ `confirmed` แล้วมี `missing_topics` (week14) | สร้างเอกสาร Word ของ `COS101` พร้อมรวมส่วน Area of Improvement | ส่วน Area of Improvement มีเนื้อหาที่อ้างอิง CLO4 (ไม่มีหลักฐาน) และหัวข้อ week14 ที่ขาด (จาก gap analysis ที่ยืนยันแล้ว) เป็นข้อมูลจริงที่ตรวจสอบย้อนกลับไปยังระบบได้ | AB-16 AC ข้อ 2, BR#3 |
| TC-AB16-02 | **Rejection — ห้ามใช้ผลที่ยังไม่ยืนยัน** | `syllabus_gap_result` ของ `COS101` รอบล่าสุดยังเป็น `draft` (ยังไม่ยืนยัน) แต่มีผลรอบก่อนหน้าที่ `confirmed` อยู่แล้ว | สร้างเอกสารส่วน Area of Improvement | เนื้อหาต้องอ้างอิงจากผลรอบที่ `confirmed` ล่าสุดเท่านั้น ไม่ดึงข้อมูลจากผลรอบที่ยังเป็น `draft` มาใช้ | AB-16 AC ข้อ 2, BR#3 |
| TC-AB16-03 | Rejection | `COS301` (2570) ไม่มี CLO ใดที่ match % ต่ำ ไม่มี CLO ขาดหลักฐาน และไม่มี gap ใดๆ ที่ยืนยันแล้ว (สมมติวิชานี้สอนครบสมบูรณ์) | สร้างเอกสาร Word พร้อม Area of Improvement | ส่วน Area of Improvement ต้อง**ไม่สร้างข้อความลอยๆ** ขึ้นมาเพื่อให้มีเนื้อหา (เช่น ห้ามใส่คำแนะนำทั่วไปที่ไม่มีข้อมูลรองรับ) — ควรแสดงว่า "ไม่พบจุดที่ควรพัฒนาจากข้อมูลที่มี" แทน | AB-16 AC ข้อ 2, BR#3/BR#4 |
| TC-AB16-04 | Happy path (แก้ไขแล้ว — เดิมเป็น placeholder) | `COS101` มี CLO4 ที่ไม่มีหลักฐาน (gap alert, BR#2), CLO1 มีผลจับคู่ AI ที่ `rejected` แล้ว (`AIM-003`, confidence ต่ำ — ตาม §3.7) และ `syllabus_gap_result` ที่ `confirmed` แล้วมี `missing_topics` (week14) — ครบทั้ง 3 แหล่งข้อมูลที่ AB-16 AC ระบุว่าใช้ประกอบเนื้อหาได้ | สร้างเอกสาร Word ของ `COS101` พร้อมรวมส่วน Area of Improvement | ส่วน Area of Improvement แสดงเป็น**คำบรรยายข้อความอิสระ (free-text)** ความเรียงเดียวที่รวมประเด็นทั้งหมดที่ตรวจพบจริง (CLO4 ไม่มีหลักฐาน + week14 ที่ขาดจาก gap analysis) — **ไม่มีการแบ่ง/จัดกลุ่มเป็น "ระดับ" หรือ "หมวดหมู่" ที่ตายตัว** (ไม่มี label เช่น "ระดับ 1/2/3" หรือ "ต่ำ/กลาง/สูง" ปรากฏในเอกสารเลย) [ยืนยันแล้ว — ไม่ใช่ "3 ระดับ" ตามที่เคยระบุไว้] | AB-16 AC [ยืนยันแล้ว], test-plan-align §6.3 [แก้ไขแล้ว], BR#3/BR#4 |
| TC-AB16-05 | Edge case (ใหม่ — ยืนยันแล้ว §6.3) | `COS301` (2570) มีเพียง**ประเด็นเดียว**ที่ตรวจพบจริง คือ CLO3 มีผลจับคู่ AI ที่ `confirmed` แล้วแต่ match % ต่ำ — ไม่มี CLO ใดไม่มีหลักฐานเลย และไม่มี `syllabus_gap_result` ที่ `confirmed` ใดๆ | สร้างเอกสาร Word ของ `COS301` พร้อม Area of Improvement | เนื้อหาระบุเฉพาะประเด็นเดียวที่พบจริง (match % ต่ำของ CLO3) เท่านั้น — ระบบต้อง**ไม่เติมข้อความลอยๆ**เพิ่มเพื่อให้ดูครบตามจำนวน/ระดับที่ตายตัว เพราะยืนยันแล้วว่าไม่มีข้อกำหนดเรื่อง "3 ระดับ" อีกต่อไป (เนื้อหายาว/สั้นได้ตามจำนวนประเด็นที่พบจริงเท่านั้น) | AB-16 AC [ยืนยันแล้ว], test-plan-align §6.3 [แก้ไขแล้ว], BR#4 |
| TC-AB16-06 | Happy path (ใหม่ — หลัง AB-18 ถูกตัดออกจาก scope, 2026-08-20) | `COS101` มีข้อมูลพร้อมสร้างเอกสารตามปกติ (เหมือน TC-AB16-01) | `U-INSTR-A` เรียก `POST /courses/{COS101}/export-word` — endpoint นี้ไม่รับพารามิเตอร์ใดๆเกี่ยวกับการรวม/ไม่รวม Area of Improvement อีกต่อไปตาม `align-technical-design.md` §3 (E5); ทดสอบซ้ำโดยพยายามส่ง `include_area_of_improvement: false` แนบไปกับ request body ด้วย | เอกสารที่ได้ **มีส่วน Area of Improvement ปรากฏเสมอทั้งสองครั้ง** ไม่มีทางเรียก export ให้ไม่มีส่วนนี้ได้เลย แม้พยายามส่ง parameter ที่ไม่มีอยู่จริงไปกับ request (ระบบต้อง ignore parameter ที่ไม่รู้จักนี้ ไม่ error และไม่กระทบผลลัพธ์) | AB-16 AC [ยืนยันแล้ว], align-technical-design §3 (E5) [AB-18 ถูกตัดออกจากขอบเขต], BR#4 |

## AB-17 — ผู้บริหารหลักสูตรดาวน์โหลดเอกสารเพื่อจัดทำ SAR

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB17-01 | Happy path | `COS101` อยู่ในกลุ่ม 2565 ซึ่ง `U-PA-2565` ดูแล | `U-PA-2565` เรียก `GET /curricula/2565/courses/{COS101}/export-word` | ระบบอนุญาตให้ดาวน์โหลด เอกสารมีข้อมูลกลุ่มหลักสูตร (2565) กำกับชัดเจน และอยู่ในรูปแบบที่แนบใน SAR ต่อได้โดยตรง | AB-17 AC ข้อ 1–3 |
| TC-AB17-02 | **Rejection — ขอบเขตสิทธิ์ PDPA** | `COS301` อยู่ในกลุ่ม 2570 ซึ่ง `U-PA-2565` **ไม่ได้**ดูแล | `U-PA-2565` พยายามเรียก `GET /curricula/2570/courses/{COS301}/export-word` | ระบบปฏิเสธ (403) เพราะอยู่นอก `program_admin_curriculum_scope` | AB-17 AC ข้อ 1, BR#5 |
| TC-AB17-03 | Edge case | Out of Scope: QA ไม่มี login ในระบบ | สมมติมีความพยายามเรียก endpoint ส่งออกเอกสารโดยไม่มี token/session ของ `program_admin` หรือ `instructor` ใดๆ เลย (จำลองว่าไม่มี role สำหรับ QA) | ระบบปฏิเสธคำขอทั้งหมดที่ไม่มี role `instructor`/`program_admin` ที่ถูกต้อง — ยืนยันว่าไม่มี endpoint ใดเปิดให้เข้าถึงได้โดยไม่ authenticate ตาม role ที่กำหนด (ไม่มี role/endpoint สำหรับ QA ในระบบเลย ตาม align-technical-design §2.12/§6) | AB-17, Out of Scope (QA ไม่ใช่ user) |

---

## เชื่อมโยง

- ย้อนกลับไปยัง [[test-plan-align|test-plan-align]] และ [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]] / [[e4-dashboard-alerts|e4-dashboard-alerts]] (ที่มาของข้อมูล confirmed ที่เอกสารอ้างอิง)
- Test case ของ AB-18 (เดิม) ที่ถูกตัดออกจาก scope — ดู [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived/backlog-ab-18-area-of-improvement-toggle]]
- ผลการทดสอบตาม test case ทั้งหมดในเอกสารนี้และไฟล์อื่นในแผนนี้ให้บันทึกต่อใน [[../02-test-result/index|02-test-result]]

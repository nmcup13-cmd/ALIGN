# Test Case: E1 — ป้อนข้อมูลวิชา (Course Syllabus + CLO + PLO)

ครอบคลุม AB-01, AB-02, AB-03, AB-04, AB-19 จาก [[../../01-requirements/02-plan/product-backlog|product-backlog]] — ใช้ชุดข้อมูลทดสอบและบทบาทผู้ใช้ตามที่กำหนดใน [[test-plan-align|test-plan-align §3 (ชุดข้อมูลทดสอบ)]]

อ้างอิงกฎทางธุรกิจ: **BR#1** (ผูก CLO–PLO ก่อนบันทึกการสอน), แนวทางแยกกลุ่มหลักสูตร 2565/2570 (Scope ของสเปค + หมายเหตุ backlog "ห้าม merge ข้อมูลข้ามกลุ่มหลักสูตร")

---

## AB-01 — ตั้งค่ากลุ่มหลักสูตร (2565/2570) และ PLO แยกกัน

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB01-01 | Happy path | ยังไม่มี PLO ใดๆ ในระบบ ผู้ใช้เป็น `U-PA-2565` | เพิ่ม PLO "PLO1565-1: บูรณาการความรู้ทางวิชาชีพ" ให้กลุ่มหลักสูตร `CUR-2565` | ระบบบันทึก PLO นี้ผูกกับ `curriculum_id` ของ 2565 เท่านั้น และแสดงในรายการ PLO ของกลุ่ม 2565 | AB-01 AC ข้อ 1–2 |
| TC-AB01-02 | Happy path | มี PLO ของ `CUR-2565` อยู่แล้ว 4 ข้อ (3.1) | `U-PA-2570` เพิ่ม PLO "PLO1570-1" ให้กลุ่ม `CUR-2570` | PLO ใหม่ถูกผูกกับ `CUR-2570` เท่านั้น และรายการ PLO ของ `CUR-2565` ยังคงมี 4 ข้อเท่าเดิม ไม่เพิ่ม/ไม่ปน | AB-01 AC ข้อ 2 |
| TC-AB01-03 | Edge case | `CUR-2565` มี PLO 4 ข้อ, `CUR-2570` มี PLO 3 ข้อ | เรียก `GET /curricula/2565/plos` และ `GET /curricula/2570/plos` | แต่ละ endpoint คืนเฉพาะ PLO ของกลุ่มตนเอง (4 ข้อ และ 3 ข้อ ตามลำดับ) ไม่มีรายการซ้ำ/ปนกัน | AB-01 AC ข้อ 2, หมายเหตุ backlog เรื่องห้าม merge |
| TC-AB01-04 | Rejection | `U-PA-2565` แก้ไขคำอธิบายของ `PLO1565-2` | บันทึกการแก้ไข | PLO ของกลุ่ม 2570 ทั้งหมดไม่มีค่าใดเปลี่ยนแปลง (ตรวจ `updated_at`/`description` ของ PLO กลุ่ม 2570 คงเดิม) | AB-01 AC ข้อ 3 |
| TC-AB01-05 | Edge case | ผู้ใช้เริ่มเพิ่ม PLO ใหม่ | เปิดฟอร์มเพิ่ม PLO โดยยังไม่เลือกกลุ่มหลักสูตร | ระบบบังคับให้เลือกกลุ่มหลักสูตร (2565 หรือ 2570) ก่อนกรอกข้อมูล PLO อื่น — ไม่มี state "PLO ไม่มีกลุ่มหลักสูตร" เกิดขึ้นได้ | AB-01 AC ข้อ 1 |

## AB-02 — ป้อน CLO ของรายวิชาพร้อมระบุกลุ่มหลักสูตร

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB02-01 | Happy path | รายวิชา `COS101` ถูกสร้างแล้วพร้อมระบุ `curriculum_id = CUR-2565` | อาจารย์ `U-INSTR-A` เพิ่ม CLO "CLO1: สามารถเขียนโปรแกรมเบื้องต้นได้" ให้ `COS101` | CLO ถูกบันทึกและ tag `curriculum_id = CUR-2565` โดยอัตโนมัติ ตรงกับ curriculum ของ `COS101` | AB-02 AC ข้อ 2 |
| TC-AB02-02 | Rejection | มีรายวิชาชื่อ `COS-NEW` ที่สร้างขึ้นแต่ **ยังไม่ระบุกลุ่มหลักสูตร** (`curriculum_id = null`) | พยายามเรียก `POST /courses/{COS-NEW}/clos` เพื่อเพิ่ม CLO | ระบบปฏิเสธคำขอ (เช่น 422/409) พร้อมข้อความให้ระบุกลุ่มหลักสูตรของรายวิชาก่อน — ไม่มี CLO ถูกสร้างขึ้น | AB-02 AC ข้อ 1, 3 |
| TC-AB02-03 | Happy path | `COS301` ระบุ `curriculum_id = CUR-2570` แล้ว | เพิ่ม CLO1, CLO2, CLO3 ให้ `COS301` ตามลำดับ | ทั้ง 3 CLO ถูก tag เป็น `CUR-2570` ทั้งหมด และไม่ปรากฏในรายการ CLO ของกลุ่ม 2565 | AB-02 AC ข้อ 2 |
| TC-AB02-04 | Edge case | `COS102` สร้างแล้วระบุ `curriculum_id = CUR-2565` แต่ยังไม่มีการเพิ่ม CLO ใดๆ (edge case "รายวิชาไม่มี CLO เลย") | เปิดหน้าจัดการ CLO ของ `COS102` | ระบบแสดง Empty State (ตาม `DESIGN.md` §3 — ข้อความชวนทำขั้นต่อไป ไม่ใช่ error) ไม่ใช่ error/exception และรายวิชายังคงมีสถานะ `clo_plo_ready = false` | AB-02, AB-04 |

## AB-03 — ผูก CLO–PLO เฉพาะภายในกลุ่มหลักสูตรเดียวกัน + gate ก่อนบันทึกการสอน

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB03-01 | Happy path | `COS101` (2565) มี CLO1 และ `CUR-2565` มี `PLO1565-1` | ผูก CLO1 กับ `PLO1565-1` | บันทึกสำเร็จ `clo_plo_mapping` ถูกสร้าง | AB-03 AC ข้อ 1 |
| TC-AB03-02 | **Rejection — ข้ามกลุ่มหลักสูตร** | `COS101` (2565) มี CLO2 และมี `PLO1570-1` (ของกลุ่ม 2570) อยู่ในระบบ | `U-INSTR-A` พยายามผูก CLO2 (2565) กับ `PLO1570-1` (2570) ผ่าน `POST /courses/{COS101}/clo-plo-mappings` | ระบบปฏิเสธคำขอด้วย HTTP 422 ตาม constraint `clo.curriculum_id == plo.curriculum_id` ไม่มี mapping ใดถูกสร้างขึ้น และ UI แสดงข้อความว่าไม่สามารถผูกข้ามกลุ่มหลักสูตรได้ | AB-03 AC ข้อ 1, BR#1, align-technical-design §2.4 |
| TC-AB03-03 | Happy path | `COS101` ผูก CLO1→PLO1565-1, CLO2→PLO1565-2, CLO3→PLO1565-2/3, CLO4→PLO1565-4 ครบทุกข้อ (3.2) | เรียก `GET /courses/{COS101}/setup-status` | คืนค่า `clo_plo_ready = true` เพราะมี CLO อย่างน้อย 1 ข้อผูกกับ PLO อย่างน้อย 1 ข้อ (ครบเงื่อนไขขั้นต่ำ) | AB-03 AC ข้อ 2, BR#1 |
| TC-AB03-04 | **Rejection — บล็อกบันทึกการสอนเมื่อยังผูกไม่ครบ** | `COS102` มี CLO อยู่บ้างแต่ยังไม่มี CLO ใดผูกกับ PLO เลย (`clo_plo_ready = false`) | `U-INSTR-A` พยายามเรียก `POST /courses/{COS102}/teaching-records` เพื่อบันทึกการสอน | ระบบปฏิเสธด้วย HTTP 409 ไม่มี `teaching_record` ถูกสร้าง และ UI แสดงข้อความว่าต้องผูก CLO–PLO ให้ครบก่อน | AB-03 AC ข้อ 3, BR#1, align-technical-design §3 (E2) |
| TC-AB03-05 | Edge case | `COS102` ไม่มี CLO เลย (0 ข้อ) | เปิดหน้าผูก CLO–PLO ของ `COS102` | ระบบแสดง Empty State แจ้งว่าต้องเพิ่ม CLO ก่อนจึงจะผูกกับ PLO ได้ ไม่ปล่อยให้กดปุ่ม "ผูก" ได้ทั้งที่ไม่มี CLO ให้เลือก | AB-02, AB-03 |
| TC-AB03-06 | Rejection | `COS201` (2565, สอนโดย `U-INSTR-B`) มี CLO1 ที่ยังไม่ผูก PLO ใดเลย | `U-INSTR-B` พยายามผูก CLO1 กับ PLO ที่ `is_active = false` (หลักสูตรที่ปิดใช้งานแล้ว) ของกลุ่ม 2565 | ระบบปฏิเสธการผูกกับ PLO ของหลักสูตรที่ไม่ active (ป้องกันข้อมูลผูกกับหลักสูตรที่เลิกใช้แล้วโดยไม่ตั้งใจ) | AB-01 (is_active), AB-03 |

## AB-04 — ภาพรวมรายวิชาทั้งหมดแยกตามกลุ่มหลักสูตรพร้อมสถานะการตั้งค่า

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB04-01 | Happy path | ระบบมี `COS101`, `COS102` (2565) และ `COS301` (2570) | `U-PA-2565` เปิดแท็บ/ตัวกรอง "2565" ในหน้าภาพรวมรายวิชา | แสดงเฉพาะ `COS101` (`clo_plo_ready = true`) และ `COS102` (`clo_plo_ready = false`) ไม่มี `COS301` ปรากฏในรายการ | AB-04 AC ข้อ 1 |
| TC-AB04-02 | Happy path | เช่นเดียวกับ TC-AB04-01 | ดูสถานะความครบถ้วนของ `COS101` และ `COS102` ในตาราง | `COS101` แสดงสถานะ "ผูก CLO–PLO ครบแล้ว", `COS102` แสดงสถานะ "ยังไม่ครบ/ยังไม่มี CLO" (ไม่ใช่ error ตาม UX Rule 3 ของ `DESIGN.md`) | AB-04 AC ข้อ 2 |
| TC-AB04-03 | **Rejection — ขอบเขตสิทธิ์** | `U-PA-2565` มี `program_admin_curriculum_scope = [2565]` เท่านั้น | `U-PA-2565` พยายามเรียก `GET /curricula/2570/courses/status-overview` | ระบบปฏิเสธ (403) เพราะอยู่นอก scope ที่ตนดูแล | BR#5, align-technical-design §2.13, §3 |
| TC-AB04-04 | Edge case | ยังไม่มีรายวิชาใดในกลุ่ม `CUR-2570` เลย (สมมติสถานการณ์เริ่มต้นหลักสูตรใหม่) | `U-PA-2570` เปิดหน้าภาพรวมของกลุ่ม 2570 | แสดง Empty State ว่ายังไม่มีรายวิชาในกลุ่มนี้ พร้อมข้อความชวนเพิ่มรายวิชา ไม่ใช่หน้าว่างเปล่า/error | AB-04, DESIGN.md §3 Empty State |

## AB-19 — ป้อน/อัปโหลด Course Syllabus ต่อรายวิชา

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB19-01 | Happy path | `COS101` (2565) ยังไม่มี syllabus | `U-INSTR-A` เรียก `PUT /courses/{COS101}/syllabus` พร้อมเนื้อหาตาม [[test-plan-align|test-plan-align §3.4]] | ระบบสร้าง `syllabus` ใหม่ผูกกับ `COS101` (curriculum สืบทอดจาก `course.curriculum_id = CUR-2565` โดยอัตโนมัติ ไม่ต้องระบุซ้ำ) | AB-19 AC ข้อ 1, align-technical-design §2.6 |
| TC-AB19-02 | Happy path | `COS101` มี syllabus อยู่แล้ว (4 หัวข้อตาม 3.4) | `U-INSTR-A` แก้ไข topic ของ week 14 จาก "Exception Handling" เป็น "Exception Handling และ Unit Testing" แล้วบันทึก | `syllabus.content` ถูกอัปเดตทับ (update-in-place) `updated_by`/`updated_at` เปลี่ยนตามผู้แก้ไขล่าสุด | AB-19 AC ข้อ 2 |
| TC-AB19-03 | Edge case | `COS102` ไม่มี CLO และไม่มี syllabus เลย | เปิดหน้าจัดการ syllabus ของ `COS102` | แสดง Empty State ชวนป้อน syllabus โดยไม่บล็อกการป้อน (การป้อน syllabus ไม่ผูกเงื่อนไข `clo_plo_ready` เหมือนการบันทึกการสอน) | AB-19, BR#1 (แยกส่วนกัน) |
| TC-AB19-04 | Rejection | `COS-NEW` ยังไม่ระบุกลุ่มหลักสูตร | พยายามป้อน syllabus ให้ `COS-NEW` | ระบบปฏิเสธ เพราะ syllabus ต้องผูกกับรายวิชาที่มีกลุ่มหลักสูตรแล้วเท่านั้น (สืบทอด curriculum จาก course) | AB-19 AC ข้อ 1, AB-02 |
| TC-AB19-05 | `[PLACEHOLDER — รอคำตอบ]` โครงสร้างข้อมูล | `U-INSTR-A` อัปโหลดไฟล์ syllabus ต้นฉบับ (เช่น .docx) ผ่าน `POST /courses/{id}/syllabus/upload` แทนการพิมพ์เอง | ระบบพยายามแปลงไฟล์เป็นโครงสร้าง per-week/per-session | **ยังไม่สามารถระบุผลลัพธ์ที่คาดหวังได้แน่ชัด** เพราะโครงสร้างข้อมูล syllabus (free text vs structured) ยังไม่ถูกกำหนดในสเปค (ดู [[test-plan-align|test-plan-align §6.2]]) — เขียน test case ละเอียดต่อเมื่อได้คำตอบเรื่องโครงสร้างแล้ว | AB-19, คำถามเปิด §6.2 |
| TC-AB19-06 | Accepted Risk (แก้ไขแล้ว — เดิมเป็น placeholder) | `COS101` มี syllabus เดิม (4 หัวข้อตาม 3.4) และมี `teaching_record` (`TR-001`..`TR-003`) กับ `syllabus_gap_result` ที่ยืนยันแล้วซึ่งอ้างอิง syllabus เวอร์ชันเดิมนี้ | `U-INSTR-A` แก้ไข `syllabus.content` กลางภาคการศึกษา (เช่น เปลี่ยน topic ของ week 14) แล้วมีการรัน gap analysis (AB-22) ใหม่ | `syllabus.content` ถูกอัปเดตทับแบบ update-in-place (ไม่มี version เดิมให้ย้อนดู) — การรัน gap analysis ใหม่ทุกครั้ง (รวมที่กระทบ `teaching_record` เดิมก่อนหน้าการแก้ไข) เทียบกับ `syllabus.content` **เวอร์ชันปัจจุบันเท่านั้น** เป็นพฤติกรรมที่ถูกต้องตามการออกแบบ (Accepted Risk — ดู align-technical-design §2.6/§4.3) ไม่ใช่บั๊ก แม้อาจทำให้ผล gap ของสัปดาห์ก่อนหน้าเปลี่ยนไปจากการแก้ไข syllabus ภายหลัง | AB-19, AB-22, align-technical-design §2.6/§4.3 (เดิมคำถามเปิด §6.2 — ดู §6.2b) |

---

## เชื่อมโยง

- ย้อนกลับไปยัง [[test-plan-align|test-plan-align]] (ภาพรวม Test Plan และชุดข้อมูลทดสอบเต็ม)
- ต่อเนื่องไปยัง [[e2-teaching-record-evidence|e2-teaching-record-evidence]] (การบันทึกการสอนที่ต้องผ่าน gate ของ AB-03 ก่อน)

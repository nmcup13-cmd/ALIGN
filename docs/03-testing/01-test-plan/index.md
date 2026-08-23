# 01 - Test Plan

เก็บ **แผนการทดสอบ (Test Plan)** ที่เตรียมไว้ก่อนลงมือทดสอบจริง เช่น

- Test case / test scenario ของแต่ละฟีเจอร์ (เช่น ความแม่นยำของ AI ในการจับคู่ CLO/PLO)
- เงื่อนไขและข้อมูลที่ใช้ในการทดสอบ (test data)
- ขอบเขตของการทดสอบ (in scope / out of scope)

อ้างอิงจากข้อกำหนดใน [[../../01-requirements/01-spec/index|01-spec]] และการออกแบบใน [[../../02-design/index|02-design]] ผลของการทดสอบตาม test case เหล่านี้ให้บันทึกใน [[../02-test-result/index|02-test-result]]

## เอกสารในหมวดนี้

แตกมาจาก Acceptance Criteria ของ [[../../01-requirements/02-plan/product-backlog|product-backlog]] (AB-01 ถึง AB-27 ไม่รวม AB-18 ที่ถูกตัดออกจากขอบเขตทั้งหมดแล้ว — ดู [[../../00-archived/backlog-ab-18-area-of-improvement-toggle|00-archived/backlog-ab-18-area-of-improvement-toggle]]) ครอบคลุมทุก Epic (E1–E6):

- [[test-plan-align|test-plan-align]] — **Test Plan หลัก**: ขอบเขตการทดสอบ (in/out of scope), บทบาทผู้ใช้ที่ใช้ทดสอบ, ชุดข้อมูลทดสอบ (test data) ที่ต้องเตรียมล่วงหน้า, สรุปจำนวน test case ต่อ Epic และคำถามเปิดที่ยังไม่มีคำตอบ (ห้ามสมมติคำตอบเอง)
- [[e1-clo-plo-syllabus-setup|e1-clo-plo-syllabus-setup]] — Test case ของ Epic E1 (AB-01, AB-02, AB-03, AB-04, AB-19): ตั้งค่ากลุ่มหลักสูตร/PLO, ป้อน CLO, ผูก CLO–PLO ภายในกลุ่มเดียวกัน, ภาพรวมรายวิชา, ป้อน/อัปโหลด course syllabus
- [[e2-teaching-record-evidence|e2-teaching-record-evidence]] — Test case ของ Epic E2 (AB-05, AB-06, AB-07): บันทึกการสอน, แนบหลักฐานหลายไฟล์, จำกัดสิทธิ์เข้าถึงหลักฐานตาม PDPA
- [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]] — Test case ของ Epic E3 (AB-08, AB-09, AB-10, AB-20, AB-21, AB-22): AI จับคู่ CLO/PLO เฉพาะกลุ่มหลักสูตร, การยืนยัน human-in-the-loop, สูตร % ความสอดคล้อง, ความถี่ที่แมทช์, gap analysis เทียบ syllabus
- [[e4-dashboard-alerts|e4-dashboard-alerts]] — Test case ของ Epic E4 (AB-11, AB-12, AB-13, AB-14, AB-23): แดชบอร์ด % ความสอดคล้องรวม, แจ้งเตือน CLO ที่ไม่มีหลักฐาน, แผนที่ CLO×สัปดาห์, แดชบอร์ดระดับหลักสูตร, เปรียบเทียบการสอนจริงกับ syllabus
- [[e5-word-export|e5-word-export]] — Test case ของ Epic E5 (AB-15, AB-16, AB-17): ออกเอกสาร Word, ส่วน Area of Improvement (แสดงเสมอ ไม่มี toggle ให้ซ่อน — AB-18 ถูกตัดออกจาก scope), ดาวน์โหลดเอกสารสำหรับ SAR
- [[e6-user-registration-approval|e6-user-registration-approval]] — Test case ของ Epic E6 (AB-24, AB-25, AB-26, AB-27): สมัครใช้งานเอง (self-service registration), gate ตรวจสอบ `account_status = 'approved'` ทุก request ก่อนเข้าถึง E1–E5, รายการบัญชี/อนุมัติ/ปฏิเสธแบบ admin-only visibility, การเห็นสถานะบัญชีของตนเองเท่านั้น

**สรุป**: รวม 143 test case ครอบคลุมทั้ง 26 User Stories (AB-01–AB-27 ไม่รวม AB-18) — ดูรายละเอียดขอบเขต/ชุดข้อมูลทดสอบ/คำถามเปิดทั้งหมดใน [[test-plan-align|test-plan-align]] **ปิดคำถามเปิดครบทุกข้อแล้ว** (2026-08-20): "ความถี่ที่แมทช์" §6.1, โครงสร้างข้อมูล course syllabus + algorithm จับคู่คำพ้องความหมาย §6.2, "Area of Improvement 3 ระดับ" §6.3, AB-18 ถูกตัดออกจาก scope §6.4, ฟิลด์ฟอร์มสมัครสมาชิก §6.5, `rejection_reason` บังคับกรอกหรือไม่ §6.6, วิธีสร้างบัญชี `program_admin` ชุดแรก §6.7 (อัปเดต 2026-08-23: เพิ่ม 8 test case ใหม่ใน E1/E2/E3 ครอบคลุม soft-delete `plo`/`evidence` และ snapshot ถาวรของ `ai_match_result.linked_plo_ids` ตาม `align-api-schema-design.md` §4.1/§5.1/§5.3 ที่ยืนยันแล้ว — ดูรายละเอียดในหัวข้อ 5 ของ [[test-plan-align|test-plan-align]])

### Test Spec เดี่ยว (companion เฉพาะ Feature/User Journey)

- [[test-spec-ai-review|test-spec-ai-review]] — **Test Spec** เฉพาะ Feature "ตรวจสอบและยืนยันผล AI ก่อนบันทึกจริง (Human-in-the-loop)" (AB-08, AB-09, AB-10) ผูกกับจุด "ระหว่างเทอม — หลังสอนแต่ละคาบ" ใน User Journey ของอาจารย์ผู้สอน และหน้าจอ 5–6 (Teaching Record Entry → AI Review Panel) โดยตรง — **เป็นเอกสารเสริม (companion) ของ [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]] ไม่ใช่เอกสารทดแทน** จัดทำขึ้นเพื่อสาธิต Test Spec ที่ผูกกับ Feature/User Journey เดียวอย่างชัดเจนตามข้อกำหนดของงาน

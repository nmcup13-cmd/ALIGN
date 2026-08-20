# [เก็บถาวร] AB-18 — ตัวเลือกรวม/ไม่รวม Area of Improvement ตอน Export เอกสาร Word

เดิมเป็น User Story ใน [[../01-requirements/02-plan/product-backlog|product-backlog]] (Epic E5) พร้อม Feature ที่เกี่ยวข้องใน [[../01-requirements/02-plan/feature-list|feature-list]] และ Task ที่เกี่ยวข้องใน [[../01-requirements/03-task/task-breakdown|task-breakdown]] (T-062, T-063) — ถูกตัดออกจาก backlog ที่ใช้งานจริงแล้ว

## เหตุผลที่ตัดออก

ผู้ใช้ยืนยันแล้ว (2026-08-20) ว่า **ไม่ต้องการฟีเจอร์นี้** — story นี้เดิมเป็น story ที่ backlog-analyst อนุมานเพิ่มเติมเอง ไม่ได้ระบุตรงในสเปคต้นฉบับ (ดู `docs/03-testing/01-test-plan/test-plan-align.md` §6.4 ที่ระบุว่าความเชื่อมั่นต่ำ) พฤติกรรมที่ถูกต้องตามที่ผู้ใช้ยืนยันคือ **เอกสาร Word export แสดง Area of Improvement เสมอ ไม่มี toggle ให้เลือก** (สอดคล้องกับ AB-16 ที่ยังคงอยู่ในบัคล็อกตามเดิม)

## เนื้อหาเดิม (ก่อนตัดออก)

### User Story (จาก product-backlog.md)

| ID | Epic | User Story | Priority | Acceptance Criteria | Status |
|----|------|------------|----------|----------------------|--------|
| AB-18 | E5 | ในฐานะอาจารย์ผู้สอน, ฉันต้องการเลือกได้ว่าจะรวมส่วน Area of Improvement ในเอกสารส่งออกหรือไม่, เพื่อที่จะปรับรูปแบบเอกสารให้ตรงกับความต้องการของแต่ละสถานการณ์การใช้งาน | ต่ำ | มีตัวเลือกให้เลือกรวม/ไม่รวมส่วน Area of Improvement ก่อน export; ตัวเลือกนี้ไม่ส่งผลต่อความถูกต้องของเนื้อหาหลักฐานอ้างอิงหลักที่ต้องเป็นข้อมูลจริงเสมอ (กฎทางธุรกิจ #4) | ยังไม่เริ่ม |

### Feature (จาก feature-list.md, Epic E5)

| Feature | คำอธิบาย | บทบาท | Priority | Story อ้างอิง |
|---|---|---|---|---|
| ตัวเลือกรวม/ไม่รวม Area of Improvement ตอน Export | ปรับรูปแบบเอกสารตามสถานการณ์การใช้งาน | อาจารย์ผู้สอน | ต่ำ (ความเชื่อมั่นต่ำ — story นี้เป็นการอนุมานเพิ่มเติม ไม่ได้ระบุตรงในสเปคต้นฉบับ) | AB-18 |

### Task (จาก task-breakdown.md)

| ID | PB Ref | Task | Status | หมายเหตุ |
|----|--------|------|--------|----------|
| T-062 | AB-18 | เพิ่ม UI ตัวเลือก (toggle/checkbox) ให้เลือกรวม/ไม่รวมส่วน Area of Improvement ก่อน export (หน้าเดียวกับ AB-15) | ยังไม่เริ่ม | ขึ้นกับ T-055 |
| T-063 | AB-18 | แก้ไข API generate เอกสาร (T-053/T-057) ให้รับพารามิเตอร์เลือกรวม/ไม่รวม Area of Improvement โดยไม่กระทบความถูกต้องของเนื้อหาหลักฐานอ้างอิงหลัก (กฎทางธุรกิจ #4) | ยังไม่เริ่ม | ขึ้นกับ T-053, T-057, T-062 |

### Test Case เดิม (จาก `docs/03-testing/01-test-plan/e5-word-export.md`, ก่อนถูกย้าย 2026-08-20)

ย้ายมาโดย test-designer เพราะ AB-18 ถูกตัดออกจาก scope ทั้งหมด — test case เหล่านี้ทดสอบ toggle `include_area_of_improvement` ที่ไม่มีอยู่ในระบบแล้ว (ดู `align-technical-design.md` §3 E5 ปัจจุบันที่ระบุว่า endpoint `POST /courses/{id}/export-word` ไม่มีพารามิเตอร์นี้ และเอกสารแสดง Area of Improvement เสมอ) ไฟล์ปัจจุบันมี TC-AB16-06 แทนที่ ยืนยันพฤติกรรม "แสดงเสมอ ไม่มี option ให้ซ่อน"

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB18-01 | Happy path | `COS101` มีข้อมูลพร้อมสร้างเอกสาร | `U-INSTR-A` เรียก `POST /courses/{COS101}/export-word` พร้อม `include_area_of_improvement = false` | เอกสารที่ได้ **ไม่มี** ส่วน Area of Improvement ปรากฏเลย แต่ส่วนอื่น (สรุป CLO/PLO, หลักฐานอ้างอิง) ยังคงถูกต้องครบถ้วนตามปกติ | AB-18 AC ข้อ 1–2 |
| TC-AB18-02 | Happy path | เช่นเดียวกับข้างต้น | เรียกพร้อม `include_area_of_improvement = true` | เอกสารมีส่วน Area of Improvement ปรากฏ (ตามเนื้อหาที่ทดสอบใน AB-16) | AB-18 AC ข้อ 1 |
| TC-AB18-03 | Rejection | `COS101` มีหลักฐานอ้างอิงจริงชุดหนึ่ง | สลับค่า `include_area_of_improvement` ระหว่าง true/false ในการสร้างเอกสารสองครั้งติดกัน | เนื้อหาหลักฐานอ้างอิงหลัก (CLO/PLO ที่ confirmed, รายการหลักฐานที่แนบจริง) **เหมือนกันทุกประการ** ทั้งสองกรณี มีเพียงส่วน Area of Improvement เท่านั้นที่ต่างกัน — ตัวเลือกนี้ไม่กระทบความถูกต้องของเนื้อหาหลักตาม BR#4 | AB-18 AC ข้อ 2, BR#4 |

---
ย้อนกลับไปที่ [[../01-requirements/02-plan/index|02-plan]] · [[../01-requirements/03-task/index|03-task]] · [[../00-archived/index|00-archived]] · [[../03-testing/01-test-plan/e5-word-export|03-testing/01-test-plan/e5-word-export]]

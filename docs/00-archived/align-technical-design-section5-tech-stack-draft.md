# [เก็บถาวร] align-technical-design.md §5 — Tech Stack ข้อเสนอคร่าวๆ (ก่อนสัมภาษณ์ทีมพัฒนาจริง)

> เอกสารนี้เก็บถาวรเนื้อหาเดิมของ §5 ("Tech Stack — ข้อเสนอ (ยืนยันกับทีมพัฒนาก่อนเริ่มจริง)") ใน [[../02-design/02-technical/align-technical-design|align-technical-design]] ก่อนถูกแทนที่ด้วยบทสรุปที่ชี้ไปยัง [[../02-design/02-technical/align-tech-stack|align-tech-stack]] (2026-08-23)
>
> **เหตุผลที่เก็บถาวร**: §5 เดิมเขียนขึ้นก่อนมีการสัมภาษณ์ทีมพัฒนาจริง (ทีม, งบ, timeline, PDPA, แนวทาง AI ฯลฯ) จึงเป็นข้อเสนอแบบเปิดกว้าง ไม่ผูกกับ stack ใดเป็นการเฉพาะ — หลังสัมภาษณ์แล้ว `align-tech-stack.md` ได้ระบุ stack จริง (Next.js + Supabase/PostgreSQL + Transformers.js hybrid ฯลฯ) พร้อมเหตุผลรองรับหนักแน่นกว่า จึงย้ายเนื้อหาเดิมนี้มาเก็บไว้เพื่อรักษาประวัติการตัดสินใจ ไม่ใช่เพราะเนื้อหาผิด

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

เชื่อมโยงกลับ: [[../02-design/02-technical/align-technical-design|align-technical-design]] · [[../02-design/02-technical/align-tech-stack|align-tech-stack]]

# 02 - Technical

เก็บเอกสาร **การออกแบบเชิงเทคนิค (Technical Design)** เช่น

- System architecture / โครงสร้างระบบโดยรวม
- Database schema
- API design / data contract (รวมถึงการเชื่อมต่อโมเดล AI สำหรับจับคู่ CLO/PLO)
- เทคโนโลยีและไลบรารีที่เลือกใช้ พร้อมเหตุผล

เอกสารในโฟลเดอร์นี้คือพิมพ์เขียวที่ทีมพัฒนาใช้อ้างอิงตอนลงมือเขียนโค้ด และเป็นฐานในการวางแผนทดสอบใน [[../../03-testing/01-test-plan/index|01-test-plan]]

## เอกสาร

- [[align-high-level-architecture|High-Level Architecture (Conceptual): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — ภาพรวมเชิงแนวคิด (logical component + data flow) อ่านก่อนเอกสารด้านล่าง ไม่ผูกกับ technical stack ใดๆ
- [[align-technical-design|Technical Design: ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — รายละเอียด schema/API/tech stack ที่ต่อยอดจากเอกสารด้านบน
- [[align-api-schema-design|API Spec + Database Schema (Conceptual): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — ER Diagram (Mermaid), รายละเอียดฟิลด์ต่อ entity พร้อม PDPA flag, และ API Spec แบบละเอียดตาม Epic — ต่อยอดจาก `align-technical-design.md` §2/§3 โดยไม่ผูกกับ technical stack ใดๆ เช่นกัน
- [[align-detailed-design|Detailed Design (Conceptual): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — Sequence Diagram (Mermaid) และ State Machine (Mermaid) ของ scenario หลักทั้งหมด (บันทึกการสอน→AI จับคู่→ยืนยัน, วิเคราะห์ gap เทียบ syllabus, สมัคร/อนุมัติบัญชี, ออกเอกสาร Word, แจ้งเตือน CLO ขาดหลักฐาน) พร้อมจุดบังคับใช้กฎทางธุรกิจต่อ step — ต่อยอดจาก 2 เอกสารข้างต้น ไม่ผูกกับ technical stack ใดๆ เช่นกัน
- [[align-tech-stack|Tech Stack (Concrete): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — ผลสัมภาษณ์ทีมพัฒนา/ผู้เกี่ยวข้องจริง (ขนาดทีม, งบประมาณ, timeline, แนวทาง AI, authentication, ที่เก็บไฟล์หลักฐาน, deployment) และคำแนะนำ tech stack ต่อชั้นแบบเจาะจง (ผูกกับผลิตภัณฑ์/เทคโนโลยีจริง ต่างจากเอกสาร conceptual ด้านบนที่ตั้งใจไม่ผูกกับ stack ใดๆ) — ระบุจุดที่ยังไม่ยืนยัน (งบ/data residency/SSO/ที่เก็บไฟล์/deployment) พร้อมทางย้าย (migration path) ไว้ชัดเจน

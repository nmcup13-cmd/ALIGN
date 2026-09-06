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
- [[align-api-schema-design|API Spec + Database Schema (Conceptual): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — โครงสร้าง collection/subcollection ของ Cloud Firestore (แทน ER Diagram เชิงสัมพันธ์เดิม, ปรับทั้งฉบับ 2026-09-05 ตามข้อกำหนดบังคับ Firebase ใน `align-tech-stack.md`), รายละเอียดฟิลด์ต่อ entity พร้อม PDPA flag, และ API Spec แบบละเอียดตาม Epic — ยังคงไม่ผูกกับรายละเอียด implementation อื่นนอกเหนือจากโมเดล document/collection ของ Firestore เอง (§2/§3 ของ `align-technical-design.md` แปลงเป็น Firestore ครบทั้งหมดแล้ว — §2.1–§2.10 เมื่อ 2026-09-05, §2.11–§2.15 และไดอะแกรมท้าย §2 ปิดครบเพิ่มเติมภายหลัง — ควรอ่านคู่กับรายละเอียดเต็มในเอกสารนี้เสมอ)
- [[align-detailed-design|Detailed Design (Conceptual): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — Sequence Diagram (Mermaid) และ State Machine (Mermaid) ของ scenario หลักทั้งหมด (บันทึกการสอน→AI จับคู่→ยืนยัน, วิเคราะห์ gap เทียบ syllabus, สมัคร/อนุมัติบัญชี, ออกเอกสาร Word, แจ้งเตือน CLO ขาดหลักฐานทั้งฝั่งอ่าน §1.5 และฝั่งเขียน/สร้าง-ปิด `notification` โดยแกนประสานงาน §1.6) พร้อมจุดบังคับใช้กฎทางธุรกิจต่อ step — ต่อยอดจาก 2 เอกสารข้างต้น ไม่ผูกกับ technical stack ใดๆ เช่นกัน
- [[align-tech-stack|Tech Stack (Concrete): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — ผลสัมภาษณ์ทีมพัฒนา/ผู้เกี่ยวข้องจริง (ขนาดทีม, งบประมาณ, timeline, แนวทาง AI, authentication, ที่เก็บไฟล์หลักฐาน, deployment) และคำแนะนำ tech stack ต่อชั้นแบบเจาะจง (ผูกกับผลิตภัณฑ์/เทคโนโลยีจริง ต่างจากเอกสาร conceptual ด้านบนที่ตั้งใจไม่ผูกกับ stack ใดๆ) — ระบุจุดที่ยังไม่ยืนยัน (งบ/data residency/SSO/ที่เก็บไฟล์/deployment) พร้อมทางย้าย (migration path) ไว้ชัดเจน
- [[align-nfr|Non-Functional Requirements (NFR): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)]] — แปลงกฎทางธุรกิจ + ข้อจำกัดทีม/งบ/timeline จริง (จากเอกสารข้างต้น) เป็นเป้าหมายเชิงคุณภาพที่วัดผลได้ (security, PDPA/privacy, maintainability, auditability, data integrity, availability, backup/DR, capacity ฯลฯ) — แยกชัดเจนเป็น "ต้องมี/ตัดสินใจแล้ว/ยังไม่ยืนยัน/ควรมี/เลื่อนได้"

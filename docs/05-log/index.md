# 05 - Log

บันทึก **ความเคลื่อนไหวและเหตุการณ์สำคัญของโปรเจกต์** แบบเรียงตามลำดับเวลา (chronological log) เช่น

- Changelog ของแต่ละเวอร์ชัน/รอบการพัฒนา
- บันทึกการตัดสินใจสำคัญ (decision log) พร้อมเหตุผล
- เหตุการณ์หรือปัญหาที่เกิดขึ้นระหว่างทาง

ใช้เป็นแหล่งอ้างอิงเมื่อสรุปบทเรียนใน [[../04-retrospectives/index|04-retrospectives]] หรือเมื่อย้อนดูว่าเหตุใดจึงมีการตัดสินใจแบบใดแบบหนึ่ง

## เอกสาร

- [[2026-08-02-init|2026-08-02: เริ่มโปรเจกต์ ALIGN]]
- [[2026-08-02-log|2026-08-02: ปรับ requirement เรื่องหลักสูตร 2565/2570 และสร้าง Product Backlog]]
- [[2026-08-20-log|2026-08-20: Epic E6 (สมัคร/อนุมัติบัญชี), ข้อมูล PLO/รายวิชาจริง, และปิดคำถามเปิดหลายข้อ]]
- [[2026-08-23-conceptual-design-docs-log|2026-08-23 (ย้อนหลัง): เพิ่ม 3 เอกสาร Conceptual Design และ 3 Subagent ใหม่]]
- [[2026-08-23-soft-delete-and-tech-stack-log|2026-08-23 (ย้อนหลัง): ปิด CLO Soft-Delete ครบ 5/5 Entity และเพิ่ม Tech Stack Advisor]]
- [[2026-08-23-log|2026-08-23: วิเคราะห์ Non-Functional Requirements (NFR) และสร้าง align-nfr.md]]
- [[2026-08-23-release-planner-log|2026-08-23: เพิ่ม Agent/Skill สำหรับแบ่ง Phase/Release และผูก Task ต่อ Phase]]
- [[2026-08-23-architecture-audit-fix-log|2026-08-23: แก้ไขข้ออ้างอิงสเปคที่ผิดใน align-high-level-architecture.md (§4.2 exclusive role)]]
- [[2026-08-23-audit-log|2026-08-23: รัน audit ทั้งระบบ พบ 8 finding แก้ 7 ข้อ]]
- [[2026-09-05-notification-account-approval-log|2026-09-05: เพิ่ม entity `notification` และ `account_approval_log` เข้า align-api-schema-design.md]]
- [[2026-09-05-firebase-mandatory-tech-stack-log|2026-09-05: ข้อกำหนดบังคับ Firebase/Firestore — ปรับ align-tech-stack.md รอบที่ 2 และปิดคำถามค้างครบ 4 ข้อในรอบที่ 3 (ยืนยันทั้ง Firebase suite)]]
- [[2026-09-06-technical-design-firestore-conversion-completion-log|2026-09-06: ปิด audit finding — แปลง §2.11–§2.15 และไดอะแกรมท้าย §2 ของ align-technical-design.md เป็น Firestore ให้ครบ]]
- [[2026-09-06-high-level-architecture-notification-writer-fix-log|2026-09-06: ปิด audit finding — ระบุชัดว่า "แกนประสานงาน" เป็นผู้เขียน `notification` ใน align-high-level-architecture.md (GapNotify คง read-only)]]
- [[2026-09-06-api-schema-design-stale-status-cleanup-log|2026-09-06: ปิด audit finding — แก้ป้ายกำกับสถานะตกค้าง (ai_match_result document ID, collection hierarchy, อ้างอิง align-technical-design.md) ใน align-api-schema-design.md]]
- [[2026-09-06-detailed-design-notification-sequence-log|2026-09-06: ปิด audit finding — เพิ่ม sequence diagram ของ notification (T-042 สร้าง/auto-resolve) เข้า align-detailed-design.md, แก้ §1.5 ให้ GapNotify อ่านจาก notification collection แทนคำนวณสด]]
- [[2026-09-06-scaffold-align-app-log|2026-09-06: Scaffold โปรเจกต์ Next.js จริง (`align-app/`) ผูก Firebase project `nmc-align-2026` — TypeScript, ติดตั้ง firebase/firebase-admin SDK]]

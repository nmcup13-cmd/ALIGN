---
name: audit-align-docs
description: Audit all ALIGN documentation for cross-document consistency and staleness (terminology drift, missing traceability, contradicting decisions, orphaned references), by delegating to the read-only backlog-auditor subagent, then help route each finding to the right fix. Use when asked to "ตรวจสอบเอกสารทั้งหมด", "เช็คว่าเอกสารสอดคล้อง/เป็นเวอร์ชั่นล่าสุดหรือไม่", or periodically after several docs have changed.
---

# Audit ALIGN Docs

ตรวจสอบความสอดคล้องและความเป็นปัจจุบันของเอกสารทั้งหมดในโปรเจกต์ ALIGN โดยมอบหมายให้ subagent `backlog-auditor` ตรวจแบบ read-only ก่อน แล้วช่วยผู้ใช้ตัดสินใจว่าจะแก้อะไรต่อ

## ขั้นตอน

1. เรียก Agent tool ด้วย `subagent_type: backlog-auditor` — ไม่ต้อง precheck ไฟล์เฉพาะเจาะจง (agent จะอ่านเองทั้งหมด) นอกจากเช็คว่ามีโฟลเดอร์ `docs/` อยู่จริง
2. รับรายงานที่แบ่งกลุ่มตามความรุนแรง (🔴 Contradiction / 🟡 Gap / 🔵 Orphaned reference) แสดงให้ผู้ใช้เห็นทั้งหมด **ห้ามสรุปย่อจนรายละเอียดหาย** — อย่างน้อยต้องมีไฟล์+คำพูดที่ยกมาของแต่ละ finding
3. ถ้ามี 🔴 Contradiction ที่ agent ระบุว่า "ต้องให้ผู้ใช้ตัดสินใจ" ให้ถามผู้ใช้ทีละรายการก่อนดำเนินการต่อ (เหมือนกรณี syllabus versioning ที่เคยเกิดขึ้น) — **ห้ามเลือกทางแก้แทนผู้ใช้เอง**
4. เมื่อผู้ใช้ตัดสินใจแล้วว่าจะแก้ finding ไหน ให้เรียก agent/skill ที่ backlog-auditor แนะนำไว้ (`backlog-analyst` / `prototype-designer` / `test-designer`) ไปแก้ตามจุดที่ระบุ ไม่ใช่แก้เองในบทสนทนาหลัก
5. หลังแก้ไขแล้ว แนะนำให้รัน `audit-align-docs` อีกรอบเพื่อยืนยันว่า finding นั้นหายไปจริง

## กฎ

- อย่าตรวจสอบเอกสารเองในบทสนทนาหลัก — งาน audit ต้องผ่าน `backlog-auditor` เสมอ เพื่อให้ครอบคลุมเอกสารทั้งหมดโดยไม่ใช้ context ของบทสนทนาหลัก
- อย่าแก้ finding ใดๆ เองทันทีโดยไม่ถามผู้ใช้ก่อน แม้จะดูเป็นเรื่องเล็กน้อย (เช่น terminology drift) เพราะบางครั้งสิ่งที่ auditor เห็นว่า "ผิด" อาจเป็นความตั้งใจที่ยังไม่ได้ propagate ไปทุกที่
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้

---
name: backlog-to-release-plan
description: Create or update ALIGN's Release/Phase Plan — sequencing Epics/User Stories/Features from the Product Backlog and Feature List into ordered Phases/Releases, and tagging the existing Task Breakdown with the Phase each task belongs to — under docs/01-requirements/02-plan/ and docs/01-requirements/03-task/, by delegating the work to the release-planner subagent. Use when asked to "แบ่ง phase", "ทำ release plan", "จัดลำดับ Epic ก่อน-หลัง", "แตก task ตาม phase", or when backlog/priority changes need to be reflected in the phase/release sequencing.
---

# Backlog to Release Plan

แปลง Product Backlog + Feature List (และ Task Breakdown ที่มีอยู่แล้ว) ของโปรเจกต์ ALIGN ให้เป็น/อัปเดต**แผนแบ่ง Phase/Release** — จัดลำดับว่า Epic/Story/Feature ไหนทำก่อน-หลัง แบ่งเป็นช่วงงานที่มีเป้าหมายชัดเจน แล้วผูก Task ที่มีอยู่แล้วเข้ากับแต่ละ Phase โดยมอบหมายงานให้ subagent `release-planner` ทำในบริบทที่แยกออกไป

เอกสารที่ได้ (`docs/01-requirements/02-plan/release-plan.md`) เป็นคนละงานกับ `product-backlog.md`/`feature-list.md` (บอกว่า "มีอะไรบ้าง") และ `task-breakdown.md` (บอกว่า "แต่ละอย่างแตกเป็นงานย่อยอะไรบ้าง") — เอกสารนี้ตอบคำถาม "อะไรทำก่อน-หลัง แบ่งเป็นกี่ช่วง ช่วงไหนจบแล้วได้อะไรใช้งานจริง" งานนี้**จัดลำดับ/จัดกลุ่มของที่มีอยู่แล้วเท่านั้น ไม่สร้าง Epic/Story/Task ใหม่**

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/02-plan/product-backlog.md`, `docs/01-requirements/02-plan/feature-list.md`, และ `docs/01-requirements/03-task/task-breakdown.md` อยู่ครบหรือไม่ — ถ้าขาดไฟล์ใดไฟล์หนึ่ง ให้แจ้งผู้ใช้ก่อน (เช่น เสนอให้รัน `requirement-to-backlog` ก่อนถ้ายังไม่มี backlog) ไม่ต้องเรียก agent
2. เก็บจากผู้ใช้ (ถ้าให้มาในคำขอ) ว่าต้องการวางแผนขอบเขตทั้งหมดหรือเฉพาะบางส่วน (เช่น เฉพาะบาง Epic/Feature ที่ระบุชื่อมา) — ถ้าผู้ใช้ยังไม่ระบุ ปล่อยให้ `release-planner` เป็นผู้ถามเอง
3. เรียก Agent tool ด้วย `subagent_type: release-planner` พร้อม prompt ที่สรุป:
   - เหตุผลของงานนี้ (สร้างแผนใหม่ครั้งแรก, อัปเดตเพราะ backlog/priority เปลี่ยน, หรือขอจัด phase ใหม่ตามเกณฑ์ที่ผู้ใช้ระบุ)
   - ขอบเขตที่ต้องการ (ทั้งหมด หรือเฉพาะ Epic/Feature ที่ระบุ) ถ้าผู้ใช้ให้มาแล้ว
   - Sequencing strategy/จำนวน phase ที่ผู้ใช้อาจระบุมาล่วงหน้าแล้ว (ถ้ามี) เพื่อไม่ต้องถามซ้ำ
   - บริบทอื่นจากบทสนทนาที่ agent context แยกจะไม่เห็น (เช่น เดดไลน์/ข้อจำกัดทีมที่เพิ่งคุยกันสดๆ ยังไม่บันทึกลงเอกสาร)
4. **สำคัญ — ข้อจำกัดที่รู้อยู่แล้วของ session นี้**: เครื่องมือ `AskUserQuestion` มักใช้ไม่ได้ในบริบทของ subagent ที่รันผ่าน Agent tool (เคยเกิดกับ agent อื่นในโปรเจกต์นี้มาแล้วหลายครั้ง) — ให้เตรียมใจว่า `release-planner` อาจไม่สามารถถามคำถามได้เองจริง และจะส่งคำถามทั้งหมด (พร้อม ≥3 ตัวเลือก + ข้อดี-ข้อเสียต่อข้อ) กลับมาในคำตอบแทน ถ้าเป็นเช่นนั้น ให้นำคำถามทั้งหมดมาถามผู้ใช้เองผ่าน `AskUserQuestion` ในบทสนทนาหลัก (แบ่งเป็นหลายรอบได้ถ้าคำถามเยอะเกิน 4 ข้อต่อครั้ง) แล้วส่งคำตอบทั้งหมดกลับไปให้ agent (ใช้ SendMessage resume ด้วย agentId เดิม) เพื่อให้เขียนแผนต่อให้เสร็จ — **ห้ามเลือกคำตอบแทนผู้ใช้เอง** แม้ตัวเลือกจะดูชัดเจนก็ตาม
5. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์:
   - `docs/01-requirements/02-plan/release-plan.md` มีครบ 5 ส่วนตามที่ agent ต้องทำ (ขอบเขต, sequencing strategy, phase-by-phase, task mapping, ประเด็นเปิด)
   - `docs/01-requirements/03-task/task-breakdown.md` มีคอลัมน์ "Phase" เพิ่มเข้ามา และคอลัมน์เดิม (ID, PB Ref, Task, Status, หมายเหตุ) ของทุกแถวไม่ถูกแก้ไข
   - ลิงก์ใน `index.md` ของทั้ง `02-plan` และ `03-task`
6. สรุปให้ผู้ใช้ว่ามี Phase อะไรบ้าง แต่ละ Phase มีเป้าหมาย/Epic อะไร และมีประเด็นเปิดอะไรที่ต้องตัดสินใจต่อ

## กฎ

- อย่าจัด phase/แก้ task-breakdown เองในบทสนทนาหลัก — งานนี้ต้องผ่าน `release-planner` เสมอ เพื่อให้บังคับกฎ "ห้ามสร้าง scope ใหม่" และ "ต้องถามพร้อม ≥3 แนวทางเลือกเมื่อไม่ชัดเจน" ได้แน่นอน
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้ ให้ตรงกับเอกสารอื่นในโปรเจกต์
- ห้ามลบเนื้อหาเดิมโดยไม่ถามก่อน — ปล่อยให้ `release-planner` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)
- ถ้า agent รายงานว่าพบช่องว่าง (ต้องการ task ที่ยังไม่มีอยู่จริงใน `task-breakdown.md`) ให้แจ้งผู้ใช้และเสนอเรียก skill `backlog-to-test-plan`/แก้ `task-breakdown.md` เพิ่มเติมตามความเหมาะสม ไม่ใช่ให้ `release-planner` สร้าง task นั้นขึ้นมาเอง

---
name: choose-tech-stack
description: Help ALIGN pick or revisit its concrete technical stack (frontend, backend, database, AI integration approach, file storage, hosting, auth) by intensively interviewing the user about team skills, budget/infrastructure, timeline, and data-residency constraints, then delegating the recommendation and write-up to the tech-stack-advisor subagent. Use when asked to "เลือก tech stack", "แนะนำเทคโนโลยีที่ควรใช้", "อัปเดตเอกสาร tech stack", or when project constraints (team, budget, hosting) change.
---

# Choose Tech Stack

ช่วยโปรเจกต์ ALIGN **เลือก tech stack จริง** (คนละงานกับ 3 skill ก่อนหน้าที่ตั้งใจไม่ผูกกับ stack) โดยสัมภาษณ์ผู้ใช้แบบเข้มข้นก่อน แล้วมอบหมายให้ subagent `tech-stack-advisor` วิเคราะห์และเขียนเอกสารคำแนะนำ

## ขั้นตอน

1. ตรวจสอบว่ามี `docs/01-requirements/01-spec/requirement-align.md` อยู่หรือไม่ — ถ้ายังไม่มี แจ้งผู้ใช้ก่อน ไม่ต้องเรียก agent
2. เรียก Agent tool ด้วย `subagent_type: tech-stack-advisor` พร้อม prompt สรุปเหตุผลของงานนี้ (เลือกครั้งแรก หรืออัปเดตเพราะข้อจำกัดเปลี่ยน) และบอกให้ agent อ่านเอกสาร conceptual 3 ฉบับ (`align-high-level-architecture.md`, `align-api-schema-design.md`, `align-detailed-design.md`) ก่อนตั้งคำถาม ถ้ายังไม่มีเอกสารเหล่านี้บางฉบับ ให้แจ้งผู้ใช้ว่า agent จะถามคำถามกว้างกว่านี้เพราะไม่มีฐาน conceptual ให้อ้างอิง
3. **สำคัญ — ข้อจำกัดที่รู้อยู่แล้วของ session นี้**: เครื่องมือ `AskUserQuestion` มักใช้ไม่ได้ในบริบทของ subagent ที่รันผ่าน Agent tool (เคยเกิดกับ agent อื่นในโปรเจกต์นี้มาแล้วหลายครั้ง) — ให้เตรียมใจว่า `tech-stack-advisor` อาจไม่สามารถถามคำถามได้เองจริง และจะส่งคำถามทั้งหมด (พร้อม 3 ตัวเลือก+ข้อดีข้อเสียต่อข้อ) กลับมาในคำตอบแทน ถ้าเป็นเช่นนั้น ให้นำคำถามทั้งหมดมาถามผู้ใช้เองผ่าน `AskUserQuestion` ในบทสนทนาหลัก (แบ่งเป็นหลายรอบได้ถ้าคำถามเยอะเกิน 4 ข้อต่อครั้ง) แล้วส่งคำตอบทั้งหมดกลับไปให้ agent (ใช้ SendMessage resume ด้วย agentId เดิม) เพื่อให้เขียนเอกสารต่อให้เสร็จ — ห้ามข้ามมิติใดที่ agent ระบุว่าต้องถาม แม้จะดูยาว เพราะเจตนาของงานนี้คือ "สัมภาษณ์แบบเข้มข้น"
4. เมื่อ agent เขียนไฟล์เสร็จ ตรวจสอบผลลัพธ์ในโฟลเดอร์ `docs/02-design/02-technical/` (โดยเฉพาะว่าคำแนะนำแต่ละชั้นอ้างอิงคำตอบสัมภาษณ์จริง ไม่ใช่เหตุผลลอยๆ) และลิงก์ใน `index.md` ก่อนสรุปให้ผู้ใช้
5. ถ้า agent รายงานว่า `align-technical-design.md` §5 ควรปรับให้ชี้ไปเอกสารใหม่ ให้แจ้งผู้ใช้และเสนอเรียก skill `backlog-to-technical-design` ต่อ — อย่าแก้ `align-technical-design.md` เองในบทสนทนาหลัก

## กฎ

- อย่าแนะนำ/เลือก tech stack เองในบทสนทนาหลักโดยไม่ผ่าน `tech-stack-advisor` — เพื่อให้บังคับกฎ "ต้องสัมภาษณ์ครบทุกมิติก่อนแนะนำ" ได้แน่นอน
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้
- ห้ามลบเนื้อหาเดิมโดยไม่ถามก่อน — ปล่อยให้ `tech-stack-advisor` จัดการตามกฎของมันเอง (ย้ายไป `docs/00-archived/` แทนการลบ)

# 2026-08-23: เพิ่ม Agent/Skill สำหรับแบ่ง Phase/Release และผูก Task ต่อ Phase

## บริบท

โปรเจกต์มี `product-backlog.md`, `feature-list.md`, และ `task-breakdown.md` (แบบ flat ไม่แบ่งช่วงงาน) อยู่แล้ว แต่ `docs/01-requirements/02-plan/index.md` ระบุไว้ตั้งแต่ต้นว่าโฟลเดอร์นี้ควรมี "การแบ่ง phase หรือ milestone" — ยังไม่มีเอกสาร/subagent เฉพาะทางทำหน้าที่นี้จริง จึงเพิ่ม agent `release-planner` และ skill `backlog-to-release-plan` ตามรูปแบบเดิมของโปรเจกต์ (subagent context แยก + `AskUserQuestion` พร้อม ≥3 ตัวเลือก+ข้อดีข้อเสียเมื่อไม่ชัดเจน เหมือน `architecture-designer`/`api-schema-designer`/`detailed-designer`/`tech-stack-advisor`)

## ขอบเขตของ agent ใหม่

- อ่าน requirement + product-backlog + feature-list + task-breakdown (และ align-tech-stack/align-nfr สำหรับข้อจำกัดทีม/เวลาจริง) แล้วจัด Epic/Story/Feature เข้า Phase ตามลำดับก่อน-หลัง — **ไม่สร้าง Epic/Story/Task ใหม่** จัดลำดับ/จัดกลุ่มของที่มีอยู่แล้วเท่านั้น
- เขียนผลลัพธ์ใหม่ที่ `docs/01-requirements/02-plan/release-plan.md` และแก้ `docs/01-requirements/03-task/task-breakdown.md` โดย**เพิ่มคอลัมน์ "Phase" เท่านั้น** ห้ามแก้ค่าคอลัมน์เดิม (ID, PB Ref, Task, Status, หมายเหตุ) ของแถวใดๆ
- ต้องถามผู้ใช้ก่อนเสมอ (พร้อม ≥3 ตัวเลือก+ข้อดีข้อเสีย) เมื่อไม่ชัดเจนในเรื่อง: ขอบเขตที่จะวางแผน, sequencing strategy (dependency-first/priority-first/risk-first/MVP thin-slice), จำนวน phase, นิยามความสัมพันธ์ Phase↔Release, และความละเอียดของ timeline — ห้ามสมมติตัวเลข velocity/วันที่ที่ไม่มีแหล่งอ้างอิงจริง
- ยังไม่ได้รันสร้าง `release-plan.md` จริงในรอบนี้ — งานรอบนี้คือสร้างโครง agent/skill เท่านั้น รอผู้ใช้เรียกใช้ skill ในรอบถัดไป

## เอกสารที่แก้ไข/เพิ่มเติม

- สร้างใหม่: `.claude/agents/release-planner.md`, `.claude/skills/backlog-to-release-plan/SKILL.md`
- อัปเดต: `CLAUDE.md` (ตาราง "Sub Agents & Agent Skills" เพิ่มแถวที่ 11)

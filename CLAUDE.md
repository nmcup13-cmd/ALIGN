# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is a **documentation-only Obsidian vault** for the planning/design/testing lifecycle of **ALIGN** — a CLO/PLO teaching-alignment tracker — there is no application source code, build tooling, or test suite here yet. All content lives under `docs/` as Markdown notes written in Thai, cross-linked with Obsidian `[[wikilink]]` syntax. There are no build, lint, or test commands to run.

If application code is added later, prefer following whatever technical design gets recorded in `docs/02-design/02-technical/` rather than inventing a stack from scratch.

## Documentation workflow and structure

The vault encodes a fixed project workflow, and each stage's folder feeds the next. Every folder has an `index.md` describing its purpose and linking forward/backward to related stages — read the relevant `index.md` before adding a note to understand where it fits and what it should link to:

```
01-requirements/01-spec    → requirements/specs (source of truth)
01-requirements/02-plan    → roadmap derived from specs
01-requirements/03-task    → concrete task breakdown derived from the plan
02-design/01-prototypes    → UI/UX mockups, wireframes, user flow (from specs)
02-design/02-technical     → architecture, DB schema, API design (from prototypes)
03-testing/01-test-plan    → test cases/scenarios (from technical design)
03-testing/02-test-result  → actual pass/fail results and bugs (from test plan)
04-retrospectives          → lessons learned per phase/sprint (from test results + log)
05-log                     → chronological changelog / decision log
00-archived                → superseded/cancelled documents
```

Key conventions:
- **Never delete a document outright.** Move superseded or cancelled docs into `00-archived/` instead, to preserve decision history.
- New notes should link back to the folder(s) they were derived from and forward to the folder(s) that consume them, matching the existing `index.md` link style (e.g. `[[../02-plan/index|02-plan]]`).
- Keep documentation content in Thai, consistent with the existing notes.

## Domain glossary (ALIGN)

- **CLO** (Course Learning Outcome) — ผลลัพธ์การเรียนรู้ระดับรายวิชา
- **PLO** (Program Learning Outcome) — ผลลัพธ์การเรียนรู้ระดับหลักสูตร
- **มคอ.** — เอกสารมาตรฐานคุณวุฒิที่ใช้ประกันคุณภาพหลักสูตร (เอกสารส่งออกของระบบต้องรองรับการใช้งานนี้)
- **match %** — ค่าความตรงที่ AI คำนวณจากการจับคู่การสอนกับ CLO — เป็นค่าเริ่มต้นที่ต้องให้อาจารย์ยืนยันก่อนเสมอ (human-in-the-loop) ไม่ใช่ผลลัพธ์สุดท้าย

รายละเอียดฉบับเต็มอยู่ใน [[docs/01-requirements/01-spec/requirement-align|requirement-align]] — ให้ถือเป็น source of truth เมื่อออกแบบหรือเขียนเอกสารต่อยอด

## Conditions & requirements when working on ALIGN

เมื่อร่าง/แก้ไขเอกสารหรือออกแบบฟีเจอร์ใดๆ ให้ยึดเงื่อนไขต่อไปนี้ตามกฎทางธุรกิจในสเปค:

1. **ผูก CLO–PLO ก่อนบันทึกการสอน** — ทุกรายวิชาต้องมี CLO อย่างน้อย 1 ข้อที่ผูกกับ PLO อย่างน้อย 1 ข้อ ก่อนจึงอนุญาตให้บันทึกการสอนได้ ห้ามออกแบบ flow ที่ข้ามเงื่อนไขนี้
2. **แจ้งเตือน CLO ที่ยังไม่มีหลักฐาน** — ต้องมีกลไกแจ้งเตือนทันทีที่ CLO ใดไม่มีข้อมูลการสอน/หลักฐานรองรับ อย่าออกแบบให้ผู้ใช้ต้องไปตรวจสอบเองแบบ manual
3. **AI เป็นค่าตั้งต้น ไม่ใช่ค่าบังคับ** — ผลจับคู่ CLO/PLO และ match % จาก AI ต้องให้อาจารย์ตรวจสอบและยืนยันได้เสมอก่อนบันทึกจริง ห้ามออกแบบให้ระบบบันทึกผล AI ทันทีโดยไม่ผ่านการยืนยันของมนุษย์
4. **เอกสารส่งออกอ้างอิงหลักฐานจริงเท่านั้น** — เอกสาร Word/มคอ. ที่ออกจากระบบต้องอ้างอิงเฉพาะชิ้นงาน/หลักฐานที่แนบไว้จริงในระบบ ห้ามสร้างข้อมูลอ้างอิงที่ไม่มีหลักฐานรองรับ
5. **ข้อมูลส่วนบุคคลของนักศึกษาต้องเข้าถึงแบบจำกัดสิทธิ์ตาม PDPA** — ชิ้นงาน/หลักฐานที่แนบอาจมีข้อมูลส่วนบุคคลปะปน การออกแบบ schema, สิทธิ์การเข้าถึง หรือ API ใดๆ ต้องจำกัดสิทธิ์เฉพาะอาจารย์ผู้สอนและผู้ประสานหลักสูตรที่เกี่ยวข้องเท่านั้น
6. **ห้ามขยายขอบเขตเกิน Out of Scope ที่ระบุไว้** — อย่าออกแบบหรือเสนอฟีเจอร์ที่เข้าข่ายระบบจัดตารางสอน, ระบบให้คะแนน/เกรดรายบุคคลของนักศึกษา, หรือระบบบริหารจัดการหลักสูตรแบบเต็มรูปแบบ (เช่น การปรับปรุงหลักสูตร มคอ.2) เว้นแต่ผู้ใช้ระบุเป็นเงื่อนไขใหม่อย่างชัดเจน

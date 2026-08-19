---
name: check-prototype-updates
description: Check whether ALIGN's prototype documentation has drifted from DESIGN.md or product-backlog.md (new stories not yet designed, renamed tokens/roles/entities not yet propagated), and if drift is found, automatically delegate the fix to the prototype-designer subagent. Use when asked to "เช็ค prototype ว่าตกรุ่นไหม", "DESIGN.md เปลี่ยน prototype ต้องอัปเดตหรือยัง", or periodically after backlog/DESIGN.md changes.
---

# Check Prototype Updates

ตรวจว่าเอกสาร prototype ของ ALIGN ตามทัน `DESIGN.md`/`product-backlog.md` หรือไม่ ผ่าน subagent `prototype-sync-checker` (read-only) แล้วถ้าพบว่าตกรุ่นจริง ให้ส่งต่อให้ `prototype-designer` แก้ไขทันทีในขั้นตอนเดียวกัน (ตามเจตนาของ workflow นี้ — ต่างจาก `audit-align-docs` ที่หยุดรอผู้ใช้ตัดสินใจก่อนเสมอ)

## ขั้นตอน

1. เรียก Agent tool ด้วย `subagent_type: prototype-sync-checker` เพื่อตรวจหา gap
2. ถ้าผลลัพธ์คือ "ไม่พบ gap" ให้แจ้งผู้ใช้ว่า prototype อยู่ตรงกับแหล่งข้อมูลต้นทางแล้ว จบงานตรงนี้ ไม่ต้องเรียก agent อื่นต่อ
3. ถ้าพบ gap อย่างน้อย 1 รายการ:
   - รายการที่เป็น `[STALE TOKEN REF]` / `[STALE ROLE TERM]` / `[STALE ENTITY REF]` (แก้ไขคำ/ชื่ออ้างอิงตรงไปตรงมา ไม่กระทบการออกแบบ) — ส่งรายการทั้งหมดให้ `prototype-designer` แก้ไขได้ทันทีโดยไม่ต้องถามผู้ใช้ก่อน เพราะเป็นการซิงก์ให้ตรงกับของจริง ไม่ใช่การตัดสินใจออกแบบใหม่
   - รายการที่เป็น `[NEW STORY UNCOVERED]` (ต้องออกแบบหน้าจอ/flow ใหม่) — แจ้งผู้ใช้ก่อนว่ามี story อะไรบ้างที่ยังไม่มีหน้าจอ แล้วถามว่าต้องการให้ออกแบบตอนนี้เลยไหม (เพราะอาจเป็นงานออกแบบที่ใหญ่พอสมควร)
4. เรียก Agent tool ด้วย `subagent_type: prototype-designer` พร้อม prompt ที่แนบรายการ gap ทั้งหมดจากขั้นตอน 3 ที่ได้รับอนุมัติให้แก้ตรงๆ
5. ตรวจสอบผลลัพธ์ที่ prototype-designer แก้ไข แล้วแนะนำให้รัน `check-prototype-updates` อีกรอบเพื่อยืนยันว่า gap หายไปจริง

## กฎ

- อย่าตรวจหรือแก้ prototype เองในบทสนทนาหลัก — ต้องผ่าน `prototype-sync-checker` และ `prototype-designer` เสมอ
- gap ที่กระทบการออกแบบใหม่ (`[NEW STORY UNCOVERED]`) ต้องถามผู้ใช้ก่อนเสมอ ไม่ auto-fix แบบ token/role/entity rename
- ใช้ภาษาไทยในการสื่อสารกับผู้ใช้

# Prototype: Interactive Clickable Canvas — ALIGN (ทั้ง 2 บทบาท, Desktop + Mobile)

เอกสารนี้เป็น **ต้นแบบเชิงภาพที่คลิก/กรอกข้อมูลได้จริง** เสริมจากเอกสารข้อความ+ตารางใน [[align-app-screens|align-app-screens]] (อาจารย์ผู้สอน), [[align-program-admin-screens|align-program-admin-screens]] (ผู้บริหารหลักสูตร), [[align-navigation-flow|align-navigation-flow]] และ [[align-user-journey|align-user-journey]] — เอกสารข้อความยังคง **เป็น source of truth หลัก** ของ layout/component/state ตามที่ระบุใน `CLAUDE.md`; ไฟล์ในโฟลเดอร์นี้คือการนำสเปคเดียวกันไปสร้างเป็นต้นแบบที่คลิกได้จริงเพื่อสื่อสาร/ทดสอบ flow ก่อนพัฒนาจริง

อ้างอิงคู่กับ [[../../../DESIGN.md|DESIGN.md]] — สี/ตัวอักษร/สเปซ/component/UX Rules ทั้งหมดที่ใช้ในต้นแบบนี้ตรงกับโทเค็นในไฟล์นั้น (ตรวจสอบแล้ว: hex สีทุกจุด, ฟอนต์ IBM Plex Sans Thai Looped + IBM Plex Mono, ไม่มี font-weight เกิน 600, stroke ไอคอน 1.5px)

## เปิดดูต้นแบบ

**ลิงก์ต้นแบบที่คลิกได้ (Claude Artifact)**: https://claude.ai/code/artifact/536c8cbe-f611-4a88-9c1d-e9a45427b4f7

ต้นแบบมี 2 หน้า (pages) บน canvas เดียว:
- **Desktop** — 13 artboard: 9 หน้าจอบทบาทอาจารย์ผู้สอน (บางหน้าจอรวม 2 แท็บในไฟล์เดียว) + 5 หน้าจอบทบาทผู้บริหารหลักสูตร
- **Mobile** — เวอร์ชันหน้าจอมือถือ (375px, bottom tab bar แทน side navigation) ของทั้ง 13 หน้าจอเดียวกัน **บวกอีก 3 หน้าจอใหม่ (มือถือเท่านั้น ตาม Epic E6)**: สมัครสมาชิก (M10), สถานะบัญชี/รออนุมัติ (M11) ของฝั่งอาจารย์ผู้สอน และอนุมัติบัญชีผู้ใช้ของฝั่งผู้บริหารหลักสูตร (M-ผู้บริหาร 6) — ยังไม่มีเวอร์ชัน Desktop สำหรับ 3 หน้าจอนี้ (ทำตามที่ผู้ใช้ขอเฉพาะมือถือ)

## Interaction ที่ทำได้จริงในต้นแบบ (ไม่ใช่แค่ static mockup)

- เพิ่มรายวิชาใหม่ (ชื่อ + กลุ่มหลักสูตร) ในหน้า "รายวิชาของฉัน"
- เพิ่ม CLO ใหม่, ผูก/ถอด PLO ผ่าน chip, เพิ่ม/แก้ไข/ลบหัวข้อ course syllabus ในหน้า "จัดการรายวิชา"
- กรอกหัวข้อการสอน, เลือกวันที่/สัปดาห์, แนบ/ลบไฟล์หลักฐานในหน้า "บันทึกการสอน"
- แก้ไขค่า match %, ปฏิเสธ/เลิกปฏิเสธ, ยืนยันผลจับคู่ CLO/PLO และผลวิเคราะห์ gap แยกกัน — เห็นการเปลี่ยนสถานะ **Draft (เส้นประ) → Confirmed (เส้นทึบ)** ทันทีตาม UX Rule 1 ใน `DESIGN.md`
- แตะ/คลิกช่องในแผนที่ CLO × สัปดาห์เพื่อบันทึกจำนวนชิ้นงานสะสม
- toggle รวม/ไม่รวม Area of Improvement และจำลองการสร้างเอกสาร Word (สถานะ idle → generating → done)
- (ผู้บริหารหลักสูตร) เปลี่ยนตัวเลือกสาธิต `program_admin_curriculum_scope` แล้วเห็นแท็บกลุ่มหลักสูตรที่ไม่มีสิทธิ์ถูก **ซ่อนทั้งแท็บ** ตามกฎ PDPA ในสเปค; กรอง Evidence Access Log ตามกลุ่มหลักสูตร/รายวิชา/ช่วงวันที่ (ไม่แสดงชื่อไฟล์ในตาราง log ตามข้อกำหนด)
- **(ใหม่ — มือถือ) สมัครสมาชิก (M10)**: กรอกฟอร์มสมัครสมาชิกของอาจารย์ผู้สอนได้จริง (ชื่อ-นามสกุล, อีเมลสถาบัน, รหัสผ่าน+ยืนยัน) พร้อม validation แบบเรียลไทม์ (รูปแบบอีเมล, รหัสผ่านตรงกัน, ปุ่มสมัครสมาชิก disable จนกรอกครบ) กดสมัครแล้วเปลี่ยนเป็นหน้าจอยืนยันว่าสถานะ "รออนุมัติ" ทันที (AB-24)
- **(ใหม่ — มือถือ) สถานะบัญชี/รออนุมัติ (M11)**: มี tweak ให้สลับดูได้ทั้ง 3 สถานะ (รออนุมัติ/อนุมัติแล้ว/ถูกปฏิเสธ) — สถานะรออนุมัติ/ถูกปฏิเสธจะแสดงรายการฟีเจอร์ที่ถูก "ล็อก" ไว้ทั้งหมด สื่อถึงกฎทางธุรกิจ #6 ที่บัญชียังไม่อนุมัติต้องเข้าถึงอะไรไม่ได้เลย (AB-25, AB-27)
- **(ใหม่ — มือถือ, ผู้บริหารหลักสูตร) อนุมัติบัญชีผู้ใช้ (M-ผู้บริหาร 6)**: เห็นรายการคำขอสมัครที่รออนุมัติ กดอนุมัติ/ปฏิเสธได้จริง — รายการที่ตัดสินใจแล้วย้ายไปช่อง "ดำเนินการแล้ว" พร้อมชื่อผู้อนุมัติและเวลา (audit trail ตาม AB-26) เมนู bottom tab bar ของผู้บริหารหลักสูตรทุกหน้าจอมือถือมีแท็บ "บัญชี" เพิ่มเข้ามาให้เข้าถึงหน้านี้ได้จากทุกที่

## Source files

ไฟล์ต้นฉบับ (`.dc.html` ต่อหน้าจอ + `canvas.json` จัดวาง layout) เก็บไว้ในโฟลเดอร์นี้ (`docs/02-design/01-prototypes/interactive-prototype/`) เพื่อให้แก้ไข/republish ต้นแบบต่อได้ในอนาคต:

- Desktop: `Main.dc.html`, `MyCourses.dc.html`, `CourseManage.dc.html`, `TeachingRecordEntry.dc.html`, `AIReviewPanel.dc.html`, `CloWeekMap.dc.html`, `CourseSummary.dc.html`, `WordExportPanel.dc.html`, `AdminDashboard.dc.html`, `AdminCourseStatus.dc.html`, `AdminPloSetup.dc.html`, `AdminSarExport.dc.html`, `AdminAccessLog.dc.html`
- Mobile: ไฟล์เดียวกันแต่มีคำนำหน้า `M-` (เช่น `M-Dashboard.dc.html`) **บวก `M-SignUp.dc.html`, `M-PendingApproval.dc.html`, `M-AdminApproveAccounts.dc.html`** (ใหม่ตาม E6 — ยังไม่มีคู่ Desktop)
- `canvas.json` — ตำแหน่ง/หน้า (pages) ของทั้ง 29 artboard

> **[ยืนยันแล้ว]**: ฟิลด์ในฟอร์มสมัครสมาชิก (`M-SignUp.dc.html`) — ชื่อ-นามสกุล, อีเมลสถาบัน, รหัสผ่าน — **ไม่มีฟิลด์สังกัด/ภาควิชา** เพราะระบบ ALIGN ทั้งระบบให้บริการเฉพาะสาขา New Media Communication สาขาเดียว

> หมายเหตุ: ไฟล์ที่ seed แล้วสำหรับเผยแพร่ (ซึ่งมีขนาดไฟล์ใหญ่เพราะรวม editor payload ไว้ด้วย) **ไม่ได้เก็บไว้ใน git** — ถือเป็น build output ไม่ใช่ source ถ้าต้องการอัปเดตต้นแบบ ให้แก้ไขไฟล์ `.dc.html`/`canvas.json` ในโฟลเดอร์นี้แล้ว seed ใหม่

## ข้อจำกัดของต้นแบบ

- แต่ละ artboard เป็นสถานะสาธิตอิสระ **ไม่มีการเชื่อมนำทางข้าม artboard จริง** (เช่น กดปุ่ม "บันทึกการสอน" ที่แดชบอร์ดจะไม่พาไปหน้าอื่นจริง — เป็นข้อความ hint แทน) เพราะ artboard แต่ละไฟล์รันแยกกันเป็น iframe คนละตัว
- ข้อมูลตัวอย่าง (ชื่อวิชา, CLO/PLO, ตัวเลข %) เป็นข้อมูลสาธิต ไม่ใช่ข้อมูลจริง

---
ต่อยอด/เชื่อมโยง:
- รายละเอียดหน้าจอแบบข้อความ+ตาราง (source of truth): [[align-app-screens|align-app-screens]], [[align-program-admin-screens|align-program-admin-screens]]
- แผนภาพการไปมาระหว่างหน้าจอ: [[align-navigation-flow|align-navigation-flow]]
- ส่งต่อรายละเอียดเชิงระบบ: [[../02-technical/align-technical-design|align-technical-design]]

# Prototype: Interactive Clickable Canvas — ALIGN (ทั้ง 2 บทบาท, Desktop + Mobile)

เอกสารนี้เป็น **ต้นแบบเชิงภาพที่คลิก/กรอกข้อมูลได้จริง** เสริมจากเอกสารข้อความ+ตารางใน [[align-app-screens|align-app-screens]] (อาจารย์ผู้สอน), [[align-program-admin-screens|align-program-admin-screens]] (ผู้บริหารหลักสูตร), [[align-navigation-flow|align-navigation-flow]] และ [[align-user-journey|align-user-journey]] — เอกสารข้อความยังคง **เป็น source of truth หลัก** ของ layout/component/state ตามที่ระบุใน `CLAUDE.md`; ไฟล์ในโฟลเดอร์นี้คือการนำสเปคเดียวกันไปสร้างเป็นต้นแบบที่คลิกได้จริงเพื่อสื่อสาร/ทดสอบ flow ก่อนพัฒนาจริง

อ้างอิงคู่กับ [[../../../DESIGN.md|DESIGN.md]] — สี/ตัวอักษร/สเปซ/component/UX Rules ทั้งหมดที่ใช้ในต้นแบบนี้ตรงกับโทเค็นในไฟล์นั้น (ตรวจสอบแล้ว: hex สีทุกจุด, ฟอนต์ IBM Plex Sans Thai Looped + IBM Plex Mono, ไม่มี font-weight เกิน 600, stroke ไอคอน 1.5px)

## เปิดดูต้นแบบ

**ลิงก์ต้นแบบที่คลิกได้ (Claude Artifact)**: https://claude.ai/code/artifact/536c8cbe-f611-4a88-9c1d-e9a45427b4f7

ต้นแบบมี 2 หน้า (pages) บน canvas เดียว:
- **Desktop** — 13 artboard: 9 หน้าจอบทบาทอาจารย์ผู้สอน (บางหน้าจอรวม 2 แท็บในไฟล์เดียว) + 5 หน้าจอบทบาทผู้บริหารหลักสูตร
- **Mobile** — เวอร์ชันหน้าจอมือถือ (375px, bottom tab bar แทน side navigation) ของทั้ง 13 หน้าจอเดียวกัน

## Interaction ที่ทำได้จริงในต้นแบบ (ไม่ใช่แค่ static mockup)

- เพิ่มรายวิชาใหม่ (ชื่อ + กลุ่มหลักสูตร) ในหน้า "รายวิชาของฉัน"
- เพิ่ม CLO ใหม่, ผูก/ถอด PLO ผ่าน chip, เพิ่ม/แก้ไข/ลบหัวข้อ course syllabus ในหน้า "จัดการรายวิชา"
- กรอกหัวข้อการสอน, เลือกวันที่/สัปดาห์, แนบ/ลบไฟล์หลักฐานในหน้า "บันทึกการสอน"
- แก้ไขค่า match %, ปฏิเสธ/เลิกปฏิเสธ, ยืนยันผลจับคู่ CLO/PLO และผลวิเคราะห์ gap แยกกัน — เห็นการเปลี่ยนสถานะ **Draft (เส้นประ) → Confirmed (เส้นทึบ)** ทันทีตาม UX Rule 1 ใน `DESIGN.md`
- แตะ/คลิกช่องในแผนที่ CLO × สัปดาห์เพื่อบันทึกจำนวนชิ้นงานสะสม
- toggle รวม/ไม่รวม Area of Improvement และจำลองการสร้างเอกสาร Word (สถานะ idle → generating → done)
- (ผู้บริหารหลักสูตร) เปลี่ยนตัวเลือกสาธิต `program_admin_curriculum_scope` แล้วเห็นแท็บกลุ่มหลักสูตรที่ไม่มีสิทธิ์ถูก **ซ่อนทั้งแท็บ** ตามกฎ PDPA ในสเปค; กรอง Evidence Access Log ตามกลุ่มหลักสูตร/รายวิชา/ช่วงวันที่ (ไม่แสดงชื่อไฟล์ในตาราง log ตามข้อกำหนด)

## Source files

ไฟล์ต้นฉบับ (`.dc.html` ต่อหน้าจอ + `canvas.json` จัดวาง layout) เก็บไว้ในโฟลเดอร์นี้ (`docs/02-design/01-prototypes/interactive-prototype/`) เพื่อให้แก้ไข/republish ต้นแบบต่อได้ในอนาคต:

- Desktop: `Main.dc.html`, `MyCourses.dc.html`, `CourseManage.dc.html`, `TeachingRecordEntry.dc.html`, `AIReviewPanel.dc.html`, `CloWeekMap.dc.html`, `CourseSummary.dc.html`, `WordExportPanel.dc.html`, `AdminDashboard.dc.html`, `AdminCourseStatus.dc.html`, `AdminPloSetup.dc.html`, `AdminSarExport.dc.html`, `AdminAccessLog.dc.html`
- Mobile: ไฟล์เดียวกันแต่มีคำนำหน้า `M-` (เช่น `M-Dashboard.dc.html`)
- `canvas.json` — ตำแหน่ง/หน้า (pages) ของทั้ง 26 artboard

> หมายเหตุ: ไฟล์ที่ seed แล้วสำหรับเผยแพร่ (ซึ่งมีขนาดไฟล์ใหญ่เพราะรวม editor payload ไว้ด้วย) **ไม่ได้เก็บไว้ใน git** — ถือเป็น build output ไม่ใช่ source ถ้าต้องการอัปเดตต้นแบบ ให้แก้ไขไฟล์ `.dc.html`/`canvas.json` ในโฟลเดอร์นี้แล้ว seed ใหม่

## ข้อจำกัดของต้นแบบ

- แต่ละ artboard เป็นสถานะสาธิตอิสระ **ไม่มีการเชื่อมนำทางข้าม artboard จริง** (เช่น กดปุ่ม "บันทึกการสอน" ที่แดชบอร์ดจะไม่พาไปหน้าอื่นจริง — เป็นข้อความ hint แทน) เพราะ artboard แต่ละไฟล์รันแยกกันเป็น iframe คนละตัว
- ข้อมูลตัวอย่าง (ชื่อวิชา, CLO/PLO, ตัวเลข %) เป็นข้อมูลสาธิต ไม่ใช่ข้อมูลจริง

---
ต่อยอด/เชื่อมโยง:
- รายละเอียดหน้าจอแบบข้อความ+ตาราง (source of truth): [[align-app-screens|align-app-screens]], [[align-program-admin-screens|align-program-admin-screens]]
- แผนภาพการไปมาระหว่างหน้าจอ: [[align-navigation-flow|align-navigation-flow]]
- ส่งต่อรายละเอียดเชิงระบบ: [[../02-technical/align-technical-design|align-technical-design]]

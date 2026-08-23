
# Tech Stack (Concrete): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)

เอกสารนี้เป็น**ชั้นที่เจาะจง (concrete)** — คนละชั้นกับเอกสาร conceptual 3 ฉบับ ([[align-high-level-architecture|align-high-level-architecture]], [[align-api-schema-design|align-api-schema-design]], [[align-technical-design|align-technical-design]]) ที่ตั้งใจไม่ผูกกับ stack ใดๆ — งานของเอกสารนี้คือ**เลือก stack จริง**พร้อมเหตุผลรองรับ โดยอ้างอิงผลสัมภาษณ์ทีมพัฒนา/ผู้เกี่ยวข้องจริง (บันทึกไว้ในหัวข้อ 1) ไม่ใช่ข้อเสนอลอยๆ

ต่อยอดจาก: [[align-high-level-architecture|align-high-level-architecture]] (logical component ที่ต้อง map กับเทคโนโลยีจริง) · [[align-api-schema-design|align-api-schema-design]] (ER diagram/schema ที่ต้องเลือก database engine รองรับ) · [[align-technical-design|align-technical-design]] §5 (ข้อเสนอ stack แบบคร่าวๆ เดิม ที่ยังไม่ผ่านการสัมภาษณ์จริง — ดูหัวข้อ 5 ด้านล่างว่าเอกสารนี้ต่างจาก §5 เดิมตรงไหนและทำไม) · [[../../01-requirements/01-spec/requirement-align|requirement-align]]

> **สถานะ**: นี่คือรอบสัมภาษณ์ครั้งแรก คำตอบครบทั้ง 7 มิติ (9 คำถามย่อย) — บางมิติผู้ใช้ตอบว่า "ยังไม่ทราบ/ตัดสินใจทีหลัง" (งบประมาณ, data residency, สถานะ SSO, ที่เก็บไฟล์หลักฐาน, deployment สุดท้าย) จึงแนะนำทางเลือกที่ **portable/reversible** สำหรับมิติเหล่านั้นแทนการฟันธง พร้อมระบุจุดที่ต้องกลับมายืนยันซ้ำไว้ชัดเจนในหัวข้อ 4

---

## 1. สรุปผลสัมภาษณ์ (Requirements Gathered)

| # | มิติ | คำตอบที่ได้ |
|---|---|---|
| 1.1 | ขนาดทีมพัฒนา | เล็กมาก (1–2 คน) |
| 1.2 | ภาษา/เฟรมเวิร์กที่ทีมถนัด | **ไม่มี** — ต้องการ stack ที่เรียนรู้ง่ายที่สุด |
| 1.3 | ผู้ดูแลระบบหลัง deploy | อาจารย์ดูแลเอง (**ไม่ใช่โปรแกรมเมอร์มืออาชีพ**) |
| 2.1 | งบประมาณ/เซิร์ฟเวอร์ | **ยังไม่ทราบ** — ต้องขอมหาวิทยาลัยสนับสนุนภายหลัง |
| 2.2 | Data residency (PDPA) | **ยังไม่ทราบ** |
| 3 | Timeline | ต้องใช้งานจริง**ภายในปลายเดือนตุลาคม 2569** (จาก 23 ส.ค. 2569 เหลือ ~2 เดือน — เร่งด่วนมาก) |
| 4 | แนวทาง AI/LLM | **Hybrid** — open-source embedding รันเองเป็นหลัก + external API เสริมเฉพาะกรณี |
| 5 | Authentication/SSO | **ยังไม่ทราบ**ว่ามหาวิทยาลัยมี SSO กลางหรือไม่ |
| 6 | ที่เก็บไฟล์หลักฐาน | **ยังไม่ตัดสินใจ** |
| 7 | Deployment | **ตัดสินใจทีหลัง** |

**ตัวแปรหลักที่กำหนดทิศทางคำแนะนำทั้งหมด**: ทีมเล็กมาก + ไม่ถนัดภาษาใดเป็นพิเศษ + ไม่มีโปรแกรมเมอร์มืออาชีพดูแลต่อ + เดดไลน์ ~2 เดือน → ต้องเลือก stack ที่ (ก) มี boilerplate/managed service พร้อมใช้มากที่สุดเพื่อลดโค้ดที่ต้องเขียนเอง (ข) มี tutorial/community มากที่สุดเพื่อลด ramp-up (ค) ดูแลรักษาง่ายโดยไม่ต้องมีความรู้ sysadmin ลึก และ (ง) **portable/ย้ายได้** เพราะงบ/data residency/SSO/deployment ยังไม่ยืนยัน — ห้ามผูกกับ provider ใดจนย้ายกลับไม่ได้ถ้าคำตอบจริงออกมาเข้มงวดกว่านี้ภายหลัง

---

## 2. คำแนะนำ Tech Stack ต่อชั้น

### 2.0 สรุปภาพรวม

| ชั้น | เทคโนโลยีที่แนะนำ |
|---|---|
| Frontend | Next.js (React) + Tailwind CSS |
| Backend/API layer | Next.js API Routes / Server Actions (ฝังในโปรเจกต์เดียวกับ frontend) |
| Database | PostgreSQL ผ่าน Supabase |
| Auth | Supabase Auth (email/password) |
| Evidence storage | Supabase Storage (S3-compatible) |
| AI/LLM (จับคู่ CLO/PLO + gap analysis) | Transformers.js (`@xenova/transformers`) รัน embedding model open-source ในเครื่อง เป็นหลัก + external LLM API เป็น optional feature-flag เสริม |
| Word export | ไลบรารี `docx`/`docxtemplater` (npm) เรียกจาก API route เดียวกัน |
| Hosting | Vercel (frontend+API) + Supabase Cloud (DB/Auth/Storage), region Singapore (ap-southeast-1) ชั่วคราว — มีทางย้ายไป self-host ได้ทั้งคู่ |

หลักการเลือกภาพรวม: **1 โปรเจกต์ Next.js + 1 บริการ Supabase** คือ deployable unit ทั้งหมดของระบบ — ลดจำนวนส่วนที่ต้อง deploy/ดูแลแยกกันให้เหลือน้อยที่สุดเท่าที่จะทำได้ ตรงกับทีม 1–2 คนที่ไม่มีโปรแกรมเมอร์มืออาชีพดูแลต่อ และยังทันเดดไลน์ปลาย ต.ค. 2569 เพราะทั้งสองมี starter template ที่ทำงานร่วมกันสำเร็จรูปอยู่แล้ว (ไม่ต้องเขียน auth/CRUD/DB layer จากศูนย์)

---

### 2.1 Frontend — Next.js (React) + Tailwind CSS

**เหตุผล**: ทีมตอบข้อ 1.2 ว่า "ไม่ถนัดภาษาใดเป็นพิเศษ ต้องการ stack ที่เรียนรู้ง่ายที่สุด" — React/Next.js เป็นระบบนิเวศที่มี tutorial/เอกสารภาษาไทยและอังกฤษมากที่สุดในบรรดา frontend framework ปัจจุบัน และมี **starter template อย่างเป็นทางการที่ผูกกับ Supabase โดยตรง** (`create-next-app --example with-supabase`) ซึ่งตัดงาน setup auth/DB client ไปได้เกือบทั้งหมด — สำคัญมากเมื่อเดดไลน์เหลือ ~2 เดือน (ข้อ 3) และไม่มีใครในทีมมีพื้นฐานเดิม (ข้อ 1.1/1.2) การเลือก ecosystem ที่มี "ทางลัดสำเร็จรูป" ตรงกับ stack ที่เลือกทั้งชุดจึงลดความเสี่ยงด้าน timeline ได้มากกว่าการเลือกภาษาที่ไม่มีใครถนัดแล้วยังต้องต่อกับ backend เองทั้งหมด
- ส่วนติดต่อผู้ใช้ต้องรองรับการโต้ตอบเชิงลึก (แก้ไขผล AI ก่อนยืนยัน, ตารางแผนที่ CLO×สัปดาห์ — ตาม [[align-high-level-architecture|align-high-level-architecture]] §2) ซึ่งเหมาะกับ SPA/React มากกว่า server-rendered แบบเดิม (ตรงกับที่ `align-technical-design.md` §5 เดิมก็เสนอ SPA อยู่แล้ว)
- Tailwind CSS ถูกเลือกเพราะเรียนรู้เร็ว (utility class ไม่ต้องเขียน CSS แยกไฟล์เยอะ) และนำ design token จาก `DESIGN.md` มา configure เป็นตัวแปรได้ตรงไปตรงมา (การนำ token จริงไปใช้เป็นงานของ prototype-designer/DESIGN.md ไม่ใช่ขอบเขตเอกสารนี้ แต่ framework นี้ไม่ปิดกั้นการทำตาม token)

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **React SPA (Vite) + backend แยกต่างหาก** — ปฏิเสธ เพราะต้องดูแล 2 โปรเจกต์/2 deployment แยกกัน เพิ่มภาระ DevOps ที่ทีม 1–2 คนและอาจารย์ผู้ดูแลต่อ (ไม่ใช่โปรแกรมเมอร์มืออาชีพ) รับไม่ไหวในระยะยาว ขณะที่ Next.js รวม frontend+API ไว้ใน deploy เดียว
- **Vue.js/Nuxt** — ความยากง่ายใกล้เคียงกัน แต่จำนวน starter template ที่ผูกกับ Supabase สำเร็จรูปน้อยกว่า Next.js อย่างชัดเจน เมื่อทีมไม่มีความถนัดเดิมเป็นตัวตัดสิน (ข้อ 1.2) การเลือก ecosystem ที่มีทางลัดตรงกับ stack ทั้งชุดมากที่สุดจึงคุ้มกว่าเมื่อเดดไลน์บีบ (ข้อ 3)
- **Server-rendered framework แบบดั้งเดิม (Laravel Blade/Django templates)** — ปฏิเสธ เพราะไม่เหมาะกับหน้าจอเชิงโต้ตอบสูงตามที่ [[align-high-level-architecture|align-high-level-architecture]] ระบุไว้ (AI Review Panel ที่ต้องแก้ไข/ยืนยันทีละรายการแบบไม่ reload หน้า)

---

### 2.2 Backend / API layer — Next.js API Routes / Server Actions (ในโปรเจกต์เดียวกับ frontend)

**เหตุผล**: ทีมเล็ก (ข้อ 1.1) + เดดไลน์ ~2 เดือน (ข้อ 3) — การรวม backend logic ไว้ในโปรเจกต์ Next.js เดียวกัน (แทนการตั้งเซิร์ฟเวอร์ backend แยก) ลดจำนวนสิ่งที่ต้อง deploy/monitor เหลือ "1 แอปพลิเคชัน" ซึ่งตรงกับผู้ดูแลระยะยาวเป็นอาจารย์ที่ไม่ใช่โปรแกรมเมอร์มืออาชีพ (ข้อ 1.3) — Server Action/API Route ทำหน้าที่เป็น **"ประตูควบคุมสิทธิ์" + "แกนประสานงาน"** ตามที่ [[align-high-level-architecture|align-high-level-architecture]] กำหนดไว้ (ตรวจ `account_status=approved`, ตรวจ role, บังคับกฎ #1 "ผูก CLO–PLO ก่อนบันทึกการสอน" **ที่ฝั่งเซิร์ฟเวอร์เสมอ** ไม่พึ่ง UI disable ปุ่มเพียงอย่างเดียว) โดยเรียก Supabase ผ่าน service-role key เฉพาะเมื่อผ่านการตรวจกฎแล้วเท่านั้น
- ใช้ PostgreSQL Row Level Security (RLS) ของ Supabase เป็น **defense-in-depth ชั้นที่สอง** (กันกรณีมี bug ในโค้ด server) แต่ไม่ใช่กลไกบังคับใช้กฎหลักเพียงอย่างเดียว เพราะกฎทางธุรกิจที่ซับซ้อน (draft→confirmed workflow กฎ #3, curriculum-scope isolation cross-cutting) เขียนเป็น RLS policy ล้วนๆ ยากต่อการดูแลของทีมที่ไม่ชำนาญ SQL policy ขั้นสูง — การเขียนเป็นโค้ด JavaScript ในชั้น server action นั้นอ่าน/แก้ง่ายกว่าสำหรับทีมระดับนี้

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **Backend แยก (Express/Django/Laravel/Spring)** — ปฏิเสธ เพราะเพิ่มโปรเจกต์/deployment ที่ต้องดูแลแยก ขัดกับข้อจำกัดผู้ดูแลระยะยาวที่ไม่ใช่โปรแกรมเมอร์มืออาชีพ (ข้อ 1.3) และใช้เวลา setup มากกว่าภายในกรอบ ~2 เดือน (ข้อ 3)
- **Firebase (Google BaaS) แทน Supabase** — ปฏิเสธ 2 เหตุผล: (ก) Firestore เป็น NoSQL document store ไม่เหมาะกับโมเดลข้อมูลเชิงสัมพันธ์ที่เข้มงวดใน [[align-api-schema-design|align-api-schema-design]] (FK, unique constraint ภายใน curriculum เดียวกัน, ห้าม query ข้าม curriculum) ซึ่งต้องพึ่ง relational DB จริง (ข) Firebase เป็น proprietary ล้วน ไม่มีทาง self-host — ขัดกับความต้องการ "portable" ที่จำเป็นเพราะคำตอบเรื่องงบ/data residency (ข้อ 2.1/2.2) ยังไม่ทราบ ขณะที่ Supabase เป็น open-source และ self-host ได้ (ดูหัวข้อ 4)
- **ให้ RLS ของ Supabase เป็นกลไกบังคับใช้กฎธุรกิจทั้งหมดโดยไม่มีชั้น server code** — ปฏิเสธตามเหตุผลข้างต้น (ความซับซ้อนของกฎ #1/#3 เกินกว่าที่ทีมขนาดนี้จะดูแล pure-SQL policy ได้อย่างปลอดภัยในระยะยาว)

---

### 2.3 Database — PostgreSQL ผ่าน Supabase

**เหตุผล**: โมเดลข้อมูลใน [[align-api-schema-design|align-api-schema-design]] เป็นเชิงสัมพันธ์ชัดเจน (curriculum → PLO/CLO → mapping → course → teaching_record) มี constraint ที่ต้องบังคับผ่าน FK/unique/check (เช่น ห้าม `clo_plo_mapping` ข้าม curriculum) — PostgreSQL รองรับ constraint เหล่านี้ได้ตรงจุดที่สุด และ Supabase ใช้ PostgreSQL เป็นแกนหลัก ทำให้ได้ relational DB ที่ต้องการโดยไม่ต้อง provision เซิร์ฟเวอร์ DB เอง (ตรงกับข้อ 2.1 ที่งบยังไม่ทราบ — เริ่มที่ free tier ก่อนได้ เนื่องจากสเกลผู้ใช้จริงเป็นสาขาเดียว หลักสิบคน ตาม `plo-course-master-data.md`) และเดดไลน์ ~2 เดือน (ข้อ 3) ไม่มีเวลาตั้งเซิร์ฟเวอร์ DB เอง

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **MySQL** — เป็น relational DB ที่ใช้ได้เช่นกัน แต่ปฏิเสธเพราะ Supabase (ที่เลือกเป็น BaaS หลัก) เป็น PostgreSQL-native และ Postgres มี JSON column ที่ยืดหยุ่นกว่าสำหรับ `syllabus.content` (list เชิงโครงสร้างตาม §3.6 ของ align-api-schema-design.md)
- **MongoDB/NoSQL** — ปฏิเสธ เพราะ schema เชิงแนวคิดผูก referential integrity/curriculum-scope ไว้แน่นมาก การใช้ document DB จะต้อง reimplement ความถูกต้องของข้อมูลเหล่านี้เองในโค้ด แอปพลิเคชัน เพิ่มความเสี่ยงให้ทีมเล็กที่ไม่มีความชำนาญ (ข้อ 1.1/1.2) ภายใต้เดดไลน์บีบ (ข้อ 3)

---

### 2.4 แนวทางเชื่อมต่อ AI/LLM — Hybrid: Transformers.js (in-process) + external API แบบ feature-flag

ผู้ใช้ตอบชัดเจนว่าต้องการ **hybrid** (ข้อ 4) — เอกสารนี้แปลงคำตอบนี้เป็นแนวทางที่ทำได้จริงภายในข้อจำกัดอื่น (ทีมเล็ก, ไม่มี infra AI, เดดไลน์ 2 เดือน, งบ/data residency ยังไม่ทราบ):

**ส่วนหลัก (default, เปิดใช้เสมอ)**: ใช้ `@xenova/transformers` (Transformers.js) รันโมเดล embedding แบบ multilingual open-source (เช่น `Xenova/multilingual-e5-small` หรือรุ่นที่รองรับภาษาไทย) **โดยตรงในโค้ด Next.js/Node** (ไม่ต้องมีเซิร์ฟเวอร์ Python/GPU แยก) เพื่อคำนวณ similarity สำหรับ:
- งานจับคู่การสอนกับ CLO (E3 ส่วน a) — เทียบ embedding ของหัวข้อการสอนกับ embedding ของ CLO แต่ละข้อในกลุ่มหลักสูตรเดียวกัน
- งานวิเคราะห์ gap เทียบ syllabus แบบพื้นฐาน (E3 ส่วน b) — เทียบ embedding หัวข้อที่วางแผนกับหัวข้อที่สอนจริงสะสม

**เหตุผลที่เลือกวิธีนี้เป็นแกนหลัก**: (1) ข้อมูล (หัวข้อการสอน/CLO ซึ่งไม่ใช่ไฟล์หลักฐานดิบที่มี PII) **ไม่ออกนอกระบบเลย** — ปลอดภัยที่สุดเผื่อคำตอบ data residency (ข้อ 2.2) ออกมาเข้มงวด (2) ไม่มีค่าใช้จ่ายต่อการเรียก — ปลอดภัยเผื่องบ (ข้อ 2.1) ไม่มาจริง (3) รันเป็นไลบรารี npm ธรรมดา ไม่ต้องตั้ง GPU/Python service แยก — ทีมเล็ก/ไม่มีโปรแกรมเมอร์มืออาชีพดูแลต่อ (ข้อ 1.1/1.3) ทำได้จริงในกรอบเวลา 2 เดือน (ข้อ 3) ต่างจากการ self-host LLM ขนาดใหญ่ที่ต้องมี infra เฉพาะ

**ส่วนเสริม (optional, ปิดโดย default เป็น feature flag)**: เรียก external LLM API (เช่น OpenAI/Anthropic/Gemini) เฉพาะสำหรับเสริมคุณภาพคำอธิบาย gap analysis (เช่น สรุปเป็นข้อความ "ขาดอะไร/เพิ่มอะไร" ที่อ่านง่ายกว่า similarity score ดิบ) — **เปิดใช้ได้ก็ต่อเมื่อยืนยันงบประมาณ (ข้อ 2.1) และนโยบายข้อมูลออกนอกระบบ (ข้อ 2.2) แล้วเท่านั้น** เพราะเป็นเส้นทางเดียวที่มีข้อมูลออกนอกระบบมหาวิทยาลัยจริง — ส่งเฉพาะข้อความหัวข้อ (ไม่ใช่ไฟล์หลักฐาน/ข้อมูลนักศึกษา) เพื่อลดความเสี่ยง PDPA ให้น้อยที่สุดเท่าที่จะทำได้แม้เปิดใช้จริง

ทุกผลลัพธ์จากทั้งสองเส้นทาง (local หรือ external) ต้องเขียนเป็น state `draft` เสมอ ตามกฎ #3 — สอดคล้องกับ contract ที่ [[align-api-schema-design|align-api-schema-design]] §3.9/3.11 กำหนดไว้แล้ว ไม่เปลี่ยนแปลง

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **External API เป็นเส้นทางเดียว (ไม่มี local embedding เลย)** — ปฏิเสธ เพราะขัดกับคำตอบ hybrid ที่ผู้ใช้ระบุชัดเจน (ข้อ 4) และมีค่าใช้จ่ายต่อเนื่อง+ความเสี่ยงข้อมูลออกนอกระบบที่ยังไม่มีคำตอบมารองรับ (ข้อ 2.1/2.2)
- **Self-host LLM ขนาดใหญ่บน GPU server เอง (on-prem)** — ปฏิเสธ เพราะต้องมี infra/งบเฉพาะที่ยังไม่ยืนยัน (ข้อ 2.1) และทีม 1–2 คนที่ไม่ถนัดภาษาใดเป็นพิเศษ (ข้อ 1.1/1.2) ไม่มีความเชี่ยวชาญ ML-ops ที่จะดูแลได้ทันเดดไลน์ 2 เดือน (ข้อ 3)

---

### 2.5 ที่เก็บไฟล์หลักฐาน (Evidence Storage) — Supabase Storage (S3-compatible) เป็นค่าเริ่มต้น พร้อมทางย้ายไป self-host

ผู้ใช้ตอบว่า **"ยังไม่ตัดสินใจ"** (ข้อ 6) — เอกสารนี้แนะนำค่าเริ่มต้นที่ **ย้ายได้ง่ายที่สุด**แทนการฟันธง:

**แนะนำเริ่มต้น**: Supabase Storage — เป็น object storage ที่พูดโปรโตคอล S3-compatible ผูกกับระบบ Auth/RLS เดียวกับฐานข้อมูล ทำให้ implement การควบคุมสิทธิ์ตามกฎ #5 (เฉพาะอาจารย์ผู้สอนวิชานั้น/ผู้บริหารหลักสูตรที่มี curriculum scope ตรงกัน) ได้ในโค้ดชุดเดียวกับ Access Gate — ไม่ต้องตั้งระบบสิทธิ์แยกต่างหาก และมี free tier เพียงพอสำหรับสเกลจริง (สาขาเดียว หลักสิบคน)

**เหตุผลที่ต้องเลือกแบบ portable**: เพราะคำตอบ data residency (ข้อ 2.2) ยังไม่ทราบ — ถ้าใช้บริการที่ผูกมัดเกินไปแล้วภายหลังพบว่าต้องเก็บในเซิร์ฟเวอร์มหาวิทยาลัยเท่านั้น จะต้องเขียนโค้ดส่วนควบคุมสิทธิ์ใหม่ทั้งหมด — Supabase Storage ใช้ S3 API มาตรฐาน ทำให้สลับไปเป็น **self-hosted MinIO** (S3-compatible เช่นกัน, open-source, ติดตั้งบนเซิร์ฟเวอร์มหาวิทยาลัยได้) ในภายหลังโดย**แก้เฉพาะ configuration/endpoint ไม่ต้องเขียนโค้ด access-control ใหม่**

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **เก็บไฟล์เป็น BLOB ใน PostgreSQL โดยตรง** — ปฏิเสธ เพราะ [[align-high-level-architecture|align-high-level-architecture]] ระบุไว้แล้วว่าที่เก็บหลักฐานควรแยกจากที่เก็บข้อมูลโครงสร้าง (ไฟล์มีขนาด/ชนิดหลากหลาย ต้องคุมสิทธิ์ละเอียดกว่า) และจะทำให้ backup ฐานข้อมูลหลักบวมโดยไม่จำเป็น
- **ตั้ง on-prem file server (NAS) ของมหาวิทยาลัยตั้งแต่วันแรก** — ปฏิเสธเป็นค่าเริ่มต้น เพราะคำตอบ data residency ยังไม่ยืนยัน (ข้อ 2.2) และงบ/เซิร์ฟเวอร์ที่มีจริงยังไม่ทราบ (ข้อ 2.1) การไปตั้ง infra จริงก่อนรู้คำตอบเสี่ยงเสียเวลาที่มีจำกัดมาก (ข้อ 3) ไปกับสิ่งที่อาจต้องทำใหม่ — แนะนำเก็บเป็นทางเลือกสำรองที่ทำได้ทันทีที่คำตอบชัดเจน (ดูหัวข้อ 4)

---

### 2.6 Hosting / Deployment — Vercel (frontend+API) + Supabase Cloud (ap-southeast-1) เป็นจุดเริ่มต้น พร้อมทางย้าย self-host

ผู้ใช้ตอบว่า **"ตัดสินใจทีหลัง"** (ข้อ 7) และงบ/data residency ยังไม่ทราบ (ข้อ 2.1/2.2) — แนะนำเริ่มที่ **managed hosting free-tier ที่ portable** เพื่อให้ทันเดดไลน์ปลาย ต.ค. 2569 (ข้อ 3) โดยไม่ปิดทางย้ายภายหลัง:

- **Frontend + API (Next.js)**: deploy บน Vercel (ผู้สร้าง Next.js เอง, zero-config, free tier เพียงพอสำหรับสเกลนี้) — ถ้าภายหลังต้อง on-prem, Next.js build เป็น standalone Node server ได้ (containerize ด้วย Docker) แล้วย้ายไปรันบนเซิร์ฟเวอร์มหาวิทยาลัยได้โดยไม่ต้องเขียนโค้ดใหม่
- **Database/Auth/Storage (Supabase)**: ใช้ Supabase Cloud โดยเลือก region **Singapore (ap-southeast-1)** เป็นตัวเลือกที่ใกล้ประเทศไทยที่สุดเท่าที่ managed cloud ทั่วไปมีให้ ระหว่างรอคำตอบ data residency ที่ชัดเจน — Supabase เป็น **open-source และ self-host ได้ผ่าน Docker Compose** ถ้าภายหลังพบว่าต้องเก็บข้อมูลในเซิร์ฟเวอร์มหาวิทยาลัยเท่านั้น (on-prem บังคับ) จึงย้ายได้โดยใช้ codebase/schema เดิมทั้งหมด เปลี่ยนแค่ปลายทาง infrastructure

**เหตุผลที่ไม่เลือก on-prem ทั้งหมดตั้งแต่วันแรก**: ผู้ดูแลระยะยาวคืออาจารย์ที่ไม่ใช่โปรแกรมเมอร์มืออาชีพ (ข้อ 1.3) — การดูแลเซิร์ฟเวอร์เอง (patch OS, ต่ออายุ SSL, สำรองข้อมูล, monitor uptime) ต้องมีความรู้ sysadmin ที่เกินกำลังของผู้ดูแลกลุ่มนี้ในระยะยาว ขณะที่ managed platform ลดภาระนี้เกือบทั้งหมด และยังมี escape hatch ไป on-prem ได้ถ้าจำเป็นจริง (ดูหัวข้อ 4)

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **On-premise server ของมหาวิทยาลัยทั้งหมดตั้งแต่วันแรก** — ปฏิเสธเป็นค่าเริ่มต้นตามเหตุผลข้างต้น แต่เก็บไว้เป็นทางเลือกสำรองที่ชัดเจนเมื่อคำตอบงบ/data residency ยืนยันว่าจำเป็น
- **Managed cloud รายใหญ่แบบเต็มรูปแบบ (AWS/GCP/Azure โดยตรง ไม่ผ่าน BaaS)** — ปฏิเสธเพราะต้องเขียน/ตั้งค่า infrastructure-as-code เอง (VPC, IAM, RDS, S3 policy ฯลฯ) ซึ่งใช้เวลาเกินกว่ากรอบ 2 เดือน (ข้อ 3) สำหรับทีม 1–2 คนที่ไม่มีพื้นฐาน DevOps มาก่อน (ข้อ 1.2) — Supabase ให้ผลลัพธ์เทียบเท่า (Postgres+Auth+Storage บน AWS infrastructure) โดยไม่ต้องตั้งค่าเองเลย

---

### 2.7 Authentication — Supabase Auth (email/password) รองรับ flow E6 ของสเปค พร้อมช่องเชื่อม SSO ในอนาคต

ผู้ใช้ตอบว่า **"ยังไม่ทราบ"** สถานะ SSO ของมหาวิทยาลัย (ข้อ 5) — แนะนำเริ่มด้วยระบบ auth แยกของ ALIGN เอง (ตรงกับที่ E6/[[../../01-requirements/01-spec/requirement-align|requirement-align]] ออกแบบไว้อยู่แล้ว: สมัครสมาชิก → รออนุมัติ → ผู้บริหารหลักสูตรอนุมัติ/ปฏิเสธ) โดยใช้ **Supabase Auth** (email/password) เป็นกลไกยืนยันตัวตน:
- Supabase Auth เป็น implementation ที่ผ่านการทดสอบด้านความปลอดภัยมาแล้ว (password hashing, session/JWT, reset flow) — ทีมเล็กที่ไม่มีความชำนาญด้าน security (ข้อ 1.1/1.2) ไม่ต้องเขียนกลไกเหล่านี้เอง ซึ่งเสี่ยงเกิดช่องโหว่ถ้าเขียนเองในกรอบเวลา 2 เดือน (ข้อ 3)
- ออกแบบให้สถานะบัญชี (`pending`/`approved`/`rejected`), role (`instructor`/`program_admin`), และ `program_admin_curriculum_scope` เก็บอยู่ใน**ตาราง `user`/profile แยกต่างหาก** (ไม่ใช่แค่ auth metadata ของ Supabase) ตามที่ [[align-api-schema-design|align-api-schema-design]] §3 กำหนดไว้แล้ว — การแยกเช่นนี้ทำให้ Access Gate (ชั้น Next.js server) ตรวจ "ทุกคำร้องขอ" ตามกฎ #6 ได้จากตารางนี้โดยตรง ไม่ผูกกับกลไก auth provider ใดเป็นการเฉพาะ
- **ช่องเชื่อม SSO ในอนาคต**: ถ้ามหาวิทยาลัยยืนยันว่ามี SSO ที่รองรับ OAuth2/OIDC ภายหลัง สามารถเพิ่มเป็น auth provider เสริมใน Supabase Auth ได้โดยไม่ต้องแก้ schema ของตาราง `user` (เพราะ role/status/scope อยู่แยกจาก auth identity อยู่แล้ว) — ถ้า SSO ของมหาวิทยาลัยใช้ SAML หรือ protocol ที่ Supabase ไม่รองรับ native อาจต้องใช้ Supabase Pro tier หรือ custom middleware เพิ่ม (ดูหัวข้อ 4)

**ทางเลือกอื่นที่พิจารณาแล้วไม่เลือก**:
- **เขียนระบบ auth เอง (custom password hashing/session)** — ปฏิเสธ เพราะเป็นโค้ดที่กระทบความปลอดภัยโดยตรง เสี่ยงเกินไปสำหรับทีมเล็กที่ไม่มีความชำนาญเฉพาะทางภายใต้เดดไลน์บีบ (ข้อ 1.1/1.2/3)
- **สร้างระบบเชื่อม SSO/SAML เต็มรูปแบบตั้งแต่วันแรก** — ปฏิเสธ เพราะยังไม่ทราบว่ามหาวิทยาลัยมี SSO จริงหรือไม่ (ข้อ 5) การลงทุนเวลาสร้างระบบเชื่อมที่อาจไม่มีปลายทางให้เชื่อมจริงเป็นการเสียเวลาที่มีจำกัดมาก (ข้อ 3) โดยเปล่าประโยชน์

---

## 3. Mapping กับ Logical Component ([[align-high-level-architecture|align-high-level-architecture]] §2)

| Logical Component (conceptual) | เทคโนโลยีจริงที่แนะนำ |
|---|---|
| ส่วนติดต่อผู้ใช้ (User-Facing Interface) | Next.js (React) + Tailwind CSS |
| ประตูควบคุมสิทธิ์และสถานะบัญชี (Access Gate) | Next.js Server Action/API Route middleware ตรวจ session + role + `account_status` จากตาราง `user` (Supabase Postgres) ก่อนทุกคำร้อง + Postgres RLS เป็น defense-in-depth |
| แกนประสานงานและบังคับใช้กฎทางธุรกิจ (Core Orchestration) | Next.js Server Action/API Route (service-role Supabase client) |
| กลไกจับคู่/วิเคราะห์ด้วย AI | Transformers.js (in-process, default) + external LLM API (feature-flag, optional) |
| ที่เก็บข้อมูลโครงสร้าง (Structured Data Store) | PostgreSQL ผ่าน Supabase |
| ที่เก็บหลักฐาน/ชิ้นงานควบคุมสิทธิ์ตาม PDPA | Supabase Storage (S3-compatible) → escape hatch: self-hosted MinIO |
| กลไกแจ้งเตือนช่องว่างหลักฐาน (Gap Notification) | Query แบบ near-real-time ใน Server Action เดียวกัน (ไม่ใช่ batch/cron job — ตรงกับที่ [[align-high-level-architecture|align-high-level-architecture]] §4.1 ระบุไว้แล้ว) |
| กลไกสร้างเอกสารส่งออก (Document Export Generator) | ไลบรารี `docx`/`docxtemplater` (npm) เรียกจาก Server Action ที่อ่านเฉพาะข้อมูล `confirmed` |
| บันทึกการเข้าถึงหลักฐาน (Access Audit Log) | ตาราง `evidence_access_log` ใน PostgreSQL เดียวกัน เขียนโดยชั้น Core Orchestration ทุกครั้งที่มีการเข้าถึงไฟล์สำเร็จ |

---

## 4. ประเด็นที่ยังไม่ยืนยัน — ต้องกลับมาทบทวนเมื่อรู้คำตอบจริง

รายการต่อไปนี้คือจุดที่เอกสารนี้เลือกทางเลือก **default ที่ portable ไว้ก่อน** เพราะคำตอบสัมภาษณ์ยังไม่ชัดเจน — **ห้ามถือว่าเป็นการตัดสินใจสุดท้าย** ต้องกลับมายืนยันซ้ำทันทีที่รู้คำตอบจริง:

| ประเด็นที่ยังไม่ทราบ | Default ที่แนะนำไว้ก่อน | เงื่อนไขที่ต้องกลับมาทบทวน | ทางย้าย (migration path) |
|---|---|---|---|
| งบประมาณ/เซิร์ฟเวอร์จริง (ข้อ 2.1) | Vercel free tier + Supabase free tier | เมื่อมหาวิทยาลัยยืนยันงบ/เซิร์ฟเวอร์ที่ให้ใช้ได้ | ถ้ามีงบ → อัปเกรด Supabase เป็น Pro tier หรือย้ายไป cloud ที่มหาวิทยาลัยมีสัญญาอยู่แล้ว; ถ้าไม่มีงบต่อเนื่องเลย → วางแผน self-host Supabase (Docker Compose) บนเซิร์ฟเวอร์มหาวิทยาลัยก่อนหมด quota free tier |
| Data residency ตาม PDPA (ข้อ 2.2) | Supabase Cloud region Singapore (ap-southeast-1) | เมื่อฝ่าย PDPA/กฎหมายของมหาวิทยาลัยยืนยันว่าข้อมูลนักศึกษาต้องอยู่ในประเทศ/บนเซิร์ฟเวอร์มหาวิทยาลัยเท่านั้นหรือไม่ | ถ้าบังคับ Thailand-only/on-prem → self-host Supabase stack (Postgres+Auth+Storage ผ่าน Docker Compose) บนเซิร์ฟเวอร์มหาวิทยาลัย — schema/API/โค้ดเดิมใช้ได้ทั้งหมด เปลี่ยนเฉพาะ infrastructure endpoint |
| สถานะ SSO ของมหาวิทยาลัย (ข้อ 5) | Supabase Auth (email/password) เท่านั้น | เมื่อหน่วย IT มหาวิทยาลัยยืนยันว่ามี SSO และ protocol ที่รองรับ (OAuth2/OIDC หรือ SAML) | ถ้า OAuth2/OIDC → เพิ่มเป็น auth provider เสริมใน Supabase Auth ได้ทันทีโดยไม่แก้ schema; ถ้า SAML/protocol อื่น → ต้องประเมิน Supabase Pro/Enterprise หรือ custom middleware เพิ่มเติม |
| ที่เก็บไฟล์หลักฐานสุดท้าย (ข้อ 6) | Supabase Storage (S3-compatible) | เมื่อยืนยัน data residency (ตรงกับข้อ 2.2) | ถ้าบังคับ on-prem → ย้ายไป self-hosted MinIO (S3-compatible) โดยแก้เฉพาะ configuration ไม่ต้องเขียนโค้ด access-control ใหม่ |
| Deployment สุดท้าย (ข้อ 7) | Vercel + Supabase Cloud | เมื่อยืนยันงบ/data residency/นโยบายมหาวิทยาลัยครบ | ถ้าต้อง on-prem ทั้งหมด → containerize Next.js (Docker) + self-host Supabase บนเซิร์ฟเวอร์มหาวิทยาลัย; ถ้ามีงบ managed cloud เต็มรูปแบบ → ประเมิน AWS/GCP/Azure โดยตรงแทน BaaS ได้ในอนาคตถ้าสเกลระบบโตขึ้นมาก (ไม่จำเป็นสำหรับสเกลปัจจุบันตาม `plo-course-master-data.md`) |
| การเปิดใช้ external AI API เสริม (ข้อ 4 ส่วน hybrid) | ปิดไว้ (feature flag = off) | เมื่อยืนยันงบ (ข้อ 2.1) และนโยบายข้อมูลออกนอกระบบ (ข้อ 2.2) พร้อมกัน | เปิด feature flag ส่งเฉพาะข้อความหัวข้อ (ไม่ใช่ไฟล์หลักฐาน) ไปยัง external LLM API ที่เลือก |

---

## 5. ข้อเสนอต่อ [[align-technical-design|align-technical-design]] §5

`align-technical-design.md` §5 (เดิม) เป็น "ข้อเสนอคร่าวๆ ยังไม่ยืนยัน" ที่เขียนไว้ก่อนมีการสัมภาษณ์จริง — เทียบกับคำแนะนำในเอกสารนี้แล้วมีจุดที่ **ต่างออกไปอย่างมีนัยสำคัญ** เพราะตอนนี้มีข้อมูลสัมภาษณ์จริงรองรับ:
- §5 เดิมเสนอ backend เป็น "framework เชิง object-oriented หรือ Node.js/Python ที่ทีมคุ้นเคย" (ลอยๆ ไม่ระบุ) — เอกสารนี้ระบุจริงเป็น Next.js API Routes/Server Actions ในโปรเจกต์เดียวกับ frontend เพราะทีมไม่มีความถนัดเดิม + เดดไลน์ 2 เดือน
- §5 เดิมเสนอ "AI Matching Service … internal service หรือเรียก LLM API ภายนอก" แบบเปิดกว้าง — เอกสารนี้ระบุ hybrid ที่เจาะจง (Transformers.js in-process + external API แบบ feature-flag) ตามคำตอบสัมภาษณ์จริง
- §5 เดิมไม่ได้พูดถึงความ portable ของ hosting/storage เพราะตอนนั้นยังไม่มีคำถามเรื่องงบ/data residency ที่ยังไม่ทราบ — เอกสารนี้เพิ่มมิตินี้เข้ามาทั้งหมด (หัวข้อ 4)

**แนะนำให้ผู้ใช้เรียก `technical-designer` เพื่อปรับ §5 ของ `align-technical-design.md`** ให้เป็นเพียงบทสรุปสั้นๆ ที่ชี้ (ลิงก์) มาที่เอกสารนี้แทนการคงข้อเสนอคร่าวๆ เดิมไว้คู่ขนาน เพื่อไม่ให้เกิดความสับสนว่าจะยึด §5 เดิมหรือเอกสารนี้เป็นหลัก (ผู้ใช้เป็นผู้ตัดสินใจว่าจะให้ทำหรือไม่)

---

เชื่อมโยง: [[align-high-level-architecture|align-high-level-architecture]] · [[align-api-schema-design|align-api-schema-design]] · [[align-technical-design|align-technical-design]] · [[../../01-requirements/01-spec/requirement-align|requirement-align]] · [[../../01-requirements/01-spec/plo-course-master-data|plo-course-master-data]]

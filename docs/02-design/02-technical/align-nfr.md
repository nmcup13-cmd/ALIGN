# Non-Functional Requirements (NFR): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)

เอกสารนี้แปลง**กฎทางธุรกิจ**และ**ข้อจำกัดจริงของทีมพัฒนา/งบประมาณ** ที่กระจายอยู่ในเอกสารอื่นให้เป็น **เป้าหมายเชิงคุณภาพที่วัดผลได้ (measurable NFR)** — ไม่ใช่การกำหนด business rule ใหม่ (ดู business rule ตัวจริงที่ [[../../01-requirements/01-spec/requirement-align|requirement-align]]) และไม่ใช่การเลือกเทคโนโลยี (ดูที่ [[align-tech-stack|align-tech-stack]])

ต่อยอดจาก: [[align-high-level-architecture|align-high-level-architecture]] (trust boundary/หลักการที่สืบจากกฎทางธุรกิจ §4.1) · [[align-technical-design|align-technical-design]] (schema/API/PDPA note §6) · [[align-tech-stack|align-tech-stack]] (ข้อจำกัดทีม/งบ/timeline จากการสัมภาษณ์จริง §1 และประเด็นที่ยังไม่ยืนยัน §4) · [[../../03-testing/01-test-plan/test-plan-align|test-plan-align]] (ขอบเขตที่ตัด performance/AI-accuracy ออกจากรอบทดสอบนี้แล้ว §1)

> **สถานะ**: ยืนยันร่วมกับผู้ใช้แล้วบางส่วน (2026-08-23) — ดูหัวข้อ 3 สำหรับรายการที่ตัดสินใจแล้ว และหัวข้อ 4 สำหรับรายการที่ยังไม่ยืนยัน (portable default ไปก่อน ตามแนวทางเดียวกับ [[align-tech-stack|align-tech-stack]] §4)

---

## 1. หลักการกำหนดขอบเขต

ตัวแปรที่กำหนดทิศทาง NFR ทั้งฉบับ (สืบเนื่องจาก `align-tech-stack.md` §1):
ทีมพัฒนาเล็กมาก (1–2 คน) + ไม่มีโปรแกรมเมอร์มืออาชีพดูแลระบบหลัง deploy (อาจารย์ดูแลเอง) + เดดไลน์ใช้งานจริงภายในปลาย ต.ค. 2569 + งบประมาณ/data residency ยังไม่ยืนยัน + สเกลผู้ใช้จริงคือสาขาเดียว หลักสิบคน (ตาม [[../../01-requirements/01-spec/plo-course-master-data|plo-course-master-data]])

จากตัวแปรนี้ เอกสารจึงแบ่ง NFR เป็น 4 กลุ่มตามระดับความจำเป็น แทนการตั้งเป้าสูงสุดทุกมิติ:
- **ต้องมี (Must)** — สืบมาจากกฎทางธุรกิจที่บังคับอยู่แล้วในสเปค ไม่มีข้อต่อรอง (หัวข้อ 2)
- **ตัดสินใจแล้ว (Decided)** — มีทางเลือกจริงแต่ยืนยันกับผู้ใช้แล้ว (หัวข้อ 3)
- **ยังไม่ยืนยัน (Open)** — รอข้อมูล/งบประมาณเพิ่มเติมก่อนฟันธง ใช้ default ที่ portable ไว้ก่อน (หัวข้อ 4)
- **ควรมี/เลื่อนได้ (Should/Deferred)** — ไม่กระทบ go-live แต่ควรพิจารณา (หัวข้อ 5–6)

---

## 2. NFR ที่ต้องมี (Must) — จากกฎทางธุรกิจที่บังคับอยู่แล้ว

| หมวด | เป้าหมายที่วัดผลได้ | อ้างอิงกฎ/เอกสาร | วิธีตรวจสอบ |
|---|---|---|---|
| **Security / Access Control** | ทุก endpoint ที่ต้อง login ต้องตรวจ `account_status='approved'` + role + curriculum scope **ที่ฝั่ง server เท่านั้น** ก่อนถึง business logic เสมอ — 0 endpoint ที่หลุดการตรวจนี้ | กฎ #1/#3/#5/#6, `align-technical-design.md` §2.12 (หมายเหตุบังคับ), `align-tech-stack.md` §2.2 (RLS เป็น defense-in-depth ชั้นสอง ไม่ใช่กลไกหลัก) | Code review เฉพาะจุดก่อน merge ทุก endpoint ใหม่ + regression test ของ BR#1/#3/#5/#6 ใน [[../../03-testing/01-test-plan/test-plan-align|test-plan-align]] |
| **PDPA / Data Privacy** | เชื่อมต่อทุก endpoint ผ่าน HTTPS เท่านั้น, จำกัดสิทธิ์ `evidence` ตาม instructor/curriculum scope, **ห้ามใช้งานกับข้อมูลนักศึกษาจริงก่อนยืนยัน data residency กับหน่วยงาน PDPA ของมหาวิทยาลัย** | กฎ #5, `align-technical-design.md` §6, `align-tech-stack.md` ข้อ 2.2 (data residency "ยังไม่ทราบ") | Sign-off จากหน่วยงาน PDPA ก่อน go-live รอบที่ใช้ข้อมูลนักศึกษาจริง (ไม่ใช่ข้อมูลทดสอบ) |
| **Maintainability** | มี runbook ภาษาไทยสั้น ๆ (restart, ดู log, กู้ backup) ก่อน go-live เพราะผู้ดูแลระยะยาวไม่ใช่โปรแกรมเมอร์มืออาชีพ | `align-tech-stack.md` ข้อ 1.3 (ตัวแปรหลักที่กำหนดทั้ง stack) | ตรวจว่ามีเอกสาร runbook อยู่จริงก่อนปิด task go-live |
| **Auditability** | `evidence_access_log` ต้อง append-only — แก้ไข/ลบไม่ได้แม้โดยบัญชี `program_admin` ผ่านช่องทางปกติของระบบ | AB-07, กฎ #5 | ตรวจว่าไม่มี endpoint ใดใน [[align-technical-design|align-technical-design]] §3 ที่ update/delete ตาราง `evidence_access_log` |
| **Data Integrity (curriculum isolation)** | 0 กรณีข้อมูล 2565/2570 ปนกัน — บังคับด้วย DB constraint จริง (FK/check) ไม่ใช่แค่ตรวจในโค้ดชั้นเดียว | Cross-cutting rule ทุกเอกสาร, `align-technical-design.md` §2.4 | Test data จงใจให้ PLO ไม่เท่ากันตาม [[../../03-testing/01-test-plan/test-plan-align|test-plan-align]] §3.1 เพื่อจับ regression |
| **Human-in-the-loop Integrity** | 0% ของผลจาก AI (`ai_match_result`, `syllabus_gap_result`) ที่กลายเป็น `confirmed` โดยไม่มี action ของอาจารย์ผู้สอนคนนั้นโดยตรง ไม่ว่าค่าความมั่นใจจะสูงแค่ไหนหรือ timeout เท่าไร | กฎ #3 — "ข้อบังคับที่พลาดไม่ได้ที่สุดของทั้งระบบ" (`align-high-level-architecture.md` §4.1) | Regression test เฉพาะ: ยิง AI ซ้ำหลายรอบแล้วตรวจว่า state ไม่เปลี่ยนเป็น confirmed เองเด็ดขาด |

---

## 3. NFR ที่มีทางเลือก — ยืนยันกับผู้ใช้แล้ว (2026-08-23)

| หมวด | การตัดสินใจ | เหตุผล/เงื่อนไข |
|---|---|---|
| **Backup & Disaster Recovery** | ใช้ backup อัตโนมัติของ Supabase free tier เป็นฐาน **+ เพิ่ม manual/scripted export ก่อนเส้นตายสำคัญทุกรอบ** (ก่อนส่งเอกสาร มคอ./SAR แต่ละภาคการศึกษา) | ต้นทุนต่ำ ไม่ต้องอัปเกรด tier ทั้งปีทั้งที่งบยังไม่ยืนยัน (`align-tech-stack.md` ข้อ 2.1) แต่ยังมีความมั่นใจเพิ่มช่วงข้อมูลสำคัญที่สุด — **ต้องมีเจ้าภาพชัดเจน** (ผู้บริหารหลักสูตรหรือผู้ดูแลระบบ) รับผิดชอบ checklist นี้จริงก่อนแต่ละเส้นตาย ไม่ใช่แค่ระบุไว้ในเอกสาร |
| **Data & Audit-log Retention (PDPA)** | กำหนดตายตัว **5 ปี** นับจากวันที่บันทึก แล้ว archive/ลบ | อิงรอบประเมินหลักสูตรทั่วไป — **ต้องยืนยันตัวเลขนี้ซ้ำกับหน่วยงาน PDPA/ประกันคุณภาพของมหาวิทยาลัยก่อน implement จริง** เพราะกระทบ schema (ต้องมีกลไก archive/purge อัตโนมัติเมื่อครบกำหนดใน `evidence`, `evidence_access_log`, และ record อื่นที่มี PII) และอาจต้องสอดคล้องกับรอบประเมินจริงของ สกอ./สป.อว. — ดูหัวข้อ 7 (ผลกระทบต่อเอกสารอื่น) |
| **Evidence File Size/Type Limit** | สูงสุด **10MB ต่อไฟล์** อนุญาตเฉพาะ **PDF, DOCX, PPTX, รูปภาพ (JPG/PNG)** | ควบคุม storage quota ของ free tier ไม่ให้เต็มเร็วเกินไป (`align-tech-stack.md` §2.5 ยังไม่ตัดสินใจเรื่อง storage สุดท้าย) และป้องกันไฟล์ผิดชนิดหลุดเข้าระบบ — ต้อง validate ทั้งฝั่ง client (แจ้ง error ทันที) และฝั่ง server (กันการ bypass client validation) |

---

## 4. NFR ที่ยังไม่ยืนยัน — ต้องกลับมาทบทวน (ใช้ default ที่ portable ไว้ก่อน)

ตารางนี้ใช้รูปแบบเดียวกับ `align-tech-stack.md` §4 โดยเจตนา — เป็นจุดที่ยังไม่มีคำตอบชัดเจนพอจะฟันธง ไม่ใช่การตัดสินใจสุดท้าย

| ประเด็นที่ยังไม่ทราบ | Default ที่แนะนำไว้ก่อน | เงื่อนไขที่ต้องกลับมาทบทวน | ทางย้าย |
|---|---|---|---|
| **ระดับความพร้อมใช้งาน (Availability)** — ผู้ใช้ตอบ "ไม่แน่ใจ" ในรอบสัมภาษณ์นี้ | Best-effort บน Vercel/Supabase free tier ตลอดปี ไม่มี SLA รับประกัน | เมื่อยืนยันงบประมาณ (`align-tech-stack.md` ข้อ 2.1) และรู้ว่ามีความเสี่ยง downtime ที่รับไม่ได้ช่วงใกล้ปิดภาค/ส่งมคอ.-SAR หรือไม่ | ถ้ามีงบแม้เพียงบางส่วน → อัปเกรดเป็น paid tier **เฉพาะช่วงพีค** (2–4 สัปดาห์ก่อน-หลังปิดภาคแต่ละรอบ) ก่อนจะพิจารณา paid tier ตลอดปี |

---

## 5. NFR ที่ควรมี (Should)

| หมวด | ข้อเสนอ | เหตุผล |
|---|---|---|
| Usability/Accessibility | ยกระดับ WCAG AA contrast (มีอยู่แล้วใน `DESIGN.md` ข้อ 7) ให้เป็นเงื่อนไขตรวจก่อนปล่อยจริง ไม่ใช่แค่ design note | ปัจจุบันเป็นแค่คำแนะนำเชิง design ยังไม่ใช่เกณฑ์ sign-off ก่อน go-live |
| Compatibility | รองรับ evergreen browser (Chrome/Edge/Safari/Firefox 2 เวอร์ชันล่าสุด) + responsive มือถือ | ทีมเล็กไม่มีกำลัง QA ข้าม browser เก่า และมี prototype มือถืออยู่แล้ว (`M-SignUp.dc.html`) |
| AI safety-net (external API) | เมื่อเปิด external LLM API แบบ feature-flag (`align-tech-stack.md` §2.4) ต้องมี timeout + fallback กลับไปใช้ local embedding อัตโนมัติถ้าเรียกไม่สำเร็จ | §2.4 เปิดไว้เป็น optional แต่ยังไม่ระบุ error-handling behavior เมื่อ external call ล้มเหลว |
| Observability | เพิ่ม error-tracking ฟรี (เช่น Sentry free tier) เชื่อมกับ Next.js นอกเหนือจาก dashboard สำเร็จรูปของ Vercel/Supabase | ทีมเล็กไม่มีคนคอย monitor ตลอดเวลา — ต้องรู้ปัญหาก่อนผู้ใช้แจ้งเอง โดยไม่เพิ่มภาระ sysadmin มาก |

---

## 6. เลื่อนออกไปได้ / นอกขอบเขตของรอบนี้ (Deferred)

| หมวด | เหตุผลที่เลื่อน |
|---|---|
| Load/Performance testing เต็มรูปแบบ (automated) | [[../../03-testing/01-test-plan/test-plan-align|test-plan-align]] §1 ตัดออกจาก scope รอบนี้แล้วอย่างชัดเจน — สเปคไม่ได้กำหนดเกณฑ์ตัวเลข และเกินกำลังทีม 1–2 คนในกรอบเวลา 2 เดือน แนะนำเพียงเป้าหมายเชิงคุณภาพแบบเบา (เช่น dashboard โหลด < 3 วินาที, ผล AI draft ปรากฏ < 10 วินาทีหลังบันทึกการสอน) ตรวจด้วยตาแทน automated load test เพื่อกันปัญหา UX ชัดเจนจาก cold-start ของ embedding model บน serverless function |
| AI precision/recall benchmarking | `test-plan-align.md` §1 ระบุชัดว่าไม่มีเกณฑ์ตัวเลขความแม่นยำในสเปค ทดสอบได้เฉพาะ contract เชิงพฤติกรรม (draft ต้องรอยืนยัน ฯลฯ) — ความเสี่ยงจากความแม่นยำต่ำถูกป้องกันด้วย human-in-the-loop (กฎ #3) อยู่แล้ว ไม่ต้องมี NFR เชิงตัวเลขซ้ำ |
| SSO integration | `align-tech-stack.md` ข้อ 5 — ยังไม่ทราบว่ามหาวิทยาลัยมี SSO รองรับ protocol ใด รอยืนยันก่อนลงทุนเวลา |
| Multi-region / High-availability infrastructure | เกินความจำเป็นของสเกลจริง "สาขาเดียว หลักสิบคน" ตาม [[../../01-requirements/01-spec/plo-course-master-data|plo-course-master-data]] |

---

## 7. ผลกระทบต่อเอกสารอื่นที่ต้องติดตาม

- **Retention 5 ปี (หัวข้อ 3)** กระทบ schema ของ `evidence`, `evidence_access_log` และ record อื่นที่มี PII ใน [[align-technical-design|align-technical-design]] §2/[[align-api-schema-design|align-api-schema-design]] — ต้องออกแบบกลไก archive/purge เมื่อครบกำหนด เอกสารนี้เพียงกำหนดเป้าหมาย NFR ไม่ได้ลงรายละเอียด schema ให้ (เป็นงานของ `technical-designer`/`api-schema-designer` เมื่อยืนยันตัวเลขกับหน่วยงาน PDPA แล้ว)
- **File size/type limit (หัวข้อ 3)** ยังไม่ปรากฏเป็น validation rule ใน [[align-technical-design|align-technical-design]] §3 (`POST /teaching-records/{id}/evidence`, `POST /courses/{id}/syllabus/upload`) — ควรเพิ่มเป็นเงื่อนไข request/response เมื่อปรับ API spec รอบถัดไป
- **Availability ที่ยังไม่ยืนยัน (หัวข้อ 4)** เชื่อมกับตาราง "ประเด็นที่ยังไม่ยืนยัน" ใน [[align-tech-stack|align-tech-stack]] §4 — ควรทบทวนพร้อมกันเมื่อรู้คำตอบเรื่องงบประมาณ (ข้อ 2.1 ของเอกสารนั้น)

---

เชื่อมโยง: [[align-high-level-architecture|align-high-level-architecture]] · [[align-technical-design|align-technical-design]] · [[align-tech-stack|align-tech-stack]] · [[../../01-requirements/01-spec/requirement-align|requirement-align]] · [[../../03-testing/01-test-plan/test-plan-align|test-plan-align]]

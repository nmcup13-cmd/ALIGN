# Test Case: E6 — สมัครและอนุมัติบัญชีผู้ใช้ (User Registration & Approval)

ครอบคลุม AB-24, AB-25, AB-26, AB-27 จาก [[../../01-requirements/02-plan/product-backlog|product-backlog]] — ใช้ชุดข้อมูลทดสอบตาม [[test-plan-align|test-plan-align §3 (ชุดข้อมูลทดสอบ)]] และชุดข้อมูล/บทบาทเพิ่มเติมเฉพาะ E6 ในหัวข้อ "ข้อมูลทดสอบเพิ่มเติมสำหรับ E6" ด้านล่าง

อ้างอิงกฎทางธุรกิจ: **BR#6** (บัญชีที่สมัครเองต้องผ่านการอนุมัติจากผู้บริหารหลักสูตรก่อนเข้าถึงฟีเจอร์อื่นของระบบได้เสมอ — บัญชี "รออนุมัติ"/"ถูกปฏิเสธ" ต้องไม่เข้าถึงข้อมูลใดๆได้ไม่ว่ากรณีใด) ยึด entity/endpoint ตาม [[../../02-design/02-technical/align-technical-design|align-technical-design]] §2.12/§2.13/§3 (E6): `user.account_status` (`pending`/`approved`/`rejected`), `approved_by`, `approved_at`, และ endpoint `POST /auth/register`, `GET /auth/me/account-status`, `GET /admin/accounts`, `POST /admin/accounts/{id}/approve`, `POST /admin/accounts/{id}/reject` — และหน้าจอต้นแบบ `M-SignUp.dc.html`, `M-PendingApproval.dc.html`, `M-AdminApproveAccounts.dc.html` ตาม [[../../02-design/01-prototypes/align-interactive-prototype|align-interactive-prototype]]

**หมายเหตุสำคัญ**: จุดที่ audit ก่อนหน้าพบว่าขาดไปคือการตรวจสอบ `account_status = 'approved'` ต้องเกิดขึ้น**ทุกครั้งที่มี request** ไปยัง endpoint ที่ต้อง auth (ไม่ใช่ตรวจครั้งเดียวตอน login) — ยกเว้นเฉพาะ `POST /auth/register` และ `GET /auth/me/account-status` เท่านั้น (align-technical-design §2.12 "หมายเหตุบังคับ") — test case ของ AB-25 ในไฟล์นี้ทดสอบเงื่อนไขนี้โดยเฉพาะ ไม่ใช่แค่ทดสอบตอน login เพียงจุดเดียว

---

## ข้อมูลทดสอบเพิ่มเติมสำหรับ E6

| รหัส | รายละเอียด |
|---|---|
| `U-NEWREG` | ผู้สมัครใหม่ที่ยังไม่มีบัญชีในระบบก่อนเริ่มเทสต์ — ใช้กรอกฟอร์มสมัคร (`name: "อ.สมชาย ใจดี"`, `email: "somchai.j@ตัวอย่าง.ac.th"`, `department: "ภาควิชาวิทยาการคอมพิวเตอร์"`, `password: "TestPass!2026"`) ผ่าน `POST /auth/register` |
| `U-PENDING` | บัญชีที่สมัครสำเร็จแล้ว แต่ `account_status = 'pending'` — ยังไม่ถูกอนุมัติ/ปฏิเสธ (`approved_by = null`, `approved_at = null`) |
| `U-REJECTED` | บัญชีที่สมัครแล้วถูก `U-PA-2565` ปฏิเสธไปแล้ว — `account_status = 'rejected'`, `approved_by = U-PA-2565`, `approved_at` มีค่า |
| `U-INSTR-A` | (ใช้ซ้ำจาก [[test-plan-align|test-plan-align §2]]) บัญชี `account_status = 'approved'` อยู่แล้ว — ใช้เป็น baseline เปรียบเทียบกับ `U-PENDING`/`U-REJECTED` |
| `U-PA-2565` | (ใช้ซ้ำจาก [[test-plan-align|test-plan-align §2]]) ผู้บริหารหลักสูตร ใช้ทดสอบสิทธิ์ admin-only ของ AB-26 |
| `EMAIL-DUP` | อีเมล `somchai.j@ตัวอย่าง.ac.th` ที่ถูกใช้สมัครไปแล้วครั้งหนึ่ง (ของ `U-NEWREG`) — ใช้ทดสอบการปฏิเสธอีเมลซ้ำ |

---

## AB-24 — สมัครใช้งาน ALIGN ได้เองแบบ self-service

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB24-01 | Happy path | ยังไม่มีบัญชีอีเมล `somchai.j@ตัวอย่าง.ac.th` ในระบบ | ผู้สมัคร (`U-NEWREG`) กรอกฟอร์มสมัคร (ตามฟิลด์ที่ระบุใน "ข้อมูลทดสอบเพิ่มเติมสำหรับ E6") ผ่านหน้าจอ `M-SignUp` แล้วกดยืนยัน (เรียก `POST /auth/register`) | ระบบสร้างบัญชีใหม่ทันทีด้วย `account_status = 'pending'` และ `role = 'instructor'` โดยอัตโนมัติ (ไม่ใช่ `approved`) พร้อม res `{user_id, account_status: "pending"}` | AB-24 AC ข้อ 1–2, BR#6, align-technical-design §2.12/§3 |
| TC-AB24-02 | Happy path | บัญชี `U-NEWREG` สมัครสำเร็จแล้ว (`pending`) ตาม TC-AB24-01 | ผู้สมัครถูกนำไปยังหน้าจอ `M-PendingApproval` ทันทีหลังสมัครสำเร็จ (ไม่ใช่หน้า dashboard/ฟีเจอร์อื่นของระบบ) | หน้าจอที่แสดงคือ `M-PendingApproval` เท่านั้น ไม่มีการพาเข้าใช้งานฟีเจอร์ใดของ E1–E5 ทันทีหลังสมัคร | AB-24 AC ข้อ 3, BR#6 |
| TC-AB24-03 | **Rejection — อีเมลซ้ำ** | มีบัญชีที่ใช้อีเมล `somchai.j@ตัวอย่าง.ac.th` อยู่แล้วในระบบ (`EMAIL-DUP`) | ผู้สมัครใหม่กรอกฟอร์มสมัครด้วยอีเมลเดิมนี้อีกครั้งผ่าน `POST /auth/register` | ระบบปฏิเสธด้วย HTTP 409 ไม่มีบัญชีใหม่ถูกสร้างซ้ำ และไม่กระทบสถานะบัญชีเดิมที่มีอยู่ | AB-24 AC ข้อ 2, align-technical-design §3 (E6, "ถ้า email ซ้ำในระบบ ตอบ 409") |
| TC-AB24-04 | `[PLACEHOLDER — รอคำตอบ]` ฟิลด์ฟอร์มสมัครสมาชิก | ผู้สมัครเปิดฟอร์ม `M-SignUp` | กรอกฟอร์มโดยเว้นฟิลด์บางฟิลด์ว่าง (เช่น ไม่กรอก `department`) หรือกรอกรูปแบบ `email`/`password` ที่ไม่ถูกต้อง แล้วกดยืนยัน | **ยังไม่สามารถระบุผลลัพธ์ที่คาดหวังได้แน่ชัด** เพราะ AB-24 AC ระบุตรงๆว่า "รายละเอียดฟิลด์ข้อมูลที่ต้องกรอกในแบบฟอร์มยังไม่ได้ระบุชัดเจนในสเปค ต้องยืนยันเพิ่มเติมก่อนพัฒนาจริง" และ align-technical-design §2.12 ระบุชุดฟิลด์ปัจจุบันเป็น "ข้อเสนอ" ที่อ้างจากต้นแบบ `M-SignUp` เท่านั้น ยังไม่ยืนยันกฎ validation ต่อฟิลด์ (จำเป็น/รูปแบบ/ความยาวรหัสผ่าน ฯลฯ) — เขียน test case ที่ตรวจ validation จริงต่อเมื่อได้รายการฟิลด์/กฎที่ยืนยันแล้ว | AB-24 AC ข้อ 1 (คำถามเปิด), test-plan-align §6 |
| TC-AB24-05 | Rejection | บัญชี `U-PA-2565` (`program_admin`) มีอยู่แล้วในระบบ | มีผู้พยายามสมัครผ่าน `POST /auth/register` โดยระบุ/ขอ `role = 'program_admin'` ในคำขอ (ถ้า UI/API เปิดให้ระบุ role ได้) | ระบบต้องสร้างบัญชีใหม่ด้วย `role = 'instructor'` เสมอ ไม่ยอมรับค่า `role` อื่นจากผู้สมัครที่ยังไม่มีบัญชี เพราะสเปค (E6) ระบุว่าเฉพาะอาจารย์ผู้สอนเท่านั้นที่สมัครเองได้ | AB-24, align-technical-design §2.12 ("บัญชีที่สมัครเองผ่าน E6 ได้ role = instructor เสมอ") |

## AB-25 — ปิดกั้นบัญชี "รออนุมัติ"/"ถูกปฏิเสธ" ไม่ให้เข้าถึงฟีเจอร์ใดๆ (ตรวจทุก request ไม่ใช่แค่ตอน login)

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB25-01 | **Rejection — ปิดกั้น E4 (dashboard)** | `U-PENDING` มี `account_status = 'pending'` | `U-PENDING` เรียก `GET /me/dashboard` โดยตรง (มี credential ที่ login ได้แล้ว) | ระบบปฏิเสธด้วย HTTP 403 ไม่คืนข้อมูล dashboard ใดๆ (ไม่ leak `courses`/`gap_alerts`) — พิสูจน์ว่า E1–E5 ทุกจุดถูกปิดกั้น ไม่ใช่แค่ฟีเจอร์เดียว | AB-25 AC ข้อ 1, BR#6, align-technical-design §2.12 "หมายเหตุบังคับ" |
| TC-AB25-02 | **Rejection — ปิดกั้น E2 (บันทึกการสอน)** | `U-PENDING` มี `account_status = 'pending'` และมีสิทธิ์สอน `COS101` (สมมติสมมติเป็น instructor ของวิชานี้เพื่อตัดตัวแปรเรื่อง ownership ออก) | `U-PENDING` เรียก `POST /courses/{COS101}/teaching-records` | ระบบปฏิเสธด้วย HTTP 403 ก่อนถึง business logic ของ E2 (ก่อนเช็ค `clo_plo_ready` ของ AB-03/BR#1 เสียอีก) ไม่มี `teaching_record` ถูกสร้างขึ้น | AB-25 AC ข้อ 1, BR#6 |
| TC-AB25-03 | **Rejection — บัญชีที่ถูกปฏิเสธเช่นกัน** | `U-REJECTED` มี `account_status = 'rejected'` | `U-REJECTED` เรียก `GET /me/dashboard` | ระบบปฏิเสธด้วย HTTP 403 เหมือนกรณี `pending` ทุกประการ (BR#6 ระบุว่า `pending` และ `rejected` ต้องถูกปิดกั้นเหมือนกัน) | AB-25 AC ข้อ 1, BR#6 |
| TC-AB25-04 | **Edge case — ตรวจสอบทุก request ไม่ใช่แค่ตอน login (revoke กลางอายุ session)** | `U-INSTR-B` login สำเร็จตอนบัญชียังเป็น `account_status = 'approved'` และเปิดหน้า dashboard ค้างไว้ (มี session/token ที่ยัง valid) — ระหว่างนั้นผู้บริหารหลักสูตรพบปัญหาและเปลี่ยนสถานะบัญชีนี้เป็น `'rejected'` ย้อนหลัง | `U-INSTR-B` ใช้ session/token เดิม (ที่ login ไว้ตั้งแต่ตอนยัง `approved`) เรียก `GET /courses/{COS201}/clo-week-map` อีกครั้งหลังสถานะเปลี่ยน | ระบบต้องปฏิเสธด้วย HTTP 403 ทันทีในการเรียกครั้งใหม่นี้ (ตรวจ `account_status` สดจาก DB ทุก request ไม่ใช่ค่าที่ cache ไว้ตอน login) — ไม่ปล่อยให้ทำงานต่อ | AB-25 AC ข้อ 2–3, BR#6 |
| TC-AB25-05 | Happy path (baseline เปรียบเทียบ) | `U-INSTR-A` มี `account_status = 'approved'` | `U-INSTR-A` เรียก `GET /me/dashboard` | ระบบตอบสำเร็จ (200) พร้อมข้อมูล dashboard ตามปกติ — ใช้เทียบกับ TC-AB25-01 เพื่อยืนยันว่าการปฏิเสธเกิดจากสถานะบัญชีเท่านั้น ไม่ใช่ endpoint พัง | AB-25, baseline |
| TC-AB25-06 | Edge case — endpoint ที่ยกเว้นต้องยังเรียกได้ | `U-PENDING` มี `account_status = 'pending'` | `U-PENDING` เรียก `GET /auth/me/account-status` (1 ใน 2 endpoint ที่ยกเว้นการตรวจ `account_status = 'approved'`) | ระบบตอบสำเร็จ (200) พร้อม `{account_status: "pending"}` — ไม่ถูกปิดกั้นเหมือน endpoint อื่น เพราะ AB-27 กำหนดให้บัญชี `pending`/`rejected` ต้องเช็คสถานะตนเองได้ | AB-25 (การยกเว้นตาม align-technical-design §2.12), AB-27 |

## AB-26 — รายการบัญชีที่รออนุมัติ + อนุมัติ/ปฏิเสธ (admin-only visibility) + audit trail

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB26-01 | Happy path | มี `U-PENDING` อยู่ในระบบ (`account_status = 'pending'`) | `U-PA-2565` เรียก `GET /admin/accounts?status=pending` | ระบบตอบ 200 พร้อมรายการที่มี `U-PENDING` อยู่ในนั้น (ครบฟิลด์ `user_id, name, email, department, account_status, approved_by, approved_at`) | AB-26 AC ข้อ 2, align-technical-design §3 (E6) |
| TC-AB26-02 | **Rejection — ไม่ใช่ admin (403)** | `U-INSTR-A` มี `role = 'instructor'` และ `account_status = 'approved'` (บัญชีปกติ ไม่ใช่บัญชีที่ถูก block เพราะ BR#6) | `U-INSTR-A` เรียก `GET /admin/accounts` (ไม่ระบุ `status`) | ระบบปฏิเสธด้วย HTTP 403 ไม่คืนรายการบัญชีใดๆ — พิสูจน์ว่า admin-only visibility ไม่ใช่แค่ซ่อนปุ่มฝั่ง UI แต่ backend บล็อกจริง แม้ role นี้ผ่านการอนุมัติแล้วก็ตาม | AB-26 AC ข้อ 1, align-technical-design §3 ("role อื่นเรียก endpoint นี้ต้องได้ 403") |
| TC-AB26-03 | Happy path | `U-PENDING` อยู่ในสถานะ `pending` (`approved_by = null`, `approved_at = null`) | `U-PA-2565` เรียก `POST /admin/accounts/{U-PENDING}/approve` | `account_status` ของ `U-PENDING` เปลี่ยนเป็น `'approved'` ทันที และบันทึก `approved_by = U-PA-2565` (user_id), `approved_at` = เวลาปัจจุบัน (ไม่เป็น null อีกต่อไป) — หลังจากนี้ `U-PENDING` เรียก `GET /me/dashboard` ได้สำเร็จทันทีโดยไม่ต้อง login ใหม่ | AB-26 AC ข้อ 3, BR#6, align-technical-design §3 |
| TC-AB26-04 | Happy path | `U-PENDING` (คนละบัญชีจาก TC-AB26-03) อยู่ในสถานะ `pending` | `U-PA-2565` เรียก `POST /admin/accounts/{U-PENDING}/reject` | `account_status` เปลี่ยนเป็น `'rejected'`, บันทึก `approved_by`/`approved_at` เช่นเดียวกับ approve — และบัญชีนี้ยังคงเข้าถึงข้อมูล/ฟีเจอร์ใดๆของระบบไม่ได้ (ตรวจซ้ำด้วย `GET /me/dashboard` → 403 เหมือน TC-AB25-01) | AB-26 AC ข้อ 4, BR#6 |
| TC-AB26-05 | Edge case | ระบบมีบัญชีทั้ง `pending`, `approved`, `rejected` ปนกันอยู่ | `U-PA-2565` เรียก `GET /admin/accounts` โดย**ไม่ระบุ** query param `status` | ระบบคืนบัญชี**ทุกสถานะ**ที่เคยสมัคร ไม่ใช่เฉพาะ `pending` (ตาม align-technical-design §3: "ไม่ระบุ status = ดึงบัญชีทั้งหมดที่เคยสมัคร") | AB-26 AC ข้อ 2, align-technical-design §3 |
| TC-AB26-06 | Edge case | `U-REJECTED` ถูก `U-PA-2565` ปฏิเสธไปแล้วก่อนหน้า (`approved_by = U-PA-2565`, `approved_at = T1`) | ผู้บริหารหลักสูตรอีกคนหนึ่ง `U-PA-2570` (สมมติมีสิทธิ์ตรวจสอบบัญชีข้ามหลักสูตรได้ตาม admin-only visibility ที่ไม่ผูกกับ `program_admin_curriculum_scope`) เรียก `POST /admin/accounts/{U-REJECTED}/approve` ที่เวลา `T2` (กลับคำตัดสินใจเดิม) | `account_status` เปลี่ยนเป็น `'approved'`, และ `approved_by`/`approved_at` ถูก**เขียนทับ**เป็นค่าล่าสุด (`approved_by = U-PA-2570`, `approved_at = T2`) เพราะ align-technical-design §2.12 ระบุว่าฟิลด์นี้เก็บ "ผู้อนุมัติ/ปฏิเสธบัญชีนี้ครั้งล่าสุด" เท่านั้น ไม่มี history หลายรอบ | AB-26 AC ข้อ 4, align-technical-design §2.12 |
| TC-AB26-07 | Rejection | `U-PENDING` มี `account_status = 'pending'` | `U-PENDING` (เจ้าของบัญชีเอง) พยายามเรียก `POST /admin/accounts/{U-PENDING}/approve` เพื่ออนุมัติบัญชีตนเอง | ระบบปฏิเสธด้วย HTTP 403 ทั้งจากเหตุผล (ก) `account_status != 'approved'` ของผู้เรียกเอง และ (ข) ไม่ใช่ role `program_admin` — ไม่มีบัญชีใดอนุมัติตนเองได้ | AB-26, BR#6, align-technical-design §2.12/§3 |

## AB-27 — เห็นสถานะบัญชีของตนเองเท่านั้น ไม่เปิดเผยของผู้อื่น

| ID | ประเภท | Given | When | Then | อ้างอิง |
|---|---|---|---|---|---|
| TC-AB27-01 | Happy path | `U-PENDING` มี `account_status = 'pending'` | `U-PENDING` login แล้วเรียก `GET /auth/me/account-status` | ระบบตอบ 200 พร้อม `{account_status: "pending"}` และแสดงข้อความชัดเจนบนหน้าจอ `M-PendingApproval` ว่าอยู่ระหว่างรออนุมัติ ไม่พาเข้าฟีเจอร์ใดของระบบ | AB-27 AC ข้อ 1 |
| TC-AB27-02 | Happy path | `U-REJECTED` มี `account_status = 'rejected'` | `U-REJECTED` login แล้วเรียก `GET /auth/me/account-status` | ระบบตอบ 200 พร้อม `{account_status: "rejected", rejection_reason}` และแสดงข้อความชัดเจนว่าบัญชีถูกปฏิเสธ ไม่พาเข้าฟีเจอร์ใดของระบบ | AB-27 AC ข้อ 2, BR#6 |
| TC-AB27-03 | Happy path | `U-INSTR-A` มี `account_status = 'approved'` | `U-INSTR-A` login | ระบบพาเข้าใช้งานฟีเจอร์ตามสิทธิ์ได้ตามปกติ (ไม่ผ่านหน้า `M-PendingApproval`) | AB-27 AC ข้อ 3 |
| TC-AB27-04 | **Rejection — ห้ามเปิดเผยสถานะบัญชีผู้อื่น** | `U-PENDING` login สำเร็จด้วย credential ของตนเอง | `U-PENDING` เรียก `GET /auth/me/account-status` พร้อมพยายามแทรกพารามิเตอร์ระบุ user อื่น (เช่น `?user_id=U-INSTR-A` หรือ body ที่ระบุ user_id ของอาจารย์ท่านอื่น) | ระบบต้อง**เพิกเฉยพารามิเตอร์ที่แทรกมา**และตอบกลับเฉพาะสถานะบัญชีของผู้เรียก (`U-PENDING`) เองเท่านั้นเสมอ ไม่คืนสถานะของ `U-INSTR-A` ไม่ว่ากรณีใด | AB-27 AC ข้อ 4, align-technical-design §3 ("ห้ามรับพารามิเตอร์ user อื่น") |
| TC-AB27-05 | `[PLACEHOLDER — รอคำตอบ]` `rejection_reason` บังคับกรอกหรือไม่ | `U-PA-2565` ปฏิเสธบัญชีหนึ่งโดย**ไม่กรอก**เหตุผล (`reason` เป็นค่าว่าง/ไม่ส่งมาใน `POST /admin/accounts/{id}/reject`) | เจ้าของบัญชีเรียก `GET /auth/me/account-status` | **ยังไม่สามารถระบุผลลัพธ์ที่คาดหวังได้แน่ชัด** ว่าระบบต้องบังคับให้ผู้บริหารหลักสูตรกรอกเหตุผลก่อนปฏิเสธได้หรือไม่ เพราะ AB-26 AC ระบุเพียง "ผู้อนุมัติ, เวลาที่ดำเนินการ" เท่านั้น ไม่ได้กำหนดเรื่องเหตุผล และ align-technical-design §2.12 ระบุ `rejection_reason` เป็น "ข้อเสนอ...ต้องยืนยันกับทีมพัฒนา/ผู้บริหารหลักสูตรก่อนเริ่มจริงว่าจำเป็นต้องบังคับกรอกหรือไม่" — เขียน test case ยืนยันพฤติกรรมบังคับ/ไม่บังคับได้ต่อเมื่อได้คำตอบแล้ว ปัจจุบันทดสอบได้เฉพาะว่าถ้าไม่มีค่า ระบบต้องไม่ crash และคืน `rejection_reason: null`/ไม่แสดงฟิลด์นี้อย่างสม่ำเสมอ | AB-26, AB-27, test-plan-align §6 |

---

## เชื่อมโยง

- ย้อนกลับไปยัง [[test-plan-align|test-plan-align]] (ขอบเขต/บทบาท/คำถามเปิดรวมของทั้งโปรเจกต์)
- E6 เป็น**เงื่อนไขก่อนหน้า (precondition)** ของทุก Epic อื่น — บัญชีต้อง `account_status = 'approved'` ก่อนจึงจะเริ่ม test case ของ [[e1-clo-plo-syllabus-setup|e1-clo-plo-syllabus-setup]], [[e2-teaching-record-evidence|e2-teaching-record-evidence]], [[e3-ai-matching-gap-analysis|e3-ai-matching-gap-analysis]], [[e4-dashboard-alerts|e4-dashboard-alerts]], [[e5-word-export|e5-word-export]] ได้ — สมมติว่าบทบาททดสอบทั้งหมดใน [[test-plan-align|test-plan-align §2]] (`U-INSTR-A`, `U-INSTR-B`, `U-PA-2565`, `U-PA-2570`) มี `account_status = 'approved'` อยู่แล้วเป็นค่าตั้งต้นก่อนเริ่มรันเทสต์ของ Epic อื่น

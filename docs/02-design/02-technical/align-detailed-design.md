# Detailed Design (Conceptual): ระบบติดตามความสอดคล้อง CLO/PLO (ALIGN)

เอกสารนี้เป็น**ชั้นแนวคิดที่ละเอียดกว่า** [[align-high-level-architecture|align-high-level-architecture]] (ซึ่งบอกแค่ "มี component อะไรบ้าง ข้อมูลไหลยังไงในภาพกว้าง") และละเอียดกว่า [[align-api-schema-design|align-api-schema-design]] (ซึ่งบอกแค่ "มี entity/endpoint อะไรบ้าง") — เอกสารนี้ตอบคำถาม **"ทีละขั้นตอน เกิดอะไรขึ้นบ้าง ใครเรียกใคร ถ้าพลาดจะเกิดอะไรขึ้น"** โดยลง sequence (Mermaid `sequenceDiagram`) และวงจรสถานะ (Mermaid `stateDiagram-v2`) ของ scenario หลักทั้งหมด — ตั้งใจ**ไม่ผูกมัดกับ technical stack ใดๆ** เช่นเดียวกับเอกสารสองฉบับข้างต้น (ไม่มีชื่อภาษาโปรแกรม, framework, database engine, message queue, cloud provider)

**ความสัมพันธ์กับเอกสารอื่น**:
- [[align-high-level-architecture|align-high-level-architecture]] — เป็นแหล่งชื่อ **logical component** ที่เอกสารนี้ใช้เป็น participant ใน sequence diagram ทุกตัว (ไม่คิดชื่อใหม่)
- [[align-api-schema-design|align-api-schema-design]] — เป็นแหล่งชื่อ **entity/field/state/endpoint** ที่เอกสารนี้อ้างอิงตรงเป๊ะ (เช่น `ai_match_result.state`, `POST /ai-match-results/{id}/confirm`)
- [[align-technical-design|align-technical-design]] §4 (แนวทาง AI Matching และ Gap Analysis) — เป็นฐาน input/output/state contract ของกลไก AI ที่เอกสารนี้แตกเป็น sequence step ที่ละเอียดกว่า ไม่ขัดแย้งกัน
- [[../01-prototypes/align-user-journey|align-user-journey]] และ [[../01-prototypes/align-navigation-flow|align-navigation-flow]] — เป็นฐานของลำดับเหตุการณ์/หมายเลขหน้าจอที่ sequence diagram ทุกอันอ้างอิงตรงๆ ไม่ได้แต่ง flow ใหม่

---

## 0. Legend — Participant/Actor ที่ใช้ร่วมกันทุก Sequence Diagram

ชื่อด้านล่างตรงกับ**ชื่อ logical component เป๊ะ**ตาม [[align-high-level-architecture#2-logical-components|align-high-level-architecture §2]] เพื่อไม่ให้เกิดชื่อใหม่ที่ขัดกัน:

| Alias ในไดอะแกรม | ชื่อเต็ม (ตรงกับ high-level-architecture) |
|---|---|
| `Instructor` / `Admin` / `Applicant` | อาจารย์ผู้สอน / ผู้บริหารหลักสูตร / ผู้สมัคร (ยังไม่มีบัญชี) — actor ที่มี login จริงมีแค่ 2 บทบาทแรก |
| `UI` | ส่วนติดต่อผู้ใช้ (User-Facing Interface) — untrusted, ไม่ตัดสินใจเอง |
| `Gate` | ประตูควบคุมสิทธิ์และสถานะบัญชี (Access Gate) — trust boundary หลัก |
| `Core` | แกนประสานงานและบังคับใช้กฎทางธุรกิจ (Core Orchestration) |
| `AI` | กลไกจับคู่/วิเคราะห์ด้วย AI (AI Matching & Gap-Analysis Engine) — 1 component ที่ทำ 2 งานอิสระจากกัน (จับคู่ CLO/PLO และวิเคราะห์ gap) |
| `DB` | ที่เก็บข้อมูลโครงสร้าง (Structured Data Store) |
| `Evid` | ที่เก็บหลักฐาน/ชิ้นงานควบคุมสิทธิ์ตาม PDPA (Access-Controlled Evidence Repository) |
| `GapNotify` | กลไกแจ้งเตือนช่องว่างหลักฐาน (Gap Notification Mechanism) — อ่านอย่างเดียว |
| `Export` | กลไกสร้างเอกสารส่งออก (Document Export Generator) |
| `AuditLog` | บันทึกการเข้าถึงหลักฐาน (Access Audit Log) |

ทุกไดอะแกรมใช้ `autonumber` เพื่อให้อ้างอิง step ได้ง่าย แต่ตารางบังคับใช้กฎในแต่ละหัวข้อจะอ้างอิงด้วย**คำอธิบายขั้นตอน**แทนเลข step ตรงๆ (กันความคลาดเคลื่อนถ้ามีการแก้ไขไดอะแกรมภายหลัง)

---

## 1. Sequence Flows

### 1.1 บันทึกการสอน → AI จับคู่ CLO/PLO → อาจารย์ยืนยัน/แก้ไข/ปฏิเสธ

อ้างอิง: [[align-high-level-architecture#31-บันทึกการสอน-→-ai-จับคู่-cloplo-→-อาจารย์ยืนยันแก้ไขปฏิเสธ|align-high-level-architecture §3.1]], journey แถว "ระหว่างเทอม — หลังสอนแต่ละคาบ", navigation-flow เส้นทาง `5 → 6 → 1`

```mermaid
sequenceDiagram
    autonumber
    actor Instructor as อาจารย์ผู้สอน
    participant UI as "ส่วนติดต่อผู้ใช้"
    participant Gate as "ประตูควบคุมสิทธิ์และสถานะบัญชี"
    participant Core as "แกนประสานงานและบังคับใช้กฎทางธุรกิจ"
    participant AI as "กลไกจับคู่/วิเคราะห์ด้วย AI"
    participant DB as "ที่เก็บข้อมูลโครงสร้าง"
    participant Evid as "ที่เก็บหลักฐาน/ชิ้นงาน (PDPA)"

    Instructor->>UI: เปิดหน้าจอ 5 กรอกหัวข้อการสอน + แนบไฟล์หลักฐาน กด "บันทึกและให้ AI ประมวลผล"
    UI->>Gate: POST /courses/{id}/teaching-records
    Gate->>Gate: ตรวจ account_status == approved (กฎ #6)
    alt บัญชียังไม่อนุมัติ/ถูกปฏิเสธ/ถูกลบ (is_deleted=true)
        Gate-->>UI: 403 ACCOUNT_NOT_APPROVED
        UI-->>Instructor: แจ้งเตือน พากลับหน้าจอสถานะบัญชี — ไม่เข้าสู่แกนประสานงานเลย
    else บัญชี approved แล้ว
        Gate->>Core: ส่งคำร้องต่อ
        Core->>DB: ตรวจ course.clo_plo_ready
        alt clo_plo_ready == false (ยังไม่ผูก CLO ≥1 ข้อกับ PLO ≥1 ข้อ)
            Core-->>Gate: 409 Conflict — ต้องผูก CLO–PLO ก่อน
            Gate-->>UI: 409
            UI-->>Instructor: แจ้งเตือน พาไปหน้าจอ 3 (จัดการ CLO/PLO) — บล็อกการบันทึกการสอนเสมอ
        else clo_plo_ready == true
            Core->>DB: สร้าง document ใหม่ใน teaching_record (status = draft_ai_pending)
            Core->>Evid: เก็บไฟล์แนบเป็น evidence (contains_student_pii default true)
            Core->>AI: ส่ง teaching_record + เนื้อหาหลักฐาน + เฉพาะ CLO ของ curriculum เดียวกับวิชานี้ (ป้องกันข้ามหลักสูตร 2565↔2570, AB-08)
            opt AI ประมวลผลไม่สำเร็จ/หมดเวลา [ยืนยันแล้ว — ไม่ retry อัตโนมัติ, §4.3 Q3]
                AI-->>Core: error / timeout
                Core-->>UI: แจ้งว่าประมวลผล AI ไม่สำเร็จ พร้อมปุ่ม "ลองประมวลผลใหม่" (teaching_record ที่บันทึกไว้แล้วไม่หายไป)
                UI-->>Instructor: เห็นข้อความ + ปุ่มลองใหม่ (เรียกซ้ำ POST /teaching-records/{id}/ai-match)
            end
            AI-->>Core: รายการ [{clo_id, match_confidence}] + linked_plo_ids (ดึงจาก clo_plo_mapping ปัจจุบัน ไม่ใช่ AI เดา)
            Core->>DB: สร้าง document ใหม่ใน ai_match_result (state = draft) ต่อ CLO แต่ละข้อที่จับคู่ได้
            Note over Core,DB: [TRUST BOUNDARY / DRAFT — กฎ #3] เขียนเป็น "draft" เท่านั้น ยังไม่ใช่ข้อมูลจริง ไม่มี auto-confirm ไม่ว่า match_confidence จะสูงแค่ไหน
            Core-->>Gate: สำเร็จ พร้อมผล draft
            Gate-->>UI: 2xx + ผล draft
            UI-->>Instructor: พาไปหน้าจอ 6 (AI Review Panel) ทันที แสดงผลด้วยสถานะภาพ "draft" (เส้นขอบประ)
            loop อาจารย์ตรวจทีละรายการที่ AI จับคู่มาให้
                alt ยืนยันตรงๆ
                    Instructor->>UI: กด "ยืนยัน"
                    UI->>Gate: POST /ai-match-results/{id}/confirm
                    Gate->>Gate: ตรวจ approved + เป็น instructor_id ของวิชานั้น
                    Gate->>Core: ส่งต่อ
                    Core->>DB: ตรวจ state ปัจจุบันของ ai_match_result
                    alt state เป็น confirmed/rejected ไปแล้ว (เช่น เปิดสองแท็บพร้อมกัน)
                        Core-->>UI: 409 Conflict — state transition ไม่ถูกต้อง
                        UI-->>Instructor: แจ้งเตือน รีเฟรชรายการล่าสุด
                    else state เป็น draft/edited
                        Core->>DB: อัปเดต state=confirmed, confirmed_by, confirmed_at ใน document เดิม, ล็อก linked_plo_ids เป็น snapshot ถาวร
                        Note over Core,DB: [กฎ #3 — จุดเดียวที่ผล AI กลายเป็นข้อมูลจริง] เกิดเฉพาะเมื่ออาจารย์สั่งยืนยันเองเท่านั้น
                        Core-->>UI: 2xx
                    end
                else แก้ไขก่อนยืนยัน
                    Instructor->>UI: ปรับ match_confidence หรือปลด CLO ที่จับคู่ผิด
                    UI->>Gate: PATCH /ai-match-results/{id}
                    Gate->>Core: ส่งต่อ (ผ่านการตรวจสิทธิ์แล้ว)
                    Core->>DB: อัปเดต state=edited พร้อมค่าที่แก้ไข ใน document เดิม
                    Core-->>UI: 2xx
                    UI-->>Instructor: กลับไปกด "ยืนยัน" ในรอบถัดไปของ loop นี้
                else ปฏิเสธ
                    Instructor->>UI: กด "ปฏิเสธ"
                    UI->>Gate: POST /ai-match-results/{id}/reject
                    Gate->>Core: ส่งต่อ
                    Core->>DB: อัปเดต state=rejected ใน document เดิม
                    Core-->>UI: 2xx
                    Note over Core,DB: rejected ไม่ถูกนับเป็นหลักฐานในการคำนวณใดๆ (กฎ #3/#4)
                end
            end
            Core->>DB: re-compute clo_coverage_summary จาก ai_match_result ที่ state=confirmed เท่านั้น (AB-20/AB-21)
            Core->>Core: trigger กลไกแจ้งเตือนช่องว่างหลักฐาน (ดู §1.5 Trigger B)
            UI-->>Instructor: กลับหน้าจอ 1 (แดชบอร์ดอัปเดตค่าใหม่) หรือหน้าจอ 8 (สรุปรายวิชา)
        end
    end
```

**จุดบังคับใช้กฎทางธุรกิจในลำดับนี้**

| ขั้นตอน | กฎที่บังคับใช้ | รายละเอียด |
|---|---|---|
| ตรวจ `account_status == approved` ก่อนเข้าสู่แกนประสานงาน | กฎ #6 | เกิดที่ **ประตูควบคุมสิทธิ์** ก่อนแตะ business logic ใดๆ ทั้งสิ้น — ไม่ใช่แค่ตอน login |
| ตรวจ `course.clo_plo_ready` ก่อนสร้าง document ใหม่ใน `teaching_record` | กฎ #1 | บังคับที่ฝั่งระบบ (แกนประสานงาน) เสมอ ไม่ใช่เชื่อปุ่ม UI ที่ disable ไว้ฝั่งเดียว |
| เขียน `ai_match_result` เป็น `state=draft` เท่านั้นหลัง AI คืนผล | กฎ #3 (ข้อบังคับที่พลาดไม่ได้ที่สุด) | ไม่มีเส้นทางใดที่ AI เขียนตรงเป็น `confirmed` ได้ |
| `POST /ai-match-results/{id}/confirm` เปลี่ยน state → `confirmed` | กฎ #3 | จุดเดียวในทั้งระบบที่ผล AI กลายเป็นข้อมูลจริง ต้องมาจากคำสั่งอาจารย์ผู้สอนวิชานั้นเท่านั้น |
| เก็บไฟล์แนบผ่าน **ที่เก็บหลักฐาน/ชิ้นงาน (PDPA)** แทนที่จะให้ UI เขียนตรง | กฎ #5 | ทุกการเข้าถึงไฟล์ในภายหลังต้องผ่านแกนประสานงานตรวจสิทธิ์ก่อนเสมอ |
| `re-compute clo_coverage_summary` อ่านเฉพาะ `state=confirmed` | กฎ #3, #4 | ค่าที่แสดงในแดชบอร์ดสืบทอดความน่าเชื่อถือจากค่าที่ยืนยันแล้วเท่านั้น |

---

### 1.2 วิเคราะห์ Gap เทียบ Course Syllabus (แยกจาก CLO/PLO matching)

อ้างอิง: [[align-high-level-architecture#32-วิเคราะห์-gap-เทียบ-course-syllabus-แยกจาก-cloplo-matching|align-high-level-architecture §3.2]], `align-technical-design.md` §4.3, AB-19/AB-22/AB-23

```mermaid
sequenceDiagram
    autonumber
    actor Instructor as อาจารย์ผู้สอน
    participant UI as "ส่วนติดต่อผู้ใช้"
    participant Gate as "ประตูควบคุมสิทธิ์และสถานะบัญชี"
    participant Core as "แกนประสานงานและบังคับใช้กฎทางธุรกิจ"
    participant AI as "กลไกจับคู่/วิเคราะห์ด้วย AI"
    participant DB as "ที่เก็บข้อมูลโครงสร้าง"

    Note over Core: ต่อเนื่องจาก "บันทึกการสอนสำเร็จ" ใน §1.1 — เป็นงานที่อิสระจากการจับคู่ CLO/PLO (คนละ entity, คนละปุ่มยืนยัน, ยืนยันส่วนใดก่อนก็ได้)
    Core->>DB: ตรวจว่ามี syllabus ของวิชานี้ และ content (หัวข้อรายสัปดาห์ตาม AB-19 ส่วน ข) ไม่ว่างหรือไม่
    alt ยังไม่มี syllabus.content
        Core-->>UI: ข้าม gap analysis รอบนี้ — แสดงสถานะ "ยังไม่ได้ตั้งค่าหัวข้อรายสัปดาห์" ที่หน้าจอ 6 ส่วนที่ 2
    else มี syllabus.content แล้ว
        Core->>AI: ส่ง (ก) teaching_record.topic สะสมทั้งหมดของวิชา + (ข) syllabus.content เวอร์ชันปัจจุบัน (งานวิเคราะห์ gap — คนละงานกับจับคู่ CLO/PLO)
        opt AI ประมวลผลไม่สำเร็จ/หมดเวลา [ยืนยันแล้ว — ไม่ retry อัตโนมัติ, §4.3 Q3 เดียวกับ §1.1]
            AI-->>Core: error / timeout
            Core-->>UI: แจ้งไม่สำเร็จ พร้อมปุ่ม "ลองวิเคราะห์ใหม่"
        end
        AI-->>Core: missing_topics, extra_topics (เทียบเชิงความหมาย/semantic ไม่ใช่ string ตรงตัว)
        Core->>DB: สร้าง document ใหม่ใน syllabus_gap_result (state = draft, generated_at = ตอนนี้)
        Note over Core,DB: [TRUST BOUNDARY / DRAFT — กฎ #3] เขียนเป็น draft เสมอ แยกกล่องจากผลจับคู่ CLO/PLO ส่วนที่ 1 ของหน้าจอ 6 อย่างชัดเจน
        Core-->>UI: ผล draft
        UI-->>Instructor: แสดงที่หน้าจอ 6 ส่วนที่ 2 ด้วยสถานะภาพ "draft"
        loop อาจารย์ตรวจสอบ (รูปแบบเดียวกับ ai_match_result ใน §1.1 แต่คนละ entity/endpoint)
            alt ยืนยัน
                Instructor->>UI: กด "ยืนยัน"
                UI->>Gate: POST /syllabus-gap-results/{id}/confirm
                Gate->>Gate: ตรวจ approved + instructor_id ของวิชานั้น
                Gate->>Core: ส่งต่อ
                Core->>DB: ตรวจ state ปัจจุบัน
                alt state เป็น confirmed/rejected ไปแล้ว
                    Core-->>UI: 409 Conflict
                else state เป็น draft/edited
                    Core->>DB: อัปเดต state=confirmed, confirmed_by, confirmed_at ใน document เดิม
                    Core-->>UI: 2xx
                end
            else แก้ไขก่อนยืนยัน
                Instructor->>UI: แก้ไขรายการ missing_topics/extra_topics
                UI->>Gate: PATCH /syllabus-gap-results/{id}
                Gate->>Core: ส่งต่อ
                Core->>DB: อัปเดต state=edited ใน document เดิม
                Core-->>UI: 2xx
            else ปฏิเสธ
                Instructor->>UI: กด "ปฏิเสธ"
                UI->>Gate: POST /syllabus-gap-results/{id}/reject
                Gate->>Core: ส่งต่อ
                Core->>DB: อัปเดต state=rejected ใน document เดิม
                Core-->>UI: 2xx
            end
        end
        Note over Core,DB: เฉพาะ state=confirmed เท่านั้นที่ถูกใช้ใน AB-23 (ส่วนเปรียบเทียบการสอนจริงเทียบ syllabus ในแดชบอร์ด) และ AB-16 (Area of Improvement ในเอกสาร export, §1.4)
    end
```

**จุดบังคับใช้กฎทางธุรกิจในลำดับนี้**

| ขั้นตอน | กฎที่บังคับใช้ | รายละเอียด |
|---|---|---|
| ผลจาก AI เขียนเป็น `syllabus_gap_result.state=draft` เท่านั้น | กฎ #3 | เช่นเดียวกับ `ai_match_result` — คนละ entity แต่หลักการเดียวกัน |
| แยกกล่อง/ปุ่มยืนยันจากผลจับคู่ CLO/PLO ส่วนที่ 1 อย่างชัดเจน | กฎ #3 (ความชัดเจนของ human-in-the-loop) | อาจารย์ต้องแยกแยะได้ว่ากำลังยืนยัน "อะไร" — ไม่ปนกันจนกดยืนยันผิดรายการ |
| `POST /syllabus-gap-results/{id}/confirm` | กฎ #3 | จุดเดียวที่ผลวิเคราะห์ gap กลายเป็นข้อมูลจริงที่ใช้ในแดชบอร์ด/เอกสารได้ |
| ใช้เฉพาะ `state=confirmed` ใน AB-23/AB-16 | กฎ #3, #4 | ห้าม component ปลายทางอ่าน draft |

---

### 1.3 สมัครสมาชิก → รออนุมัติ → ผู้บริหารหลักสูตรอนุมัติ/ปฏิเสธ (E6)

อ้างอิง: [[align-high-level-architecture#33-สมัครสมาชิก-→-รออนุมัติ-→-ผู้บริหารหลักสูตรอนุมัติปฏิเสธ-e6|align-high-level-architecture §3.3]], journey "ก่อนเริ่มใช้งาน — สมัครและรออนุมัติบัญชี" / "ต้นปีการศึกษา — อนุมัติบัญชีอาจารย์ผู้สอนใหม่", navigation-flow หัวข้อ 0 และ 3

```mermaid
sequenceDiagram
    autonumber
    actor Applicant as "ผู้สมัคร (ยังไม่มีบัญชี)"
    actor Admin as ผู้บริหารหลักสูตร
    actor Instructor as "อาจารย์ผู้สอน (บัญชีเดิม ระหว่างใช้งานปกติ)"
    participant UI as "ส่วนติดต่อผู้ใช้"
    participant Gate as "ประตูควบคุมสิทธิ์และสถานะบัญชี"
    participant Core as "แกนประสานงานและบังคับใช้กฎทางธุรกิจ"
    participant DB as "ที่เก็บข้อมูลโครงสร้าง"

    rect rgb(245,245,245)
    Note over Applicant,DB: ส่วนที่ 1 — สมัครสมาชิก (หน้าจอ 0A)
    Applicant->>UI: กรอกชื่อ/อีเมล/รหัสผ่านเท่านั้น กด "สมัครใช้งาน"
    UI->>Gate: POST /auth/register (public — 1 ใน 2 endpoint ที่ไม่ต้องตรวจ account_status)
    Gate->>Core: ส่งต่อทันที (ยังไม่มีบัญชีให้ตรวจ)
    Core->>DB: ตรวจ email ซ้ำหรือไม่
    alt email ซ้ำ
        Core-->>UI: 409 Conflict
        UI-->>Applicant: แจ้งอีเมลซ้ำ ให้แก้ไขแล้วส่งใหม่
    else อีเมลไม่ซ้ำ
        Core->>DB: สร้าง document ใหม่ใน user (role=instructor, account_status=pending) ทันที
        Core-->>UI: 2xx {user_id, account_status:"pending"}
        UI-->>Applicant: พาไปหน้าจอ 0B แสดง "รออนุมัติ" — ทางตัน ไม่มีเส้นทางลัดไปหน้าจออื่นของระบบ (กฎ #6)
    end
    end

    rect rgb(245,245,245)
    Note over Admin,DB: ส่วนที่ 2 — ผู้บริหารหลักสูตรตรวจสอบและอนุมัติ/ปฏิเสธ (หน้าจอ 6, คนละแอป/บัญชี ไม่มี handoff ในแอปเดียวกัน)
    Admin->>UI: เปิดหน้าจอ 6 (คิวอนุมัติบัญชี)
    UI->>Gate: GET /admin/accounts?status=pending
    Gate->>Gate: ตรวจ account_status approved ของ Admin เอง + role=program_admin
    alt role ไม่ใช่ program_admin
        Gate-->>UI: 403 (admin-only visibility ตาม AB-26)
    else role ถูกต้อง
        Gate->>Core: ส่งต่อ
        Core->>DB: query user ที่ account_status=pending (ไม่ระบุ filter = ทั้งหมดที่เคยสมัคร)
        Core-->>UI: รายการบัญชี
        UI-->>Admin: แสดงรายการ
        Admin->>UI: กด "อนุมัติ" หรือ "ปฏิเสธ" ต่อบัญชี X (เหตุผลปฏิเสธเป็น optional)
        UI->>Gate: POST /admin/accounts/{user_id}/approve หรือ /reject
        Gate->>Core: ส่งต่อ
        Core->>DB: ตรวจ account_status ปัจจุบันของ user_id ก่อนเขียนทับ
        alt สถานะถูกเปลี่ยนไปแล้วโดยคำขออื่นก่อนหน้า (race condition — ผู้บริหารหลักสูตร 2 คนกดพร้อมกัน) [ยืนยันแล้ว — Optimistic concurrency, §4.3 Q2]
            Core-->>UI: 409 Conflict "บัญชีนี้ถูกดำเนินการไปแล้ว"
            UI-->>Admin: แจ้งเตือน รีเฟรชรายการอัตโนมัติ
        else ยังเป็น pending อยู่จริง
            Core->>DB: อัปเดต account_status=approved/rejected, approved_by, approved_at, rejection_reason(ถ้ามี) ใน document เดิม
            Core-->>UI: 2xx
            UI-->>Admin: อัปเดตรายการทันที
        end
    end
    end

    rect rgb(245,245,245)
    Note over Applicant,DB: ส่วนที่ 3 — ผู้สมัครกลับมาเช็คสถานะ (จุดตัดระหว่าง 2 บทบาทผ่านที่เก็บข้อมูลเท่านั้น ไม่ใช่ลิงก์ในแอป)
    Applicant->>UI: เปิดหน้าจอ 0B อีกครั้ง (หรือระบบ poll อัตโนมัติ)
    UI->>Gate: GET /auth/me/account-status (endpoint ที่ 2 ที่ไม่ต้องตรวจ approved)
    Gate->>Core: ส่งต่อ (ยกเว้นการตรวจ account_status เพราะ pending/rejected ต้องเรียกดูได้ตาม AB-27)
    Core->>DB: อ่านสถานะของ user ตนเองเท่านั้น (ห้ามรับพารามิเตอร์ user อื่น)
    Core-->>UI: {account_status, rejection_reason?}
    alt account_status = approved
        UI-->>Applicant: ปุ่ม "เข้าสู่หน้าแรก" ปรากฏ → หน้าจอ 1 (แดชบอร์ด)
    else account_status = rejected
        UI-->>Applicant: แจ้งถูกปฏิเสธ (+เหตุผลถ้ามี) ค้างที่หน้าจอ 0B ไม่มีทางเข้าฟีเจอร์ใดของระบบ
    else account_status = pending
        UI-->>Applicant: ยังคงรออนุมัติ
    end
    end

    rect rgb(255,245,245)
    Note over Instructor,DB: ส่วนที่ 4 — บังคับใช้กฎ #6 ซ้ำทุกคำร้องขอหลัง approved แล้ว (AB-25) ไม่ใช่แค่ตอน login
    Instructor->>UI: เรียกใช้ฟีเจอร์ใดๆ ของระบบ (เช่น เปิดหน้าจอ 5)
    UI->>Gate: request ใดๆ ที่ต้อง login
    Gate->>DB: ตรวจ account_status ล่าสุดจากที่เก็บข้อมูลจริงทุกครั้ง (ไม่ใช้ค่าที่จำไว้ตอน login)
    alt ถูกเปลี่ยนเป็น pending/rejected หรือ is_deleted=true ระหว่างใช้งาน
        Gate-->>UI: 403 ACCOUNT_NOT_APPROVED
        UI-->>Instructor: ตัดสิทธิ์ทันที พากลับหน้าจอสถานะบัญชี ไม่ปล่อยให้ทำงานต่อ
    else ยัง approved และไม่ถูกลบ
        Gate->>UI: อนุญาตให้ผ่านไปตรวจสิทธิ์ตามบทบาท/PDPA ต่อ (ดู §1.1/§1.4/§1.5)
    end
    end
```

**จุดบังคับใช้กฎทางธุรกิจในลำดับนี้**

| ขั้นตอน | กฎที่บังคับใช้ | รายละเอียด |
|---|---|---|
| `POST /auth/register` สร้างบัญชีด้วย `account_status=pending` เสมอ | กฎ #6 | ไม่มีเส้นทางใดที่สมัครแล้วได้ `approved` ทันที |
| ไม่ออก token/สิทธิ์ใดๆ หลังสมัครสำเร็จ | กฎ #6 | หน้าจอ 0B เป็นทางตันโดยเจตนา |
| `GET /admin/accounts` และ approve/reject ตรวจ `role=program_admin` เท่านั้น | admin-only visibility (AB-26) | อาจารย์ผู้สอนเรียก endpoint นี้ต้องได้ 403 |
| ตรวจ `account_status` ปัจจุบันก่อนเขียนทับตอน approve/reject | กฎ #6 + ความถูกต้องของข้อมูล | ป้องกันเขียนทับสถานะที่มีคนดำเนินการไปแล้ว (ดู Q2) |
| `GET /auth/me/account-status` ยกเว้นการตรวจ `approved` | AB-27 | 1 ใน 2 endpoint พิเศษที่บัญชี pending/rejected ต้องเรียกได้ |
| ตรวจ `account_status`/`is_deleted` ซ้ำทุกคำร้องขอหลัง approved | กฎ #6 (AB-25) | ไม่ใช่ตรวจครั้งเดียวตอน login — ถูกเปลี่ยนสถานะระหว่างใช้งานต้องตัดสิทธิ์ทันที |

---

### 1.4 ออกเอกสาร Word ที่อ้างอิงเฉพาะข้อมูลยืนยันแล้ว

อ้างอิง: [[align-high-level-architecture#34-ออกเอกสาร-word-ที่อ้างอิงเฉพาะข้อมูลยืนยันแล้ว|align-high-level-architecture §3.4]], journey "ปลายภาคการศึกษา — จัดทำหลักฐานประกันคุณภาพ/มคอ." และ "ปลายภาค/ปลายปี — จัดทำ SAR", navigation-flow เส้นทาง `8→9` และ `3→4`

```mermaid
sequenceDiagram
    autonumber
    actor Instructor as อาจารย์ผู้สอน
    actor Admin as ผู้บริหารหลักสูตร
    participant UI as "ส่วนติดต่อผู้ใช้"
    participant Gate as "ประตูควบคุมสิทธิ์และสถานะบัญชี"
    participant Core as "แกนประสานงานและบังคับใช้กฎทางธุรกิจ"
    participant DB as "ที่เก็บข้อมูลโครงสร้าง"
    participant Evid as "ที่เก็บหลักฐาน/ชิ้นงาน (PDPA)"
    participant Export as "กลไกสร้างเอกสารส่งออก"
    participant AuditLog as "บันทึกการเข้าถึงหลักฐาน"

    rect rgb(245,245,245)
    Note over Instructor,Export: เส้นทางฝั่งอาจารย์ผู้สอน (หน้าจอ 8 → 9)
    Instructor->>UI: เปิดหน้าจอ 8 (สรุปรายวิชา)
    UI->>Gate: GET .../course-summary (ตรวจ approved + instructor_id ของวิชา)
    Gate->>Core: ส่งต่อ
    Core->>DB: ตรวจว่ามี ai_match_result หรือ syllabus_gap_result ที่ state=draft/edited ค้างอยู่ของวิชานี้หรือไม่ [ยืนยันแล้ว — query สดจาก state โดยตรง ไม่ใช้ teaching_record.status เป็นตัวเช็ค, §4.3 Q4]
    alt มี draft/edited ค้างอยู่
        Core-->>UI: แจ้งว่ายังมีผล AI ที่ยังไม่ยืนยัน
        UI-->>Instructor: บังคับพากลับไปหน้าจอ 6 ก่อนเสมอ (human-in-the-loop ต้องเสร็จสิ้นก่อนออกเอกสารได้)
    else ไม่มี draft ค้างแล้ว
        Instructor->>UI: เปิดหน้าจอ 9 กด "ดาวน์โหลดเอกสาร Word"
        UI->>Gate: POST /courses/{id}/export-word
        Gate->>Gate: ตรวจ account_status approved + เป็น instructor_id ของวิชานั้น
        alt ไม่ผ่านสิทธิ์
            Gate-->>UI: 403
        else ผ่านสิทธิ์
            Gate->>Core: ส่งต่อ
            Core->>DB: ดึงเฉพาะ ai_match_result(state=confirmed), clo_coverage_summary(derived จากค่า confirmed), syllabus_gap_result(state=confirmed)
            Note over Core,DB: [TRUST BOUNDARY — กฎ #3+#4] ไม่มีทางอ่าน state=draft/edited ได้เลยในขั้นตอนนี้
            Core->>Evid: ดึงไฟล์หลักฐานที่แนบจริง (is_deleted=false) ของบันทึกการสอนที่เกี่ยวข้อง
            Core->>AuditLog: บันทึก log การเข้าถึงหลักฐานแต่ละไฟล์ (accessed_by=Instructor, action=download)
            Core->>Export: ส่งเฉพาะข้อมูล confirmed + ไฟล์หลักฐานจริงเท่านั้น (Export ไม่มีทางเชื่อมต่อ AI/draft โดยตรง)
            opt ยังไม่มีข้อมูล confirmed เลยสักรายการของวิชานี้
                Export-->>Core: เอกสาร Empty State (ระบุชัดว่ายังไม่มีข้อมูลยืนยันสำหรับวิชานี้) — ตอบสำเร็จ (2xx) ไม่ใช่ error
            end
            Export-->>Core: ไฟล์ Word พร้อมระบุกลุ่มหลักสูตร (2565/2570) กำกับชัดเจน
            Core-->>UI: 2xx {file_url}
            UI-->>Instructor: ดาวน์โหลดไฟล์ — จากจุดนี้ไฟล์ออกจากขอบเขตของระบบแล้ว
        end
    end
    end

    rect rgb(245,245,245)
    Note over Admin,Export: เส้นทางฝั่งผู้บริหารหลักสูตร (SAR, หน้าจอ 3 → 4)
    Admin->>UI: เปิดหน้าจอ 3 → 4 เลือกวิชาที่ต้องการเอกสาร
    UI->>Gate: GET /curricula/{year}/courses/{id}/export-word
    Gate->>Gate: ตรวจ approved + program_admin_curriculum_scope ครอบคลุม curriculum ของวิชานี้หรือไม่ (กฎ #5)
    alt วิชาอยู่นอก scope ที่ดูแล
        Gate-->>UI: 403/404 (ไม่เปิดเผยการมีอยู่ของข้อมูลนอก scope)
        UI-->>Admin: ไม่แสดงวิชานี้เป็นตัวเลือก
    else วิชาอยู่ใน scope
        Gate->>Core: ส่งต่อ
        Core->>DB: ดึงเฉพาะข้อมูล confirmed (เหมือนขั้นตอนฝั่งอาจารย์ด้านบน)
        Core->>Evid: ดึงไฟล์หลักฐานที่แนบจริง
        Core->>AuditLog: บันทึก log (accessed_by=Admin, action=download)
        Core->>Export: สร้างเอกสาร (เหมือนกัน)
        Export-->>Core: ไฟล์ Word
        Core-->>UI: 2xx {file_url}
        UI-->>Admin: ดาวน์โหลดไฟล์
        Note over Admin: นำไฟล์ไปส่งต่อให้งานประกันคุณภาพ (QA) ด้วยตนเองนอกระบบ — ไม่มี component ใดในระบบส่งให้ QA โดยตรง (out of scope)
    end
    end
```

**จุดบังคับใช้กฎทางธุรกิจในลำดับนี้**

| ขั้นตอน | กฎที่บังคับใช้ | รายละเอียด |
|---|---|---|
| ตรวจ draft ค้างก่อนเปิดหน้าจอ 9 | กฎ #3 | บังคับให้ human-in-the-loop เสร็จสิ้นก่อนออกเอกสารได้ (ตรวจจาก `ai_match_result`/`syllabus_gap_result.state` โดยตรงเสมอ ไม่ใช้ `teaching_record.status` — ยืนยันแล้วตาม §4.3 Q4) |
| Core ดึงเฉพาะ `state=confirmed` ส่งให้ Export | กฎ #3, #4 | Export ไม่มีทางเชื่อมต่อ AI/draft โดยตรงตามสถาปัตยกรรม |
| ดึงไฟล์หลักฐานเฉพาะที่แนบจริง (`is_deleted=false`) | กฎ #4 | ห้ามสร้างข้อมูลอ้างอิงที่ไม่มีไฟล์จริงรองรับ |
| เขียน `evidence_access_log` ทุกครั้งที่อ้างอิง/แนบหลักฐาน | กฎ #5 | ตรวจสอบย้อนหลังได้ตาม PDPA |
| ตรวจ `program_admin_curriculum_scope` ก่อนตอบฝั่งผู้บริหารหลักสูตร | กฎ #5 | จำกัดสิทธิ์เฉพาะหลักสูตรที่ดูแล |
| ไม่มี component ในระบบส่งไฟล์ให้ QA โดยตรง | Out of Scope | QA รับไฟล์นอกระบบเท่านั้น |

---

### 1.5 การแจ้งเตือน CLO ที่ยังไม่มีหลักฐาน (Gap Notification Mechanism)

อ้างอิง: [[align-high-level-architecture#2-logical-components|align-high-level-architecture §2]] (แถวกลไกแจ้งเตือนช่องว่างหลักฐาน), AB-12, กฎทางธุรกิจ #2

```mermaid
sequenceDiagram
    autonumber
    actor Instructor as อาจารย์ผู้สอน
    participant UI as "ส่วนติดต่อผู้ใช้"
    participant Gate as "ประตูควบคุมสิทธิ์และสถานะบัญชี"
    participant Core as "แกนประสานงานและบังคับใช้กฎทางธุรกิจ"
    participant GapNotify as "กลไกแจ้งเตือนช่องว่างหลักฐาน"
    participant DB as "ที่เก็บข้อมูลโครงสร้าง"

    alt บัญชียังไม่อนุมัติพยายามเปิดแดชบอร์ด
        Instructor->>UI: เปิดหน้าจอ 1
        UI->>Gate: GET /me/dashboard
        Gate->>Gate: ตรวจ account_status == approved (กฎ #6)
        Gate-->>UI: 403 ACCOUNT_NOT_APPROVED
        UI-->>Instructor: บล็อกทันที พากลับหน้าจอสถานะบัญชี — ไม่ถึงแกนประสานงาน/ไม่เห็นข้อมูลใดๆ เลย
    else บัญชี approved แล้ว — Trigger A: เปิดแดชบอร์ด
        Instructor->>UI: เปิดหน้าจอ 1
        UI->>Gate: GET /me/dashboard
        Gate->>Core: ส่งต่อ (ผ่านการตรวจสิทธิ์แล้ว)
        Core->>GapNotify: ร้องขอคำนวณ CLO ที่ยังไม่มีหลักฐานของทุกวิชาที่อาจารย์คนนี้สอน
        GapNotify->>DB: query CLO (is_deleted=false) ที่ไม่มี ai_match_result(state=confirmed) ใดๆ อ้างอิงเลย
        DB-->>GapNotify: รายการ CLO ที่ขาดหลักฐาน
        GapNotify-->>Core: gap_alerts: [{clo_id, code, course_id}]
        Core-->>UI: รวมกับค่า coverage_percent/รายวิชาอื่นของแดชบอร์ด
        UI-->>Instructor: แสดงแจ้งเตือนทันที เช่น "CLO 4 ยังไม่มีข้อมูล" ระบุตามกลุ่มหลักสูตรของวิชานั้น
    end

    Note over Core,GapNotify: Trigger B — คำนวณซ้ำแบบ near-real-time ทันทีหลังเหตุการณ์ที่กระทบผลลัพธ์ (ไม่ใช่รอรอบ batch — ตามกฎ #2)
    opt หลังบันทึกการสอนใหม่สำเร็จ (§1.1) หรือยืนยัน/ปฏิเสธ ai_match_result (§1.1) หรือปลดการผูก CLO–PLO
        Core->>GapNotify: re-evaluate CLO ที่ขาดหลักฐานของวิชานั้นทันที
        GapNotify->>DB: query ใหม่ด้วยข้อมูลล่าสุด
        GapNotify-->>Core: gap_alerts อัปเดต
        alt อาจารย์เปิดหน้าจอ 1 ค้างอยู่ในขณะนั้น
            Core-->>UI: ส่งค่าที่อัปเดตแล้ว
            UI-->>Instructor: แจ้งเตือนอัปเดตทันทีโดยไม่ต้องรีเฟรชเอง
        else ไม่ได้เปิดหน้าจอ 1 อยู่
            Note over Core,GapNotify: ค่าที่คำนวณใหม่จะถูกอ่านครั้งถัดไปที่อาจารย์เปิดหน้าจอ 1 (Trigger A) — ไม่ใช่การ push แจ้งเตือนผ่านช่องทางอื่น (ไม่ผูก mechanism เฉพาะในเอกสารชั้นนี้)
        end
    end
```

**จุดบังคับใช้กฎทางธุรกิจในลำดับนี้**

| ขั้นตอน | กฎที่บังคับใช้ | รายละเอียด |
|---|---|---|
| ตรวจ `account_status` ก่อนคำนวณ gap ใดๆ | กฎ #6 | บัญชีไม่อนุมัติเห็นข้อมูลอะไรไม่ได้เลย รวมถึงการแจ้งเตือน |
| คำนวณแบบ near-real-time ทุกครั้งที่เปิดแดชบอร์ด/มีเหตุการณ์เกี่ยวข้อง | กฎ #2 | ห้ามเป็น batch job รายวัน — ต้อง "ทันที" ตามสเปค |
| นับเฉพาะ CLO ที่ `is_deleted=false` และไม่มี `ai_match_result(state=confirmed)` | กฎ #2, #3 | ไม่นับ draft เป็น "มีหลักฐานแล้ว" |
| `GapNotify` เป็น component อ่านอย่างเดียว | ความสอดคล้องสถาปัตยกรรม | ไม่มีสิทธิ์เขียนข้อมูลใดๆ |

---

## 2. State Machine

### 2.1 `ai_match_result.state`

```mermaid
stateDiagram-v2
    [*] --> draft: AI ประมวลผลเสร็จ 1 ครั้ง (สร้างระเบียนใหม่ต่อคู่ teaching_record + clo)
    draft --> edited: อาจารย์แก้ไข match_confidence/ปลด CLO (PATCH) ก่อนยืนยัน
    edited --> edited: แก้ไขซ้ำได้หลายครั้งก่อนยืนยัน
    draft --> confirmed: อาจารย์ยืนยันตรงๆ โดยไม่แก้ไข (POST .../confirm)
    edited --> confirmed: อาจารย์ยืนยันหลังแก้ไข (POST .../confirm)
    draft --> rejected: อาจารย์ปฏิเสธตรงๆ (POST .../reject)
    edited --> rejected: อาจารย์ปฏิเสธหลังแก้ไข (POST .../reject)
    confirmed --> [*]: สถานะสุดท้าย — ล็อก linked_plo_ids เป็น snapshot ถาวร ห้ามเปลี่ยน state อีก (เรียก confirm/reject ซ้ำ = 409)
    rejected --> [*]: สถานะสุดท้าย — ไม่ถูกนับเป็นหลักฐานในการคำนวณใดๆ ห้ามเปลี่ยน state อีก (เรียก confirm/reject ซ้ำ = 409)
```

### 2.2 `syllabus_gap_result.state`

รูปแบบเดียวกับ `ai_match_result` (2.1) แต่คนละ entity/endpoint (§1.2) — คงไว้เป็นไดอะแกรมแยกเพื่อย้ำว่าเป็นวงจรสถานะอิสระจากกันจริง (ยืนยัน/ปฏิเสธแยกกันได้อิสระ):

```mermaid
stateDiagram-v2
    [*] --> draft: AI วิเคราะห์ gap เสร็จ 1 รอบ (ต่อรายวิชา)
    draft --> edited: อาจารย์แก้ไข missing_topics/extra_topics ก่อนยืนยัน
    edited --> edited: แก้ไขซ้ำได้ก่อนยืนยัน
    draft --> confirmed: ยืนยันตรงๆ
    edited --> confirmed: ยืนยันหลังแก้ไข
    draft --> rejected: ปฏิเสธตรงๆ
    edited --> rejected: ปฏิเสธหลังแก้ไข
    confirmed --> [*]: ใช้ใน AB-23 (แดชบอร์ด) และ AB-16 (Area of Improvement) — ห้ามเปลี่ยน state อีก
    rejected --> [*]: ไม่ถูกใช้ในการคำนวณ/แสดงผลใดๆ — ห้ามเปลี่ยน state อีก
```

### 2.3 `teaching_record.status` — ข้อมูลเสริมเชิงแสดงผล ไม่ใช่ตัวบังคับกฎทางธุรกิจใดๆ ในเอกสารนี้อีกต่อไป

**[ยืนยันแล้ว, §4.3 Q4]** ผู้ใช้เลือกไม่ใช้ฟิลด์นี้เป็นตัวเช็ค "มี draft ค้างหรือไม่" ที่จุดใดในระบบ — ทุกจุดที่ต้องเช็คสถานะ human-in-the-loop (เช่น §1.4 ก่อนออกเอกสาร Word) ต้อง**query สดจาก `ai_match_result.state`/`syllabus_gap_result.state` โดยตรงเสมอ** ไม่อ้างอิงฟิลด์นี้ — `teaching_record.status` จึงเหลือบทบาทเป็น**ข้อมูลเสริมเชิงแสดงผลเท่านั้น** (เช่น badge สรุปในหน้ารายการบันทึกการสอน) ไม่กระทบความถูกต้องของการบังคับใช้กฎ #3/#4 ที่จุดใดเลย เพราะการ gate จริงไม่ได้พึ่งฟิลด์นี้ (ตัดสินใจแล้ว — ไม่ใช้แนวทาง A/B เดิมที่เคยเสนอไว้เป็นตัวเช็ค gate)

```mermaid
stateDiagram-v2
    [*] --> draft_ai_pending: บันทึกการสอนสำเร็จ (ผ่านเงื่อนไข clo_plo_ready แล้ว)
    draft_ai_pending --> draft_ai_pending: ยังอยู่ระหว่างรออาจารย์ตัดสินใจ (แสดงผลเชิงข้อมูลเท่านั้น)
    draft_ai_pending --> confirmed: เงื่อนไขตามที่ทีมพัฒนากำหนดเอง — เป็นรายละเอียด implementation ที่เลือกได้อิสระ (ไม่กระทบกฎทางธุรกิจใดๆ เพราะไม่ถูกใช้ gate ที่ใดในเอกสารนี้)
    confirmed --> [*]
    note right of draft_ai_pending
        ฟิลด์นี้ไม่ถูกใช้ gate การ export (§1.4)
        หรือกฎทางธุรกิจใดๆ ในเอกสารนี้อีกต่อไป
        (ยืนยันแล้ว — §4.3 Q4)
    end note
```

### 2.4 `user.account_status`

```mermaid
stateDiagram-v2
    [*] --> pending: สมัครสำเร็จผ่าน POST /auth/register (ทันที เสมอ)
    pending --> approved: ผู้บริหารหลักสูตรกด "อนุมัติ"
    pending --> rejected: ผู้บริหารหลักสูตรกด "ปฏิเสธ"
    approved --> [*]: เข้าถึงฟีเจอร์ตามบทบาทได้ ตราบใดที่ is_deleted=false เสมอ (ตรวจซ้ำทุกคำร้องขอ — AB-25)
    rejected --> [*]: เข้าถึงข้อมูล/ฟีเจอร์ใดๆ ไม่ได้ตลอดไป (ไม่มี endpoint เปลี่ยนกลับจาก rejected ในเอกสารต้นทางปัจจุบัน)
```

> **หมายเหตุ cross-cutting**: `is_deleted` (soft-delete ตาม [[align-api-schema-design#51-soft-delete-หรือ-hard-delete|align-api-schema-design §5.1]]) เป็นฟิลด์แยกจาก `account_status` โดยสิ้นเชิง — ถ้า `is_deleted=true` บัญชีถูกปฏิเสธการ login ทันทีไม่ว่า `account_status` จะเป็นค่าใดก็ตาม (ดู §1.3 ส่วนที่ 4)

---

## 3. จุดบังคับใช้กฎทางธุรกิจต่อ Sequence — ตารางรวม (Cross-Reference)

| กฎทางธุรกิจ | Sequence ที่บังคับใช้ | จุดบังคับใช้หลัก |
|---|---|---|
| #1 ผูก CLO–PLO ก่อนบันทึกการสอน | §1.1 | Core ตรวจ `course.clo_plo_ready` ก่อนสร้าง document ใหม่ใน `teaching_record` ทุกครั้ง (409 ถ้าไม่ครบ) |
| #2 แจ้งเตือน CLO ไม่มีหลักฐานทันที | §1.5 | คำนวณ near-real-time ทุกครั้งที่เปิดแดชบอร์ด (Trigger A) หรือมีเหตุการณ์เกี่ยวข้อง (Trigger B) — ไม่ใช่ batch job |
| #3 AI เป็นค่าตั้งต้น ไม่ใช่ค่าบังคับ | §1.1, §1.2 | ผล AI ทุกงาน (จับคู่ CLO/PLO และวิเคราะห์ gap) เขียนเป็น `state=draft` เสมอ ต้องรอคำสั่งยืนยันจากอาจารย์เท่านั้นจึงเปลี่ยนเป็น `confirmed` |
| #4 เอกสารส่งออกอ้างอิงหลักฐานจริงเท่านั้น | §1.4 | Export อ่านเฉพาะข้อมูล `state=confirmed` + ไฟล์หลักฐานที่แนบจริง ไม่มีทางเชื่อมต่อ draft/AI โดยตรง |
| #5 PDPA — จำกัดสิทธิ์เข้าถึงข้อมูลส่วนบุคคล | §1.4 | ตรวจ `instructor_id`/`program_admin_curriculum_scope` ก่อน return ไฟล์หลักฐานเสมอ + เขียน `evidence_access_log` ทุกครั้งที่เข้าถึงสำเร็จ |
| #6 บัญชีต้องผ่านการอนุมัติก่อนเสมอ | §1.1, §1.3, §1.4, §1.5 | ประตูควบคุมสิทธิ์ตรวจ `account_status=='approved'` + `is_deleted==false` ก่อนทุก endpoint ที่ต้อง login (ยกเว้น `POST /auth/register`, `GET /auth/me/account-status`) — ตรวจซ้ำทุกคำร้องขอ ไม่ใช่ครั้งเดียวตอน login |
| Out of Scope — QA ไม่ใช่ user | §1.4 | ไม่มี component ใดส่งไฟล์ให้ QA โดยตรง — ผู้บริหารหลักสูตรส่งต่อเองนอกระบบเสมอ |
| Cross-cutting — แยกกลุ่มหลักสูตร 2565/2570 | §1.1 (AB-08), §1.4 | Core ส่งเฉพาะ CLO ของ curriculum เดียวกับวิชานั้นให้ AI, ตรวจ `program_admin_curriculum_scope` ก่อนตอบ export ระดับหลักสูตร |

---

## 4. รายละเอียดอื่นที่จำเป็น

### 4.1 ลำดับการ validate ข้อมูลตอนบันทึกการสอน (§1.1) แบบละเอียด

ลำดับการตรวจที่ **แกนประสานงาน** ต้องทำก่อนเขียน `teaching_record` จริง (ทุกข้อบังคับที่ฝั่งระบบ ไม่ใช่แค่ UI):

1. `account_status == 'approved'` และ `is_deleted == false` ของผู้เรียก (กฎ #6) — ทำที่ **ประตูควบคุมสิทธิ์** ก่อนถึง Core เสมอ
2. ผู้เรียกเป็น `role='instructor'` และ `instructor_id` ของ `course` นั้นตรงกับผู้เรียก (ไม่ใช่ผู้บริหารหลักสูตรหรืออาจารย์ท่านอื่น)
3. `course.clo_plo_ready == true` (กฎ #1)
4. ฟิลด์บังคับของ `teaching_record` ครบ: `topic` (ไม่ว่าง), `week_no` (จำนวนเต็ม), `taught_at` (ไม่เป็นวันที่ในอนาคต — ตาม `align-api-schema-design.md` §3.7)
5. มีไฟล์หลักฐานแนบอย่างน้อย 1 ไฟล์ (ตาม AB-05) ก่อนกด "บันทึกและให้ AI ประมวลผล" จริง
6. จึงสร้าง document ใหม่ใน `teaching_record` (status=`draft_ai_pending`) และไฟล์เข้า **ที่เก็บหลักฐาน** ในขั้นตอนเดียวกัน (ไม่ใช่แยกทำสองคำร้องที่อาจไม่สำเร็จพร้อมกัน — รายละเอียดว่า transaction นี้ atomic แค่ไหนเป็นการตัดสินใจเชิง implementation ที่ไม่ผูกในเอกสารชั้นนี้)

### 4.2 Concurrency ที่กระทบกฎทางธุรกิจ

| สถานการณ์ | ผลกระทบต่อกฎทางธุรกิจ | แนวทางที่ใช้ในเอกสารนี้ |
|---|---|---|
| อาจารย์เปิดหน้าจอ 6 สองแท็บพร้อมกัน แล้วกด "ยืนยัน"/"ปฏิเสธ" ซ้ำรายการเดียวกัน | เสี่ยงเขียนทับ state ที่ terminal แล้ว (กฎ #3) | ตรวจ state ปัจจุบันก่อนอัปเดตเสมอ — ถ้าไม่ใช่ `draft`/`edited` แล้ว ตอบ 409 Conflict (ดู §1.1, §1.2) |
| ผู้บริหารหลักสูตร 2 คนกด "อนุมัติ"/"ปฏิเสธ" บัญชีเดียวกันพร้อมกัน | เสี่ยงสถานะบัญชีขัดแย้งกัน/เขียนทับกันโดยไม่รู้ตัว (กฎ #6) | **[ยืนยันแล้ว — §4.3 Q2]** Optimistic concurrency — ตรวจ `account_status` ปัจจุบันก่อนเขียนทับเสมอ คำขอที่มาถึงทีหลังได้ 409 Conflict (ดูไดอะแกรม §1.3) |
| soft-delete `plo`/`clo` ระหว่างที่มีอาจารย์กำลังบันทึกการสอนอยู่พอดี | อาจทำให้ `course.clo_plo_ready` กลับเป็น `false` ระหว่างที่อาจารย์กรอกฟอร์มอยู่ | Core ต้อง re-evaluate `clo_plo_ready` **ที่จุดตรวจจริงตอนสร้าง document ใหม่** (§4.1 ข้อ 3) ไม่ใช่เชื่อค่าที่ UI cache ไว้ตอนโหลดหน้าจอ — ถ้าเพิ่งกลายเป็น `false` ระหว่างนั้น ต้องตอบ 409 เหมือนกรณีปกติ (ตรงกับที่ `align-api-schema-design.md` §3.2/§3.4 ระบุว่าต้อง re-evaluate ทันทีหลัง soft-delete) |

### 4.3 ประเด็นที่เคยเป็นคำถามเปิด — สถานะ: ยืนยันแล้วทั้ง 4 ข้อ

> **หมายเหตุกระบวนการ**: เครื่องมือ `AskUserQuestion` ไม่พร้อมใช้งานในบริบท subagent นี้ (เช่นเดียวกับที่ agent ก่อนหน้ารายงานไว้) จึงเขียนคำถามพร้อม 3 ทางเลือก + ข้อดี/ข้อเสียไว้ในเอกสารรุ่นก่อนหน้าแทนการถามตรง ตามแนวทางเดียวกับ [[align-api-schema-design#5-ประเด็นที่เคยเป็นคำถามเปิด|align-api-schema-design §5]] และ [[align-technical-design|align-technical-design]] §4 — **ผู้ใช้ได้ตอบกลับและยืนยันแล้วทั้ง 4 ข้อ** (เลือกตัวเลือกที่ใช้เป็นค่าตั้งต้นในไดอะแกรมไว้แล้วทั้งหมด) ตารางข้อดี/ข้อเสียยังคงเก็บไว้เป็นบันทึกเหตุผลประกอบการตัดสินใจ (decision log) ไม่ลบทิ้ง — sequence/state diagram ในหัวข้อ 1/2 ได้ปรับข้อความกำกับให้ตรงกับการตัดสินใจนี้ครบทุกจุดแล้ว

#### Q1 — การเรียกกลไก AI (จับคู่ CLO/PLO และวิเคราะห์ gap) เป็นแบบ synchronous หรือ asynchronous — **[ยืนยันแล้ว: แนวทาง A]**

**บริบท**: `align-high-level-architecture.md` §4.3 ระบุไว้แล้วว่ายังไม่ฟันธงเรื่องนี้ แต่ sequence diagram (§1.1/§1.2) ต้องเลือกรูปแบบการส่งข้อความให้ชัดเจนจึงจะวาดได้

| แนวทาง | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. Synchronous — Core เรียก AI แล้วรอผลก่อนตอบคำร้อง "บันทึกการสอน" กลับไป** (ใช้ในไดอะแกรม §1.1/§1.2 เป็นค่าตั้งต้น) | Sequence ตรงไปตรงมาที่สุด, ตรงกับ UX ที่ยืนยันแล้วว่าอาจารย์เห็นหน้าจอ 6 "ทันที" หลังกด บันทึก; ไม่ต้องมี endpoint สถานะงานเพิ่ม | ถ้า AI ประมวลผลช้า คำร้อง "บันทึกการสอน" จะค้างรอนาน/เสี่ยง timeout; รองรับการใช้งานพร้อมกันหลายคนได้แย่กว่า |
| **B. Asynchronous พร้อม client polling — บันทึก teaching_record สำเร็จและตอบกลับทันที ส่วนผล AI ประมวลผลเบื้องหลังแล้วให้ UI polling สถานะจนกว่าจะพร้อม** | คำร้องบันทึกตอบเร็วเสมอ; ทนทานต่อ AI ที่ประมวลผลช้าได้ดีกว่า | ต้องมี endpoint สถานะงานเพิ่ม (ยังไม่มีใน `align-api-schema-design.md`); ต้องออกแบบสถานะ "กำลังประมวลผล" ที่หน้าจอ 6 เพิ่ม ซึ่งต่างจากที่ prototype ปัจจุบันแสดงผลทันที |
| C. Asynchronous พร้อมแจ้งเตือนภายหลัง — บันทึกสำเร็จแล้วอาจารย์ทำงานอื่นต่อได้เลย ระบบแจ้งเตือนแยกต่างหากเมื่อผล AI พร้อม | อาจารย์ไม่ต้องรอหน้าจอค้างเลย | ขัดกับ flow ที่ prototype ยืนยันแล้วว่าหน้าจอ 5→6 ต่อเนื่องกันทันที (ต้องแก้ prototype ถ้าเลือกทางนี้); เพิ่มความซับซ้อนของกลไกแจ้งเตือนอีกชุดหนึ่ง |

**ผลการตัดสินใจ**: ผู้ใช้เลือก **แนวทาง A — Synchronous** ตรงกับที่ใช้วาดไดอะแกรม §1.1/§1.2 ไว้แล้ว (Core เรียก `AI` แบบ request/response เดียวจบ ไม่มีการ poll สถานะงานแยก) — ยืนยันเป็นพฤติกรรมจริงของระบบ

#### Q2 — การจัดการ race condition เมื่อผู้บริหารหลักสูตร 2 คนอนุมัติ/ปฏิเสธบัญชีเดียวกันพร้อมกัน — **[ยืนยันแล้ว: แนวทาง A]**

**บริบท**: ระบบอนุญาตหลายบัญชี `program_admin` ได้ (ไม่ได้ระบุว่ามีคนเดียว) — ยังไม่มีเอกสารต้นทางใดระบุพฤติกรรมเมื่อสองคำขอชนกัน

| แนวทาง | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. Optimistic concurrency — ตรวจ state ปัจจุบันก่อนเขียนทับ คำขอที่มาทีหลังได้ 409 Conflict** (ใช้ในไดอะแกรม §1.3 เป็นค่าตั้งต้น) | สอดคล้องกับ pattern 409 ที่ใช้กับ `ai_match_result`/`syllabus_gap_result` อยู่แล้ว; implement ง่าย ไม่ต้องมี lock | ผู้บริหารหลักสูตรคนที่สองอาจงงว่าทำไมกดไม่ได้ ถ้า UI ไม่รีเฟรชสถานะให้ทันที |
| **B. Last-write-wins — คำขอที่มาทีหลังเขียนทับคำขอก่อนหน้าเสมอ** | ไม่ต้องเช็ค state ก่อนเขียน, code ง่ายที่สุด | เสี่ยงให้บัญชีที่ถูกปฏิเสธแล้วกลับเป็นอนุมัติโดยไม่ตั้งใจ (หรือกลับกัน) โดยไม่มีการแจ้งเตือนใคร ขัดกับความรอบคอบที่กฎ #6 ต้องการ |
| C. Pessimistic lock — บัญชีที่มีคนเปิดพิจารณาอยู่ถูก "ล็อก" ชั่วคราว คนอื่นเห็นสถานะ "กำลังถูกตรวจสอบโดย [ชื่อ]" จนกว่าจะปล่อย | ป้องกันการชนกันได้เต็มรูปแบบ ไม่มีทางเขียนทับกันเลย | ซับซ้อนเกินความจำเป็นสำหรับปริมาณคำขอที่คาดว่าน้อย (สาขาเดียว); ต้องออกแบบ timeout ปลดล็อกกรณีลืมปิดหน้าจอ |

**ผลการตัดสินใจ**: ผู้ใช้เลือก **แนวทาง A — Optimistic concurrency** ตรงกับที่ใช้วาดไดอะแกรม §1.3 ไว้แล้ว (ตรวจ `account_status` ปัจจุบันก่อนเขียนทับ คำขอที่มาทีหลังได้ 409 Conflict) — ยืนยันเป็นพฤติกรรมจริงของระบบ

#### Q3 — นโยบาย retry เมื่อกลไก AI ประมวลผลไม่สำเร็จ/หมดเวลา — **[ยืนยันแล้ว: แนวทาง A]**

**บริบท**: `align-technical-design.md` §4 ไม่ได้ระบุพฤติกรรมเมื่อ AI Service ล้มเหลว — sequence §1.1/§1.2 มี `opt` block ที่ต้องเลือกพฤติกรรมให้ชัด

| แนวทาง | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. ไม่ retry อัตโนมัติ — พยายามครั้งเดียว ล้มเหลวแล้วแจ้งอาจารย์ทันทีพร้อมปุ่ม "ลองใหม่" ให้กดเอง** (ใช้ในไดอะแกรม §1.1/§1.2 เป็นค่าตั้งต้น) | เรียบง่ายที่สุด; อาจารย์ควบคุมจังหวะเอง ไม่เสียเวลารอ retry อัตโนมัติที่อาจไม่สำเร็จซ้ำ | ต้องให้อาจารย์กดเองทุกครั้งที่ AI ล้มเหลวชั่วคราว (transient error) เพิ่มความรำคาญเล็กน้อย |
| **B. Retry อัตโนมัติจำนวนจำกัด (เช่น สูงสุด 2 ครั้ง) ก่อนค่อยแจ้งล้มเหลวพร้อมปุ่มลองใหม่** | รองรับ transient error ได้เองโดยไม่ต้องให้อาจารย์ทำอะไร | เพิ่มเวลารอก่อนรู้ผลว่าล้มเหลวจริง; ต้องกำหนดพารามิเตอร์จำนวนครั้ง/ช่วงเวลาระหว่าง retry ซึ่งเป็นรายละเอียดที่ยังไม่มีคำตอบ |
| C. เข้าคิวงานเบื้องหลัง retry ต่อเนื่องจนสำเร็จ (หรือจนพ้นเวลาที่กำหนด เช่น 24 ชม. แล้วถือว่าล้มเหลว) แจ้งอาจารย์แบบ asynchronous เมื่อสำเร็จ/หมดเวลา | ทนทานต่อ AI Service ล่มเป็นเวลานานที่สุด อาจารย์ไม่ต้องเฝ้ารอ | ขัดกับ UX ที่ต้องเห็นผลทันทีตาม prototype (เชื่อมโยงกับ Q1 ตัวเลือก C ที่มีข้อเสียเดียวกัน); เพิ่มความซับซ้อนของระบบติดตามงานเบื้องหลัง |

**ผลการตัดสินใจ**: ผู้ใช้เลือก **แนวทาง A — ไม่ retry อัตโนมัติ + ปุ่มลองใหม่** ตรงกับที่ใช้วาดไดอะแกรม §1.1/§1.2 ไว้แล้ว (`opt` block แสดงข้อความล้มเหลว + ปุ่ม "ลองประมวลผล/วิเคราะห์ใหม่" ให้อาจารย์กดเอง ไม่มี auto-retry ใดๆ ซ่อนอยู่เบื้องหลัง) — ยืนยันเป็นพฤติกรรมจริงของระบบ

#### Q4 — เงื่อนไขที่ทำให้ `teaching_record.status` เปลี่ยนจาก `draft_ai_pending` เป็น `confirmed` — **[ยืนยันแล้ว: แนวทาง C]**

**บริบท**: `align-api-schema-design.md` §3.7 ระบุว่า "เปลี่ยนเป็น `confirmed` เมื่ออาจารย์ยืนยัน `ai_match_result` ที่เกี่ยวข้องอย่างน้อย 1 รายการ (หรือยืนยันครบตาม policy ที่ทีมพัฒนากำหนด)" — ยังไม่ฟันธง และกระทบโดยตรงต่อ §1.4 ขั้นตอน "ตรวจว่ามี draft ค้างหรือไม่ก่อน export"

| แนวทาง | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. เปลี่ยนเป็น confirmed ทันทีที่มีอย่างน้อย 1 รายการ `ai_match_result` ถูกยืนยันแล้ว** | Implement ง่ายที่สุด; สะท้อนความคืบหน้าเร็ว | อาจสื่อผิดว่าบันทึกนี้ "เสร็จสมบูรณ์" ทั้งที่ยังมี CLO อื่นค้างเป็น draft — เสี่ยงให้ §1.4 ปล่อยผ่านการ export ทั้งที่ยังมี draft ค้างจริง ถ้าใช้ฟิลด์นี้เป็นตัวเช็คเพียงอย่างเดียว |
| **B. เปลี่ยนเป็น confirmed ก็ต่อเมื่อทุกรายการ `ai_match_result` ของบันทึกนั้นถูกยืนยัน/ปฏิเสธครบ (ไม่มี draft/edited เหลือ)** | ความหมายตรงไปตรงมา ใช้เช็ค "จบ human-in-the-loop แล้ว" ได้จากฟิลด์เดียว ตรงกับที่ §1.4 ต้องการเช็ค | บันทึกที่มีหลาย CLO จับคู่มาให้จะค้างที่ `draft_ai_pending` นานกว่าถ้าอาจารย์ยืนยันทีละรายการไม่ครบทันที |
| **C. ไม่ใช้ `teaching_record.status` เป็นตัวเช็ค "มี draft ค้างหรือไม่" เลย — §1.4 query `ai_match_result`/`syllabus_gap_result` ที่ state='draft'/'edited' ของวิชานั้นตรงๆ ทุกครั้ง** | ไม่ต้องกังวลเรื่อง sync สถานะสองที่ให้ตรงกันเสมอ ลดความเสี่ยงข้อมูลไม่ตรงกัน | ต้อง query เพิ่มทุกครั้งที่เช็ค (แทนอ่านฟิลด์เดียว); `teaching_record.status` ที่มีอยู่ในสคีมาเดิมจะกลายเป็นแค่ metadata ที่ไม่ได้ใช้ gate การ export จริง |

**ผลการตัดสินใจ**: ผู้ใช้เลือก **แนวทาง C — ไม่ใช้ `teaching_record.status` เป็นตัวเช็คอีกต่อไป** — §1.4 (และทุกจุดที่ต้องเช็ค "มี draft ค้างหรือไม่") query สดจาก `ai_match_result.state`/`syllabus_gap_result.state` โดยตรงเสมอ ไม่อ้างอิงฟิลด์นี้ (ตรงกับที่ใช้วาดไดอะแกรม §1.4 ไว้แล้ว) — **ผลกระทบต่อ state machine**: `teaching_record.status` (§2.3) จึงเหลือบทบาทเป็น**ข้อมูลเสริมเชิงแสดงผลเท่านั้น ไม่ใช่ตัวบังคับกฎทางธุรกิจใดๆ ในเอกสารนี้อีกต่อไป** — เงื่อนไขที่แน่นอนว่าฟิลด์นี้ควรเปลี่ยนเป็น `confirmed` เมื่อไร (ตัวเลือก A หรือ B เดิมข้างต้น) จึงไม่ใช่คำถามที่บล็อกการออกแบบใดๆ อีกต่อไป เป็นรายละเอียด implementation ที่ทีมพัฒนาเลือกได้อิสระโดยไม่กระทบความถูกต้องของกฎ #3/#4 — ดู §2.3 ที่ปรับปรุงตามการตัดสินใจนี้แล้ว

---

เชื่อมโยง: [[align-high-level-architecture|align-high-level-architecture]] · [[align-api-schema-design|align-api-schema-design]] · [[align-technical-design|align-technical-design]] · [[../01-prototypes/align-user-journey|align-user-journey]] · [[../01-prototypes/align-navigation-flow|align-navigation-flow]] · [[../../01-requirements/01-spec/requirement-align|requirement-align]] · [[../../01-requirements/02-plan/product-backlog|product-backlog]]

ส่งต่อไปวางแผนการทดสอบใน [[../../03-testing/01-test-plan/index|01-test-plan]] (ทดสอบว่าแต่ละ sequence/state ทำงานตามที่ออกแบบไว้จริง โดยเฉพาะ error/edge-case path และจุดบังคับใช้กฎทางธุรกิจในหัวข้อ 3)

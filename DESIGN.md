# DESIGN.md — ALIGN Design System

เอกสารนี้เป็น **source of truth ด้าน visual/UX** สำหรับ ALIGN ทุก Prototype, หน้าจอ, และ component ที่สร้างขึ้น (ไม่ว่าจะโดยคนหรือโดย Sub Agent) ต้องยึดตามโทเค็นและกฎในไฟล์นี้ — ถ้าจำเป็นต้องเบี่ยงเบน ให้บันทึกเหตุผลไว้ใน `docs/05-log/` ด้วย

อ้างอิงคู่กับ [[CLAUDE.md]] (เงื่อนไขการทำงาน/กฎทางธุรกิจ) — ไฟล์นี้ตอบคำถาม "หน้าตาเป็นยังไง" ส่วน `CLAUDE.md` ตอบคำถาม "ทำอะไรได้/ไม่ได้"

---

## 1. Brand Identity & CI

### 1.1 ที่มาแรงบันดาลใจ

โลโก้อ้างอิงของโปรเจกต์นี้มาจากสาขา **New Media Communication (NMC)** — นกฟีนิกซ์สีเขียวสะท้อนแสงในวงกลม พร้อมจุดสีรอบวง:

- **สีเขียวสะท้อนแสง** = การสะท้อนปัญญาออกไปรับใช้สังคม
- **นกฟีนิกซ์** = ความอดทน มุมานะ ไม่ยอมแพ้ง่ายๆ ล้มแล้วลุกขึ้นใหม่ได้เสมอ

ความหมายทั้งสองแปลเป็นหลักการออกแบบของ ALIGN โดยตรง:

| ความหมายจากโลโก้ | แปลเป็นหลักการออกแบบ ALIGN |
|---|---|
| สะท้อนปัญญาออกไปรับใช้สังคม | ระบบต้อง "สะท้อน" ข้อมูลการสอนกลับมาให้อาจารย์เห็นภาพตัวเองชัดเจน ไม่ปิดบัง ไม่ทำให้ซับซ้อนเกินจำเป็น |
| ล้มแล้วลุกขึ้นใหม่ได้เสมอ | ช่องว่าง/gap ที่ระบบแจ้งเตือน ไม่ใช่ "ความผิด" แต่คือจุดที่ปรับปรุงได้ — โทนของ UI (สี, ข้อความ) ต้องเป็นกลาง ให้กำลังใจ ไม่ตัดสิน (ดู UX Rule 4.1) |

### 1.2 Brand Personality / Voice & Tone

โทนที่เลือกคือ **Earth Tone + Minimalist + Muji** — เงียบ สงบ ตรงไปตรงมา ไม่ตะโกน ไม่ใช้สีสันจัดจ้านดึงความสนใจเกินจำเป็น เพราะผู้ใช้หลัก (อาจารย์) ต้องใช้ระบบนี้ "หลังสอนเสร็จ" บ่อยๆ ตลอดเทอม — UI ที่สงบลดความล้าในการใช้งานซ้ำ

หลักการเขียน UI copy:

- ภาษาไทยเป็นหลัก สุภาพ ตรงประเด็น ไม่ใช้คำที่ทำให้รู้สึกถูกจับผิด (เช่น ใช้ "ยังไม่มีข้อมูล" แทน "ผิดพลาด/ล้มเหลว")
- ไม่ใช้ exclamation mark หรือคำกระตุ้นความเร่งรีบเกินจำเป็น (ไม่ทำ dark pattern / urgency)
- คำศัพท์ให้ตรงกับ glossary ใน `CLAUDE.md` เสมอ (CLO, PLO, มคอ., match %, หลักสูตร 2565/2570 ฯลฯ)

### 1.3 การปรับสีโลโก้ให้เข้ากับ Earth Tone/Minimalist

สีเขียวสะท้อนแสง (iridescent) ของโลโก้ต้นฉบับ **ไม่ใช้ตรงๆ ใน UI** เพราะขัดกับความเรียบแบบ Muji — ให้ตีความใหม่เป็น **สีเขียวมอส/สนิมเงียบ (muted sage green)** ที่ยังสื่อถึง "ธรรมชาติ/ปัญญา/การเติบโต" แต่กลมกลืนกับโทนดิน ดูส่วน [Design Tokens §2.1](#21-color-tokens) — `primary.green` คือสีนี้

### 1.4 การใช้โลโก้

โลโก้ NMC เป็น**โลโก้ของสาขา ไม่ใช่โลโก้ผลิตภัณฑ์ ALIGN** — ในเอกสาร/ต้นแบบของ ALIGN เอง:

- ใช้โลโก้ NMC เฉพาะจุด "เครดิต/ที่มาโปรเจกต์" เช่น หน้า About หรือ footer ของเอกสารส่งออก (Word/มคอ.) เท่านั้น
- หน้าจอหลักของแอประหว่างใช้งานจริง ให้ใช้ **ALIGN wordmark** แบบเรียบ (ข้อความ "ALIGN" น้ำหนักตัวอักษร Medium/Semibold สี `text.primary` หรือ `primary.green` ไม่มีไอคอนประกอบก็ได้ในระยะแรก) — **ยังไม่มีมติเรื่องไอคอน/สัญลักษณ์เฉพาะของ ALIGN เอง** ถ้าต้องการให้มี ต้องออกแบบเพิ่มเป็นงานแยก (ข้อเสนอ: เส้นโค้งเรียบง่าย 2 เส้นไขว้กันสื่อถึงการ "จับคู่" CLO↔PLO แทนรูปนกฟีนิกซ์เต็มตัว เพื่อความเรียบตามธีม Minimalist) — ยืนยันกับทีมก่อนสร้างจริง

---

## 2. Design Tokens / Design System

### 2.1 Color Tokens

**Neutral / Base (Muji earth tone)**

| Token | Hex | ใช้กับ |
|---|---|---|
| `bg.base` | `#F6F2EA` | พื้นหลังหลักของแอป (ครีมอุ่น) |
| `bg.surface` | `#FDFBF7` | พื้นผิวการ์ด/panel (ขาวอุ่นอ่อนกว่า bg.base เล็กน้อย) |
| `bg.surface-sunken` | `#EFE9DD` | พื้นที่ย่อย/แถบ input ที่ไม่ active |
| `border.default` | `#E2D9C8` | เส้นขอบ, divider |
| `border.strong` | `#C9BBA0` | เส้นขอบที่ต้องการเน้น (เช่น input ตอน focus) |
| `text.primary` | `#2B2620` | ข้อความหลัก (น้ำตาลเข้มเกือบดำ ไม่ใช้ #000 ตรงๆ) |
| `text.secondary` | `#6B6255` | ข้อความรอง/label — **ห้ามใช้กับข้อความสำคัญ** (คอนทราสต์ต่ำกว่า primary) |
| `text.disabled` | `#B3AA9A` | ข้อความ/ไอคอนที่ disabled |

**Brand Accent (จากโลโก้ ตีความใหม่เป็น earth tone)**

| Token | Hex | ใช้กับ |
|---|---|---|
| `primary.green` | `#5B6E4F` | ปุ่มหลัก, ลิงก์, ไอคอนสำคัญ, สถานะ "ยืนยันแล้ว/confirmed" |
| `primary.green-dark` | `#46543D` | hover/active state ของ primary.green |
| `primary.green-tint` | `#E8ECE2` | พื้นหลังอ่อนสำหรับ selected/highlight state |

**Semantic (โทนดิน ไม่ใช้สีสดจัด)**

| Token | Hex | ความหมาย | ใช้กับ |
|---|---|---|---|
| `status.confirmed` | `#5B6E4F` (= primary.green) | ข้อมูลผ่านการยืนยันจากอาจารย์แล้ว | badge, border แบบเส้นทึบ |
| `status.draft` | `#B8863C` | ผลจาก AI ที่ยังไม่ยืนยัน (human-in-the-loop) | badge, border **เส้นประ** (ดู UX Rule 4.1) |
| `status.draft-tint` | `#F3E6CE` | พื้นหลังอ่อนของ draft badge/card | — |
| `status.gap` | `#A65D45` | CLO ที่ไม่มีหลักฐาน / gap เทียบ syllabus | แจ้งเตือน, ไอคอน |
| `status.gap-tint` | `#F5E3DC` | พื้นหลังอ่อนของ gap alert | — |
| `status.info` | `#6E7B8B` | ข้อความ/แท็กข้อมูลทั่วไปที่ไม่ใช่ผลตรวจสอบ | — |

**Curriculum-year Tags** (ต้องแยกให้เห็นชัดทุกที่ที่มี CLO/PLO/รายวิชาปรากฏ — ดู [technical design §2](../docs/02-design/02-technical/align-technical-design.md))

| Token | Hex | ใช้กับ |
|---|---|---|
| `curriculum.2565` | `#A98F72` (taupe) | แท็กหลักสูตร 2565 (เก่า) |
| `curriculum.2565-tint` | `#F1E9DD` | พื้นหลังแท็ก 2565 |
| `curriculum.2570` | `#8A9A78` (moss) | แท็กหลักสูตร 2570 (ใหม่) |
| `curriculum.2570-tint` | `#EDF1E7` | พื้นหลังแท็ก 2570 |

> กฎ: ห้ามใช้สีสองกลุ่มหลักสูตรสลับกันหรือใช้ปนกับ semantic colors อื่น (เช่น ห้ามเอา `status.gap` สีเดียวกับ curriculum tag) เพื่อไม่ให้ผู้ใช้สับสนระหว่าง "สถานะ" กับ "กลุ่มหลักสูตร"

### 2.2 Typography Tokens

- **Font หลัก (รองรับไทย+ละติน ในฟอนต์เดียว)**: `IBM Plex Sans Thai Looped` (น้ำหนัก Regular/Medium/SemiBold) — เลือกแบบ Looped เพราะโค้งมนอบอุ่นแบบ Muji มากกว่าตัวเหลี่ยม
- **Font ตัวเลข/รหัส** (เช่น AB-01, T-001, match %): `IBM Plex Mono` — ใช้เฉพาะรหัสอ้างอิง/ตัวเลขที่ต้องอ่านแม่นยำ ไม่ใช้กับข้อความทั่วไป

| Token | Size / Line-height | Weight | ใช้กับ |
|---|---|---|---|
| `text.display` | 32 / 40 | SemiBold | ตัวเลข % ความสอดคล้องรวมหน้าแรก |
| `text.h1` | 24 / 32 | SemiBold | หัวข้อหน้า |
| `text.h2` | 20 / 28 | Medium | หัวข้อ section |
| `text.h3` | 16 / 24 | Medium | หัวข้อย่อย/หัว card |
| `text.body` | 16 / 24 | Regular | เนื้อหาหลัก |
| `text.body-sm` | 14 / 20 | Regular | label, meta, caption ในตาราง |
| `text.caption` | 12 / 16 | Regular | timestamp, หมายเหตุเล็ก |

กฎ: **ห้ามใช้ Bold (700+)** ในทั้งระบบ ยกเว้นตัวเลข `text.display` ที่ SemiBold ก็เพียงพอ — ความหนาที่มากเกินขัดกับความเรียบแบบ Muji

### 2.3 Spacing & Layout Tokens

grid ฐาน 8px:

| Token | Value |
|---|---|
| `space.xs` | 4px |
| `space.sm` | 8px |
| `space.md` | 16px |
| `space.lg` | 24px |
| `space.xl` | 32px |
| `space.2xl` | 48px |
| `space.3xl` | 64px |

- Card padding มาตรฐาน: `space.lg` (24px)
- ระยะห่างระหว่าง section: `space.xl`–`space.2xl`
- หลักการ Muji: **whitespace เยอะกว่าที่รู้สึกว่าพอ** โดยเฉพาะหน้าที่ข้อมูลเยอะ (แผนที่ CLO×สัปดาห์) ให้เว้นบรรทัด/ margin มากกว่าอัดแน่น

### 2.4 Radius & Elevation

| Token | Value | ใช้กับ |
|---|---|---|
| `radius.sm` | 4px | ปุ่ม, input, badge |
| `radius.md` | 8px | card |
| `radius.lg` | 12px | modal, panel ใหญ่ |
| `shadow.card` | `0 1px 2px rgba(43,38,32,0.06)` | เงาบาง แทบไม่เห็น ใช้แทนเส้นขอบเมื่อพื้นหลังใกล้เคียงกัน |

กฎ: ไม่ใช้เงาหนัก/ดรอปชาโดว์เข้ม — Muji เน้นความแบน (flat) ใช้ `border.default` แยกพื้นที่แทนเงาเป็นหลัก ใช้ `shadow.card` เสริมเบาๆ เฉพาะ element ที่ลอยเหนือพื้น (dropdown, modal)

### 2.5 Iconography

- สไตล์เส้น (line icon), stroke width สม่ำเสมอ 1.5px, สีเดียว (monochrome ใช้ `text.primary` หรือ `text.secondary`) — ไม่ใช้ icon แบบ filled/gradient/หลายสีในตัวเดียว ยกเว้นจุดสี status/curriculum tag ตามโทเค็นด้านบน

---

## 3. UI Components & Patterns

รายการ component หลักที่ Prototype ต้องมี พร้อม state ที่ต้องรองรับ (map กับ Business Rules ใน `CLAUDE.md` และ backlog):

| Component | คำอธิบาย / State ที่ต้องมี |
|---|---|
| **Stat Tile** | ตัวเลขใหญ่ (`text.display`) + label — ใช้แสดง % ความสอดคล้องรวม (AB-11) ต้องระบุว่าเป็นค่าที่ "ยืนยันแล้ว" เท่านั้น (ไม่ผสม draft) |
| **Curriculum Tag / Chip** | ใช้ `curriculum.2565` / `curriculum.2570` token — ต้องปรากฏทุกที่ที่มีข้อมูล CLO/PLO/รายวิชา |
| **Match % Indicator** | progress bar หรือ radial — 2 สถานะ: **Draft** (เส้นขอบประ, สี `status.draft`) กับ **Confirmed** (เส้นทึบ, สี `status.confirmed`) ต้องแยกกันชัดเจนที่สุดใน component เดียว เพราะเป็นหัวใจของกฎ human-in-the-loop |
| **Gap Alert Banner** | แจ้งเตือน CLO ที่ไม่มีหลักฐาน / gap เทียบ syllabus — โทน `status.gap` แต่ข้อความเป็นกลาง ไม่ตำหนิ (ดู UX Rule 4.1) |
| **Evidence Attachment List** | รายการไฟล์แนบ พร้อม action ลบ/ดูตัวอย่าง — ต้องเช็คสิทธิ์ก่อนแสดง thumbnail เสมอ (PDPA, ดู UX Rule 4.3) |
| **AI Review Panel** | panel ยืนยัน/แก้ไขผล AI (match%, ความถี่, gap analysis) ก่อนบันทึกจริง — ปุ่มหลักต้องเป็น "ยืนยัน" ไม่ใช่ auto-save, มีปุ่ม "แก้ไข" แยกชัดเจน |
| **CLO × Week Grid** | ตารางความหนาแน่นสูง — ใช้ `space.sm` ภายในเซลล์แต่เว้น `space.lg` รอบตาราง เพื่อไม่ให้อึดอัด |
| **Course/Row List Item** | รายวิชา + curriculum tag + สถานะความครบถ้วน CLO–PLO |
| **Word Export Panel** | ปุ่ม export + toggle รวม/ไม่รวม Area of Improvement (AB-18) — แสดงเฉพาะข้อมูลที่ confirmed แล้วเท่านั้น |
| **Empty State** | ใช้เมื่อยังไม่มีข้อมูล (เช่น ยังไม่ตั้งค่า CLO/PLO) — ข้อความชวนทำขั้นต่อไป ไม่ใช้โทนลบ/ผิดพลาด |

---

## 4. UX Guidelines & Rules

1. **Draft ≠ Confirmed ต้องแยกด้วยตาเปล่าได้ทันที** — ทุกที่ที่แสดงผลจาก AI (match %, ความถี่, gap analysis, การเชื่อมโยง PLO) ต้องใช้ `status.draft` + เส้นขอบประ จนกว่าอาจารย์จะกดยืนยัน ห้ามให้ draft กับ confirmed ใช้ visual เดียวกัน (สอดคล้อง `CLAUDE.md` เงื่อนไข #3)
2. **ระบุกลุ่มหลักสูตรเสมอ** — ทุกจุดที่มี CLO/PLO/รายวิชาปรากฏต้องมี curriculum tag (2565/2570) กำกับ ห้ามละไว้แม้ในหน้าที่ดูรายวิชาเดียว
3. **โทนภาษาเป็นกลาง ให้กำลังใจ ไม่ตัดสิน** — ข้อความแจ้ง gap/ไม่มีหลักฐาน ต้องสื่อเป็น "จุดที่ยังไม่มีข้อมูล" ไม่ใช่ "ความผิดพลาด" (เชื่อมโยงความหมายนกฟีนิกซ์ §1.1)
4. **หลักฐาน/ชิ้นงานเป็นข้อมูลอ่อนไหว (PDPA)** — UI ต้องเช็คสิทธิ์ก่อนแสดง thumbnail/preview เสมอ แม้ใน error state ก็ห้าม leak ชื่อไฟล์หรือ preview ให้ผู้ใช้ที่ไม่มีสิทธิ์
5. **Whitespace มาก่อนความหนาแน่น** — เมื่อต้องเลือกระหว่างอัดข้อมูลให้ครบในหน้าจอเดียว กับเว้นที่ว่างให้สบายตา ให้เลือกอย่างหลัง ตัดข้อมูลรองออกไปหน้าย่อยแทน
6. **ไม่ใช้สีสัน/แอนิเมชันดึงความสนใจเกินจำเป็น** — ไม่มี badge กระพริบ, ไม่มี auto-popup แจ้งเตือนแบบ modal บังคับปิด ให้ใช้ banner แบบ inline แทน
7. **Contrast**: ข้อความบน `bg.base`/`bg.surface` ต้องใช้ `text.primary` เป็นค่าเริ่มต้น ใช้ `text.secondary` เฉพาะ label รองที่ไม่ใช่เนื้อหาสำคัญ — ต้องตรวจสอบ contrast ratio จริงตอน implement (อย่างน้อย WCAG AA สำหรับข้อความ) เพราะโทนเอิร์ธโทนมีคอนทราสต์ต่ำกว่าสีขาว-ดำล้วนโดยธรรมชาติ
8. **ภาษาไทยเป็นภาษาหลักของ UI** ให้ตรงกับ glossary ใน `CLAUDE.md` เสมอ — คำศัพท์เทคนิค (CLO, PLO, มคอ., match %) ไม่แปลเป็นไทยทื่อๆ ให้ใช้ทับศัพท์ตามที่เอกสารอื่นในโปรเจกต์ใช้อยู่แล้ว

---

## 5. เชื่อมโยง

- ยึดคู่กับเงื่อนไขการทำงานใน [[CLAUDE.md]]
- นำไปใช้สร้าง/ปรับ [[docs/02-design/01-prototypes/align-app-screens|align-app-screens]]
- อ้างอิง entity/state (`ai_match_result`, `syllabus_gap_result`, curriculum grouping) จาก [[docs/02-design/02-technical/align-technical-design|align-technical-design]] เพื่อให้ token/state ในดีไซน์ตรงกับข้อมูลจริงที่ backend ส่งมา

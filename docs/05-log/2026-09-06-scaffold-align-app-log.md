# 2026-09-06: Scaffold โปรเจกต์ Next.js จริง (`align-app/`) ผูก Firebase project `nmc-align-2026`

## บริบท

หลัง `align-api-schema-design.md` และ `align-tech-stack.md` ยืนยันครบทุกคำถามเปิดแล้ว (ดู [[2026-09-06-technical-design-firestore-conversion-completion-log|log ก่อนหน้า]]) ผู้ใช้สร้าง Firebase project จริงชื่อ `nmc-align-2026` (Auth/Firestore/Storage) และตัดสินใจเริ่ม scaffold แอปจริงแทนที่จะรอทำทีหลัง — repo นี้จึงไม่ใช่ documentation-only vault ล้วนอีกต่อไป

## การตัดสินใจที่ผู้ใช้ยืนยัน

- **TypeScript** (ไม่ใช่ JavaScript) — `align-tech-stack.md` ระบุแค่ Next.js/Tailwind โดยไม่ฟันธงภาษา เพราะทีมไม่ถนัดภาษาใดเป็นการเฉพาะ ผู้ใช้เลือก TypeScript เพื่อจับข้อผิดพลาดตั้งแต่ build-time

## สิ่งที่สร้าง

- **`align-app/`** — Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + ESLint, สร้างด้วย `create-next-app@latest --typescript --tailwind --eslint --app --src-dir`
- ติดตั้ง `firebase` (client SDK) และ `firebase-admin` (server SDK) เพิ่มจาก default ของ `create-next-app`
- `src/lib/firebase/client.ts` — init Firebase client app จาก `NEXT_PUBLIC_FIREBASE_*` env vars, export `auth`/`db`/`storage`, และ `getFirebaseAnalytics()` (guard ไม่ให้รันฝั่ง server เพราะ Analytics ใช้ได้เฉพาะ browser)
- `src/lib/firebase/admin.ts` — init Firebase Admin app จาก service account JSON ใน `FIREBASE_SERVICE_ACCOUNT_KEY`, export `adminAuth`/`adminDb`/`adminStorage`, กัน import ผิดฝั่งด้วย `import "server-only"` — ไฟล์นี้คือจุดที่ Access Gate/Core Orchestration (Server Action/API Route) จะเรียกใช้ตรวจกฎ #1/#3/#5 ต่อไป
- `.env.local` (ไม่ commit — อยู่ใน `.gitignore` ของ `create-next-app` อยู่แล้วผ่าน `.env*`) — ใส่ค่า config จริงของ `nmc-align-2026` ที่ผู้ใช้ให้มา ยกเว้น `FIREBASE_SERVICE_ACCOUNT_KEY` ที่ยังว่างไว้ (ต้องไป generate private key จาก Firebase console เอง)
- `.env.example` — เทมเพลตชื่อตัวแปรเดียวกันแบบไม่มีค่าจริง สำหรับ onboard เครื่องใหม่/สมาชิกใหม่

## ยืนยันแล้วว่าใช้งานได้

- `npx tsc --noEmit` ผ่าน (ไม่มี type error)
- `npm run lint` ผ่าน (ไม่มี lint error)
- `npm run build` ผ่านสำเร็จ (`next build` ด้วย Turbopack)

## ยังไม่ได้ทำ (ต่อยอดภายหลัง)

- ยังไม่ได้ generate/ใส่ `FIREBASE_SERVICE_ACCOUNT_KEY` จริง — `adminDb`/`adminAuth`/`adminStorage` จะ throw ทันทีที่ import จนกว่าจะใส่ค่า
- ยังไม่มี `firestore.rules`/`storage.rules`/`firebase.json`/collection structure จริงตาม §2.2 ของ `align-api-schema-design.md` — ยังเป็นแค่ SDK boilerplate เปล่าๆ
- ยังไม่ได้ตัดสินใจ deploy ผ่าน Firebase App Hosting หรือ Cloud Functions 2nd gen (align-tech-stack.md §2.2 แนะนำ App Hosting เป็น default แต่ยังไม่ได้ทดสอบ compatibility จริง)

## เอกสารที่แก้ไข/สร้าง

- สร้างใหม่: `align-app/` (ทั้งโปรเจกต์ Next.js)
- สร้างใหม่: `docs/05-log/2026-09-06-scaffold-align-app-log.md` (บันทึกนี้)

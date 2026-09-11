# 2026-09-11: Deploy ขึ้น Vercel แทน Firebase App Hosting (ยังไม่ upgrade Blaze)

## บริบท

ต้องการ URL สาธารณะที่เปิดได้โดยไม่ต้อง login เพื่อให้คนนอกทดสอบ/ตรวจงานได้ ตามแผนเดิมใน `align-tech-stack.md` §2.2 ควร deploy ขึ้น **Firebase App Hosting** — แต่ App Hosting บังคับต้อง upgrade project `nmc-align-2026` เป็น **Blaze plan** ก่อนถึงจะ enable API ได้เลย (`firebaseapphosting.googleapis.com` ไม่ยอม enable บน Spark/free plan) ผู้ใช้ยืนยันว่ายังไม่พร้อม upgrade ตอนนี้ (สอดคล้องกับการตัดสินใจเลื่อน Blaze เดิมใน [[2026-09-06-firebase-storage-blaze-deferred-log|2026-09-06-firebase-storage-blaze-deferred-log]])

## การตัดสินใจที่ผู้ใช้ยืนยัน

**Deploy ขึ้น Vercel แทน** (ฟรี ไม่ต้องผูกบัตร รองรับ Next.js Server Actions/API Routes เต็มรูปแบบ) — เบี่ยงจาก `align-tech-stack.md` ที่เลือก Firebase App Hosting ไว้ แต่ Firebase project (Auth/Firestore/Storage) ยังใช้ `nmc-align-2026` เหมือนเดิมทุกอย่าง เปลี่ยนแค่ชั้น hosting เท่านั้น — env vars (`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_KEY`) ย้ายไปตั้งใน Vercel Project Settings แทน `apphosting.yaml`

URL ที่ deploy จริง: **https://align-app-sage.vercel.app**

## ปัญหาที่เจอระหว่าง deploy และวิธีแก้ (ไว้เป็นบันทึกกันงงรอบหน้า)

1. **`jose` v6 (ESM-only) ชนกับ `jwks-rsa`** (dependency ของ `firebase-admin/auth`) — ทำให้ทุกหน้า/route ที่แตะ Firebase Auth (`/login` ผ่าน `POST /api/session`, `/courses`, `/admin/accounts`, `/account-status`) error 500 บน Vercel serverless runtime (`ERR_REQUIRE_ESM`) แก้ด้วย `"overrides": {"jose": "^4.15.9"}` ใน `align-app/package.json` (jose v4 ยังมี CJS build)
2. **Vercel บล็อก deployment ทุกตัวแบบเงียบๆ** (`readyState: BLOCKED`, `COMMIT_AUTHOR_REQUIRED`) เพราะ git commit author email (`lamduan.mfu.ac.th`) ไม่ตรงกับบัญชี GitHub ที่ Vercel เชื่อม (`nmcup13-cmd` / `nmcup13@gmail.com`) — CLI แสดงผลแบบไม่ชัดเจนว่า "Building…"/status "UNKNOWN" ค้างตลอด ไม่ได้บอก error ตรงๆ ต้องเช็คผ่าน Vercel REST API (`readyState`/`readyStateReason`) ถึงเจอสาเหตุจริง แก้โดยตั้ง local git config ของ repo นี้เป็น `nmcup13-cmd <nmcup13@gmail.com>` (คอมมิตเก่าที่ใช้ email เดิมยังอยู่เหมือนเดิม ไม่ได้แก้ history)
3. **Root Directory ของ Vercel project ไม่ได้ตั้งค่า** — พอ deploy ผ่าน git integration (clone ทั้ง repo) หา Next.js app ไม่เจอเพราะแอปจริงอยู่ใน `align-app/` ไม่ใช่ repo root (`errorCode: missing_pages_app`) แก้โดยตั้ง Project Settings → Root Directory = `align-app`

## ผลกระทบ

- `README.md` อัปเดตลิงก์ URL ออนไลน์แล้ว
- Deploy ต่อจากนี้ทำได้ 2 ทาง: `git push` ไป `main` (ให้ Vercel build บนคลาวด์เอง — แนะนำ เพราะไม่พึ่งเน็ต/เครื่อง local) หรือ `npx vercel deploy --prod` จากในเครื่อง `align-app/`
- ถ้าจะ upgrade Blaze ในอนาคตและอยากย้ายกลับไป Firebase App Hosting ตาม `align-tech-stack.md` เดิม ก็ยังทำได้ — `apphosting.yaml`/`firebase.json` ที่ตั้งไว้ก่อนหน้ายังอยู่ครบ ไม่ได้ลบ

## เอกสารที่แก้ไข/สร้าง

- แก้ไข: `align-app/package.json`, `align-app/package-lock.json` (jose override)
- แก้ไข: `align-app/.gitignore` (เพิ่ม `.vercel`, `.env*`)
- แก้ไข: `README.md` (เพิ่มลิงก์ URL ออนไลน์)
- แก้ไข: `CLAUDE.md` (เพิ่มรายละเอียด auth model และ deviation ที่ยืนยันแล้ว)
- สร้างใหม่: `docs/05-log/2026-09-11-deploy-to-vercel-log.md` (บันทึกนี้)

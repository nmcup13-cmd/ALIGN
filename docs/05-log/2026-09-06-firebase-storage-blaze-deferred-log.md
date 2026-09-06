# 2026-09-06: เลื่อนการเปิด Cloud Storage ออกไปก่อน — ต้อง upgrade เป็น Blaze plan

## บริบท

ระหว่างทดสอบ Firebase Admin SDK บน project `nmc-align-2026` พบว่า Firestore และ Authentication เชื่อมต่อสำเร็จแล้ว แต่ **Cloud Storage for Firebase ไม่มี default bucket** (`bucketExists: false`) — ตรวจสอบแล้วพบว่า Google กำหนดให้ต้อง **upgrade project เป็น Blaze plan (pay-as-you-go, ต้องผูกบัตรเครดิต)** ก่อนจึงจะสร้าง default Storage bucket ได้ ไม่ว่าจะใช้งานเกิน free tier จริงหรือไม่

เรื่องนี้ตรงกับคำถามเปิดเรื่อง **งบประมาณ** ที่ `align-tech-stack.md` (รอบสัมภาษณ์ที่ 1) เคยทิ้งไว้ว่า "ยังไม่ทราบ/ตัดสินใจทีหลัง" — ยังไม่เคยถูกยืนยัน

## การตัดสินใจที่ผู้ใช้ยืนยัน

**ยังไม่ upgrade เป็น Blaze ตอนนี้** — พัฒนาต่อด้วย Firestore + Authentication ก่อน (พอสำหรับ E1 ตั้งค่า CLO/PLO, E3 AI matching, E6 สมัคร/อนุมัติบัญชี) แล้วค่อย upgrade เมื่อถึงจังหวะที่ต้องทำ **E2 (บันทึกการสอน + แนบหลักฐาน)** จริง เพราะ `evidence` entity ต้องพึ่ง Firebase Cloud Storage โดยตรง (ดู `align-api-schema-design.md` §3.8)

## ผลกระทบ

- ฟีเจอร์ที่ต้องใช้ Storage (แนบไฟล์หลักฐาน E2) **ยังทำไม่ได้จนกว่าจะ upgrade Blaze**
- ฟีเจอร์อื่นที่ไม่ต้องใช้ Storage พัฒนาต่อได้ตามปกติ ไม่ถูกบล็อก
- `src/lib/firebase/admin.ts` (`adminStorage`) ยังคง initialize ได้ปกติ (ไม่ throw) แค่ bucket ยังไม่มีอยู่จริงจนกว่าจะ upgrade — โค้ดที่เขียนเรียก Storage จริงจะ error ตอน runtime ไม่ใช่ตอน build

## เอกสารที่แก้ไข/สร้าง

- สร้างใหม่: `docs/05-log/2026-09-06-firebase-storage-blaze-deferred-log.md` (บันทึกนี้)

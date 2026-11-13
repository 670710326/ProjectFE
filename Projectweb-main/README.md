# Manga Reader

เว็บอ่านมังงะด้วย React + Vite เชื่อมต่อ MangaDex API ผ่าน proxy `/mdx` และเชื่อม Go Backend ผ่าน `/api`

## เริ่มใช้งาน Frontend

```bash
npm install
npm run dev
```

เปิดเว็บที่ `http://127.0.0.1:5173`

## เริ่มใช้งาน Backend

1. ติดตั้ง Go และ PostgreSQL
2. สร้างฐานข้อมูล `mangahub`
3. รันคำสั่ง SQL ใน `Projectweb-BE-main/schema.sql`
4. สร้างไฟล์ `.env` จาก `.env.example` และกำหนด `DATABASE_URL`, `JWT_SECRET` (อย่างน้อย 32 ตัวอักษร)
5. รัน `go run .` ภายในโฟลเดอร์ Backend

Backend ใช้ `http://127.0.0.1:8000` ตามค่า Proxy ใน `vite.config.js`

## หมายเหตุ

- หน้าแรกและหน้ารายการค้นหาข้อมูลจริงจาก MangaDex API ไม่ใช้รายการมังงะตัวอย่าง
- รายการมังงะ รายละเอียด ตอน และรูปหน้าอ่าน ดึงจาก MangaDex โดยตรงผ่าน proxy `/mdx`
- ระบบสมาชิกและ API อื่น ๆ ใช้ Go Backend ผ่าน `/api`
- ถ้า deploy บน Vercel ให้ใช้ rewrites ใน `vercel.json`
- MangaDex อาจจำกัดจำนวนคำขอ หากพบ HTTP 429 ให้รอสักครู่ก่อนลองใหม่


## ส่งงาน / เปิดโปรเจกต์บนเครื่องอื่น

1. แตกไฟล์ ZIP แล้วเปิดโฟลเดอร์ `Projectweb-main` ใน VS Code
2. ติดตั้ง Node.js เวอร์ชัน LTS
3. เปิด Terminal ในโฟลเดอร์ Frontend แล้วรัน `npm install`
4. รัน `npm run dev` และเปิด URL ที่ Vite แสดง (ปกติคือ `http://localhost:5173`)
5. ไม่ต้องใส่ API key สำหรับ MangaDex เพราะข้อมูลสาธารณะเรียกผ่าน proxy `/mdx`

หากต้องการใช้ระบบสมาชิก/ฐานข้อมูล ให้ตั้งค่า PostgreSQL และ Backend ตามหัวข้อด้านบนแยกต่างหาก

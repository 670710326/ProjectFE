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

- รายการมังงะ รายละเอียด ตอน และรูปหน้าอ่าน ดึงจาก MangaDex โดยตรงผ่าน proxy `/mdx`
- ระบบสมาชิกและ API อื่น ๆ ใช้ Go Backend ผ่าน `/api`
- ถ้า deploy บน Vercel ให้ใช้ rewrites ใน `vercel.json`
- MangaDex อาจจำกัดจำนวนคำขอ หากพบ HTTP 429 ให้รอสักครู่ก่อนลองใหม่

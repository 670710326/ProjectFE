// แถบเตือนตอนเรียก MangaDex ไม่สำเร็จ (แสดงสาเหตุจริงจาก error)
export default function DemoBanner({ show, error }) {
  if (!show) return null;
  return (
    <div className="banner">
      เชื่อมต่อ MangaDex ไม่ได้ในตอนนี้
      {error?.message ? `: ${error.message}` : ''}
      {' '}(ลองเช็ก proxy ใน vite.config.js หรือ rewrites ใน vercel.json)
    </div>
  );
}

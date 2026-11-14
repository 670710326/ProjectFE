import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ฟอร์มรีวิว: ต้องล็อกอินก่อนถึงจะเขียนได้ ชื่อที่แสดงมาจากบัญชีผู้ใช้ (ไม่ต้องกรอกเอง)
// ถ้าเป็นแอดมินจะมีป้าย "แอดมิน" ต่อท้ายชื่อ
// ตอนนี้เก็บใน localStorage ของเครื่องก่อน ถ้าต่อ Backend จริงให้ฝั่งเซิร์ฟเวอร์ดึงชื่อและ role จาก token เอง
// (ดู docs/api-wishlist.md)
export default function ReviewForm({ mangaId }) {
  const { member, loading } = useAuth();
  const key = `reviews:${mangaId}`;
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [reviews, setReviews] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  });

  const submit = (e) => {
    e.preventDefault();
    if (!member || !text.trim()) return;
    const next = [
      {
        name: member.display_name,
        role: member.role,
        rating,
        text: text.trim(),
        at: Date.now(),
      },
      ...reviews,
    ];
    setReviews(next);
    localStorage.setItem(key, JSON.stringify(next));
    setText('');
    setRating(5);
  };

  return (
    <section>
      <h3>รีวิว</h3>

      {loading ? (
        <p className="muted">กำลังตรวจสอบการเข้าสู่ระบบ…</p>
      ) : member ? (
        <form className="review" onSubmit={submit}>
          <p className="muted">
            รีวิวในชื่อ <strong>{member.display_name}</strong>
            {member.role === 'admin' && <span className="admin-label">แอดมิน</span>}
          </p>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{'★'.repeat(n)}</option>
            ))}
          </select>
          <textarea rows={3} placeholder="รู้สึกยังไงกับเรื่องนี้" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="primary" type="submit">ส่งรีวิว</button>
        </form>
      ) : (
        <p className="muted">
          <Link to="/login">เข้าสู่ระบบ</Link> ก่อนถึงจะเขียนรีวิวได้
        </p>
      )}

      {reviews.map((r) => (
        <div className="review-item" key={r.at}>
          <strong>{r.name}</strong>
          {r.role === 'admin' && <span className="admin-label">แอดมิน</span>}{' '}
          <span>{'★'.repeat(r.rating)}</span>
          <div>{r.text}</div>
        </div>
      ))}
    </section>
  );
}

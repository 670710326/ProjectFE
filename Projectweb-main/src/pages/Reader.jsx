import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChapterPages } from '../api/mangadex';

export default function Reader() {
  const { chapterId } = useParams();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getChapterPages(chapterId)
      .then((result) => {
        if (active) setPages(result);
      })
      .catch((err) => {
        if (active) setError(err.message || 'โหลดหน้ามังงะไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [chapterId]);

  if (loading) return <p className="muted">กำลังโหลดหน้ามังงะ…</p>;
  if (error) return <p className="error">{error}</p>;
  if (pages.length === 0) return <p className="muted">ไม่พบหน้ามังงะในตอนนี้</p>;

  return (
    <div className="reader">
      {pages.map((src, index) => (
        <img key={`${src}-${index}`} src={src} loading="lazy" alt={`หน้า ${index + 1}`} />
      ))}
    </div>
  );
}

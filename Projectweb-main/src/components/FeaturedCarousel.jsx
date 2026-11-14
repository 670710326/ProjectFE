import { useCallback, useEffect, useRef, useState } from 'react';
import MangaCard from './MangaCard';

// แถบมังงะแนะนำ เลื่อนซ้ายขวาได้ (ปุ่ม หรือ ลากนิ้ว/สกอลล์เมาส์)
// ปุ่มจะกดไม่ได้เมื่อสุดทาง และซ่อนเมื่อการ์ดทั้งหมดแสดงครบในหน้าจอ (ไม่มีอะไรให้เลื่อน)
export default function FeaturedCarousel({ items = [] }) {
  const trackRef = useRef(null);
  const [edge, setEdge] = useState({ canScroll: false, atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({
      canScroll: el.scrollWidth > el.clientWidth + 4,
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items, update]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (items.length === 0) return null;
  return (
    <div className="carousel">
      {edge.canScroll && (
        <button className="nav prev" disabled={edge.atStart} onClick={() => scroll(-1)} aria-label="ก่อนหน้า">‹</button>
      )}
      <div className="track" ref={trackRef}>
        {items.map((m) => (
          <MangaCard key={m.id} manga={m} />
        ))}
      </div>
      {edge.canScroll && (
        <button className="nav next" disabled={edge.atEnd} onClick={() => scroll(1)} aria-label="ถัดไป">›</button>
      )}
    </div>
  );
}

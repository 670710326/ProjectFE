import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChapterPages } from '../api/mangadex';

// หน้าเดียว: ลองรูปเต็ม -> ลองรูป data-saver -> ถ้ายังไม่ได้ให้กดโหลดใหม่ (ขอเซิร์ฟเวอร์รูปตัวใหม่)
function Page({ page, index, onReload }) {
  const [step, setStep] = useState(0);
  const [detail, setDetail] = useState('');
  const failed = step >= 2;

  // รูปพัง: ขอรูปเดิมอีกครั้งเพื่อดูสาเหตุจริงจากเซิร์ฟเวอร์ (เช่น upstream 404, proxy error: ETIMEDOUT)
  useEffect(() => {
    if (!failed || index > 0) return; // แสดงสาเหตุที่หน้าแรกพอ ไม่ต้องยิงซ้ำทุกหน้า
    let active = true;
    fetch(page.src)
      .then(async (r) => (r.ok ? `ขอรูปได้ (${r.status}) แต่เบราว์เซอร์แสดงไม่ได้` : (await r.text()).slice(0, 120)))
      .catch((e) => String(e.message || e))
      .then((text) => active && setDetail(text));
    return () => { active = false; };
  }, [failed, index, page.src]);

  if (failed) {
    return (
      <div className="muted" style={{ padding: 16, textAlign: 'center' }}>
        โหลดหน้า {index + 1} ไม่สำเร็จ{' '}
        <button type="button" onClick={onReload}>โหลดตอนนี้ใหม่</button>
        {detail && <div style={{ fontSize: 12 }}>สาเหตุ: {detail}</div>}
      </div>
    );
  }

  const src = step === 0 ? page.src : page.fallback;
  return (
    <img
      key={step}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer"
      alt={`หน้า ${index + 1}`}
      onError={() => setStep(step === 0 && page.fallback ? 1 : 2)}
    />
  );
}

export default function Reader() {
  const { chapterId } = useParams();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [chapterId, reloadKey]);

  const reload = () => setReloadKey((n) => n + 1);

  if (loading) return <p className="muted">กำลังโหลดหน้ามังงะ…</p>;
  if (error) {
    return (
      <p className="error">
        {error} <button type="button" onClick={reload}>ลองใหม่</button>
      </p>
    );
  }
  if (pages.length === 0) return <p className="muted">ไม่พบหน้ามังงะในตอนนี้</p>;

  return (
    <div className="reader">
      {pages.map((page, index) => (
        <Page key={`${reloadKey}-${index}`} page={page} index={index} onReload={reload} />
      ))}
    </div>
  );
}

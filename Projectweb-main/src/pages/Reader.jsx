import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChapterInfo, getChapterPages, getChaptersByLanguage } from '../api/mangadex';

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

// เรียงตอนตามเลขตอน และตัดตอนซ้ำ (หลายกลุ่มแปลเลขตอนเดียวกัน) ให้เหลือ 1 รายการต่อเลขตอน
// ถ้าตอนที่กำลังอ่านเป็นหนึ่งในตอนซ้ำ จะใช้ตอนนั้นเป็นตัวแทน
function buildList(chapters, currentId) {
  const num = (c) => parseFloat(c.chapter);
  const sorted = [...chapters].sort((a, b) => {
    const x = num(a);
    const y = num(b);
    if (Number.isNaN(x) && Number.isNaN(y)) return 0;
    if (Number.isNaN(x)) return 1;
    if (Number.isNaN(y)) return -1;
    return x - y;
  });
  const seen = new Map();
  for (const c of sorted) {
    const key = c.chapter != null && c.chapter !== '' ? `n:${c.chapter}` : `id:${c.id}`;
    if (!seen.has(key) || c.id === currentId) seen.set(key, c);
  }
  return [...seen.values()];
}

const label = (c) => `ตอนที่ ${c.chapter ?? '-'}${c.title ? ` · ${c.title}` : ''}`;

// แถบเปลี่ยนตอน: ย้อนกลับ / เลือกตอน / ถัดไป (ตอนแรกย้อนไม่ได้ ตอนสุดท้ายถัดไปไม่ได้)
function ChapterNav({ list, index, mangaId, onGo }) {
  if (list.length === 0) return null;
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;

  return (
    <div className="reader-nav">
      <button type="button" disabled={!prev} onClick={() => prev && onGo(prev.id)}>
        ← ก่อนหน้า
      </button>
      <select
        aria-label="เลือกตอน"
        value={index >= 0 ? list[index].id : ''}
        onChange={(e) => e.target.value && onGo(e.target.value)}
      >
        {index < 0 && <option value="">เลือกตอน…</option>}
        {list.map((c) => (
          <option key={c.id} value={c.id}>{label(c)}</option>
        ))}
      </select>
      <button type="button" disabled={!next} onClick={() => next && onGo(next.id)}>
        ถัดไป →
      </button>
      {mangaId && <Link to={`/manga/${mangaId}`} className="reader-nav-back">รายการตอน</Link>}
    </div>
  );
}

export default function Reader() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [mangaId, setMangaId] = useState(null);
  const [chapters, setChapters] = useState([]);
  const listCache = useRef(null); // { mangaId, lang, chapters } จำรายการตอนไว้ ไม่ต้องโหลดใหม่ทุกครั้งที่เปลี่ยนตอน

  // โหลดรูปของตอนนี้
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

  // เปลี่ยนตอนแล้วเลื่อนกลับขึ้นบนสุด
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [chapterId]);

  // โหลดรายการตอนของเรื่องนี้ (ภาษาเดียวกับตอนที่กำลังอ่าน) เพื่อทำปุ่มก่อนหน้า/ถัดไป
  useEffect(() => {
    let active = true;
    const cached = listCache.current;
    if (cached && cached.chapters.some((c) => c.id === chapterId)) {
      setMangaId(cached.mangaId);
      setChapters(cached.chapters);
      return undefined;
    }
    (async () => {
      try {
        const info = await getChapterInfo(chapterId);
        if (!active || !info.mangaId || !info.lang) return;
        setMangaId(info.mangaId);
        const groups = await getChaptersByLanguage(info.mangaId, [info.lang]);
        if (!active) return;
        const list = groups.find((g) => g.lang === info.lang)?.chapters || [];
        listCache.current = { mangaId: info.mangaId, lang: info.lang, chapters: list };
        setChapters(list);
      } catch {
        // โหลดรายการตอนไม่ได้ก็ยังอ่านตอนนี้ได้ แค่ไม่มีแถบเปลี่ยนตอน
      }
    })();
    return () => { active = false; };
  }, [chapterId]);

  const list = useMemo(() => buildList(chapters, chapterId), [chapters, chapterId]);
  const index = list.findIndex((c) => c.id === chapterId);
  const go = (id) => navigate(`/read/${id}`);
  const reload = () => setReloadKey((n) => n + 1);

  const nav = <ChapterNav list={list} index={index} mangaId={mangaId} onGo={go} />;
  const ready = !loading && !error && pages.length > 0;

  return (
    <div className="reader">
      {nav}
      {loading && <p className="muted">กำลังโหลดหน้ามังงะ…</p>}
      {!loading && error && (
        <p className="error">
          {error} <button type="button" onClick={reload}>ลองใหม่</button>
        </p>
      )}
      {!loading && !error && pages.length === 0 && <p className="muted">ไม่พบหน้ามังงะในตอนนี้</p>}
      {ready && pages.map((page, i) => (
        <Page key={`${chapterId}-${reloadKey}-${i}`} page={page} index={i} onReload={reload} />
      ))}
      {ready && nav}
    </div>
  );
}

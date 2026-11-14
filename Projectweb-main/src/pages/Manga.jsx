import { useMemo, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../api/useAsync';
import { proxiedThumb } from '../api/mangadex';
import MangaGrid from '../components/MangaGrid';

const FETCH = 50; // ดึงจากหลังบ้านทีละ 50 (เท่ากับหน้าแอดมิน)
const PAGE = 48; // แสดงหน้าละ 48 เรื่อง

// แปลงข้อมูลจากฐานข้อมูลหลังบ้านให้อยู่ในรูปแบบที่ MangaCard ใช้
const fromBackend = (m) => ({
  id: m.id,
  title: m.title,
  subtitle: m.title_th || '',
  cover: proxiedThumb(m.cover_url),
});

// ดึงมังงะทั้งหมดในฐานข้อมูลหลังบ้าน (วนดึงทีละหน้าจนครบ) จะได้รู้จำนวนทั้งหมด
async function loadAll() {
  const all = [];
  for (let offset = 0; offset < 5000; offset += FETCH) {
    const d = await api(`/api/manga?q=&limit=${FETCH}&offset=${offset}`);
    const batch = d.items || [];
    all.push(...batch);
    if (batch.length < FETCH) break;
  }
  return all.map(fromBackend);
}

// หน้ามังงะทั้งหมด: แสดงเฉพาะมังงะที่มีในฐานข้อมูลหลังบ้าน (ชุดเดียวกับหน้าแอดมิน)
export default function Manga() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { status, data, error } = useAsync(loadAll, []);
  const all = data || [];

  const shown = useMemo(() => {
    const k = query.toLocaleLowerCase();
    if (!k) return all;
    return all.filter((m) => `${m.title} ${m.subtitle}`.toLocaleLowerCase().includes(k));
  }, [all, query]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const current = Math.min(page, pages);
  const items = shown.slice((current - 1) * PAGE, current * PAGE);

  const goTo = (n) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <h1>มังงะทั้งหมด</h1>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(q.trim());
          setPage(1);
        }}
      >
        <input
          type="search"
          placeholder="ค้นหาชื่อเรื่อง…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <button className="primary" type="submit">ค้นหา</button>
      </form>
      {status === 'success' && (
        <p className="muted">
          {query ? `พบ ${shown.length} เรื่อง จากทั้งหมด ${all.length} เรื่อง` : `มังงะทั้งหมด ${all.length} เรื่อง`}
          {pages > 1 && ` · หน้า ${current}/${pages}`}
        </p>
      )}
      <MangaGrid status={status} items={items} error={error} />
      {status === 'success' && pages > 1 && (
        <nav className="pagination" aria-label="เปลี่ยนหน้า">
          <button type="button" disabled={current <= 1} onClick={() => goTo(current - 1)}>← ก่อนหน้า</button>
          <span className="muted">หน้า {current}/{pages}</span>
          <button type="button" disabled={current >= pages} onClick={() => goTo(current + 1)}>ถัดไป →</button>
        </nav>
      )}
    </>
  );
}

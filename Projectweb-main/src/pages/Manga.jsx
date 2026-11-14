import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../api/useAsync';
import { proxiedThumb } from '../api/mangadex';
import MangaGrid from '../components/MangaGrid';

const PAGE = 50; // เท่ากับหน้าแอดมิน

// แปลงข้อมูลจากฐานข้อมูลหลังบ้านให้อยู่ในรูปแบบที่ MangaCard ใช้
const fromBackend = (m) => ({
  id: m.id,
  title: m.title,
  subtitle: m.title_th || '',
  cover: proxiedThumb(m.cover_url),
});

// หน้ามังงะทั้งหมด: แสดงเฉพาะมังงะที่มีในฐานข้อมูลหลังบ้าน (ชุดเดียวกับหน้าแอดมิน)
export default function Manga() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { status, data, error } = useAsync(
    () => api(`/api/manga?q=${encodeURIComponent(query)}&limit=${PAGE}&offset=${(page - 1) * PAGE}`),
    [query, page]
  );
  const items = (data?.items || []).map(fromBackend);

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
      {status === 'success' && items.length > 0 && (
        <p className="muted">แสดง {(page - 1) * PAGE + 1}–{(page - 1) * PAGE + items.length} เรื่อง · หน้า {page}</p>
      )}
      <MangaGrid status={status} items={items} error={error} />
      {status === 'success' && (page > 1 || items.length >= PAGE) && (
        <nav className="pagination" aria-label="เปลี่ยนหน้า">
          <button type="button" disabled={page <= 1} onClick={() => goTo(page - 1)}>← ก่อนหน้า</button>
          <span className="muted">หน้า {page}</span>
          <button type="button" disabled={items.length < PAGE} onClick={() => goTo(page + 1)}>ถัดไป →</button>
        </nav>
      )}
    </>
  );
}

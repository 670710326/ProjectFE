import { useEffect, useMemo, useState } from 'react';
import { useAsync } from '../api/useAsync';
import { getTags, searchMangaPage } from '../api/mangadex';
import DemoBanner from '../components/DemoBanner';
import MangaGrid from '../components/MangaGrid';

const PAGE = 60;
const MAX_OFFSET = 10000; // MangaDex ให้ offset + limit ได้ไม่เกิน 10,000

// ปุ่มเปลี่ยนหน้า: 1 … 4 5 [6] 7 8 … 20
function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) items.push({ gap: true, key: `gap-${n}` });
    items.push({ n, key: n });
  });

  return (
    <nav className="pagination" aria-label="เปลี่ยนหน้า">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>← ก่อนหน้า</button>
      {items.map((item) =>
        item.gap ? (
          <span key={item.key} className="muted">…</span>
        ) : (
          <button
            key={item.key}
            type="button"
            className={item.n === page ? 'primary' : ''}
            aria-current={item.n === page ? 'page' : undefined}
            onClick={() => onChange(item.n)}
          >
            {item.n}
          </button>
        )
      )}
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>ถัดไป →</button>
    </nav>
  );
}

export default function Manga() {
  const [q, setQ] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [tag, setTag] = useState(''); // id ของแนว
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // รายการแนวทั้งหมดจาก MangaDex (กรองที่ฝั่งเซิร์ฟเวอร์ จึงใช้ร่วมกับการเปลี่ยนหน้าได้)
  const tagsState = useAsync(() => getTags(), []);
  const tags = useMemo(
    () => [...(tagsState.data || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [tagsState.data]
  );

  // ค้นหา/กรอง/เปลี่ยนหน้า จาก MangaDex โดยตรง
  const { status, data, error } = useAsync(
    () =>
      searchMangaPage({
        title: submittedQuery || undefined,
        tags: tag ? [tag] : [],
        limit: PAGE,
        offset: (page - 1) * PAGE,
      }),
    [submittedQuery, tag, page]
  );

  useEffect(() => {
    if (data) setTotal(data.total);
  }, [data]);

  const items = data?.items || [];
  const maxPages = Math.max(1, Math.min(Math.ceil(total / PAGE), Math.floor(MAX_OFFSET / PAGE)));
  const from = (page - 1) * PAGE + 1;
  const to = (page - 1) * PAGE + items.length;

  const goTo = (n) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <DemoBanner show={status === 'error'} error={error} />
      <h1>มังงะทั้งหมด</h1>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedQuery(q.trim());
          setPage(1);
        }}
      >
        <input
          type="search"
          placeholder="ค้นหาชื่อเรื่องจาก MangaDex…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <button className="primary" type="submit">ค้นหา</button>
        <select
          value={tag}
          onChange={(event) => {
            setTag(event.target.value);
            setPage(1);
          }}
        >
          <option value="">ทุกแนว</option>
          {tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </form>
      {status === 'success' && items.length > 0 && (
        <p className="muted">
          แสดง {from.toLocaleString()}–{to.toLocaleString()} จาก {total.toLocaleString()} เรื่อง · หน้า {page}/{maxPages}
        </p>
      )}
      <MangaGrid status={status} items={items} error={error} />
      {status === 'success' && <Pagination page={page} pages={maxPages} onChange={goTo} />}
    </>
  );
}

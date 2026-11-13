import { useMemo, useState } from 'react';
import { useAsync } from '../api/useAsync';
import { searchManga } from '../api/mangadex';
import DemoBanner from '../components/DemoBanner';
import MangaGrid from '../components/MangaGrid';

export default function Manga() {
  const [q, setQ] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [tag, setTag] = useState('');
  // ค้นหาจาก MangaDex โดยตรงเมื่อกดปุ่มค้นหา ไม่ได้กรองแค่ข้อมูลตัวอย่างในเครื่อง
  const { status, data, error } = useAsync(
    () => searchManga({ title: submittedQuery || undefined, limit: 60 }),
    [submittedQuery]
  );

  const tags = useMemo(
    () => [...new Set((data || []).flatMap((manga) => manga.tags || []))].sort(),
    [data]
  );

  const keyword = submittedQuery.toLocaleLowerCase();
  const shown = (data || []).filter((manga) => {
    const matchesName = !keyword || manga.title.toLocaleLowerCase().includes(keyword);
    const matchesTag = !tag || (manga.tags || []).includes(tag);
    return matchesName && matchesTag;
  });

  return (
    <>
      <DemoBanner show={status === 'error'} error={error} />
      <h1>มังงะทั้งหมด</h1>
      <form className="toolbar" onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(q.trim()); }}>
        <input
          type="search"
          placeholder="ค้นหาชื่อเรื่องจาก MangaDex…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <button className="primary" type="submit">ค้นหา</button>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="">ทุกแนว</option>
          {tags.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </form>
      {status === 'success' && <p className="muted">พบ {shown.length} เรื่องจากผลลัพธ์ MangaDex</p>}
      <MangaGrid status={status} items={shown} error={error} />
    </>
  );
}

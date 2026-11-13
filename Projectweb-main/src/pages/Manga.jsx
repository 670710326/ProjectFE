import { useMemo, useState } from 'react';
import { useAsync } from '../api/useAsync';
import { searchManga } from '../api/mangadex';
import DemoBanner from '../components/DemoBanner';
import MangaGrid from '../components/MangaGrid';

export default function Manga() {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const { status, data, error } = useAsync(() => searchManga({ limit: 60 }), []);

  const tags = useMemo(
    () => [...new Set((data || []).flatMap((manga) => manga.tags || []))].sort(),
    [data]
  );

  const keyword = q.trim().toLocaleLowerCase();
  const shown = (data || []).filter((manga) => {
    const matchesName = !keyword || manga.title.toLocaleLowerCase().includes(keyword);
    const matchesTag = !tag || (manga.tags || []).includes(tag);
    return matchesName && matchesTag;
  });

  return (
    <>
      <DemoBanner show={status === 'error'} />
      <h1>มังงะทั้งหมด</h1>
      <div className="toolbar">
        <input
          type="search"
          placeholder="ค้นหาชื่อเรื่อง…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="">ทุกแนว</option>
          {tags.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <MangaGrid status={status} items={shown} error={error} />
    </>
  );
}

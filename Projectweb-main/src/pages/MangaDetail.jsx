import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../api/useAsync';
import { getManga, getChaptersByLanguage } from '../api/mangadex';
import ReviewForm from '../components/ReviewForm';

// แปลงรหัสภาษาเป็นชื่อภาษาไทย (เช่น en -> อังกฤษ) ถ้าแปลงไม่ได้ใช้รหัสเดิม
function langName(code) {
  try {
    const [base, region] = code.split('-');
    const tag = region ? `${base}-${region.toUpperCase()}` : base;
    return new Intl.DisplayNames(['th'], { type: 'language' }).of(tag) || code;
  } catch {
    return code;
  }
}

export default function MangaDetail() {
  const { id } = useParams();
  const [picked, setPicked] = useState({}); // เก็บภาษาที่ผู้ใช้เลือกแยกตามเรื่อง
  const mangaState = useAsync(() => getManga(id), [id]);
  const manga = mangaState.data;

  // ดึงตอนทุกภาษาครั้งเดียว แล้วเหลือเฉพาะภาษาที่มีตอนจริง (อังกฤษมาก่อน)
  const chaptersState = useAsync(
    () => (manga ? getChaptersByLanguage(id, manga.languages) : Promise.resolve(null)),
    [id, manga?.id]
  );
  const groups = chaptersState.data || [];
  const byLang = new Map(groups.map((g) => [g.lang, g.chapters]));
  // อังกฤษและไทยแสดงเสมอ ถ้าทั้งสองภาษาไม่มีตอน ให้เพิ่มภาษาอื่นที่มีตอนมากที่สุด 1 ภาษา
  const langs = ['en', 'th'];
  if (!byLang.has('en') && !byLang.has('th')) {
    const top = groups.find((g) => g.lang !== 'en' && g.lang !== 'th'); // groups เรียงตามจำนวนตอนมาก -> น้อยอยู่แล้ว
    if (top) langs.push(top.lang);
  }
  const lang = langs.includes(picked[id]) ? picked[id] : langs.find((l) => byLang.has(l)) || 'en';

  if (mangaState.status === 'loading') return <p className="muted">กำลังโหลดข้อมูลจาก MangaDex…</p>;
  if (mangaState.status === 'error') {
    return <p className="error">โหลดข้อมูลจาก MangaDex ไม่สำเร็จ: {mangaState.error?.message}</p>;
  }
  if (!manga) return <p className="error">ไม่พบมังงะเรื่องนี้ใน MangaDex</p>;

  const chapters = byLang.get(lang) || [];

  return (
    <>
      <div className="detail">
        {manga.cover ? <img src={manga.cover} alt={manga.title} referrerPolicy="no-referrer" /> : <div className="card cover" />}
        <div>
          <h1>{manga.title}</h1>
          <p className="muted">{manga.status}{manga.year ? ` · ${manga.year}` : ''}</p>
          <div className="tags">{manga.tags.map((t) => <span key={t}>{t}</span>)}</div>
          <p>{manga.description}</p>
        </div>
      </div>

      <h2>รายการตอน ({chaptersState.status === 'success' ? chapters.length : '—'})</h2>
      <p>
        <label>
          ภาษา:{' '}
          <select value={lang} onChange={(e) => setPicked({ ...picked, [id]: e.target.value })}>
            {langs.map((l) => {
              const count = byLang.get(l)?.length || 0;
              const note = chaptersState.status !== 'success' ? '' : count ? ` · ${count} ตอน` : ' · ยังไม่มีตอน';
              return <option key={l} value={l}>{langName(l)}{note}</option>;
            })}
          </select>
        </label>
      </p>
      {chaptersState.status === 'loading' && <p className="muted">กำลังโหลดตอน…</p>}
      {chaptersState.status === 'error' && <p className="error">โหลดตอนไม่สำเร็จ: {chaptersState.error.message}</p>}
      {chaptersState.status === 'success' && chapters.length === 0 && <p className="muted">ยังไม่มีตอนที่แปลเป็นภาษา{langName(lang)}</p>}
      <ul className="chapters">
        {chapters.map((c) => (
          <li key={c.id}>
            <Link to={`/read/${c.id}`}>
              ตอนที่ {c.chapter ?? '-'} {c.title ? `· ${c.title}` : ''}
            </Link>
          </li>
        ))}
      </ul>

      <ReviewForm mangaId={id} />
    </>
  );
}

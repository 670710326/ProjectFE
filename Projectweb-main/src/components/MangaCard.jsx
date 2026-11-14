import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function MangaCard({ manga }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const hasCover = Boolean(manga.cover) && !coverFailed;

  return (
    <Link to={`/manga/${manga.id}`} className="card">
      {hasCover ? (
        <img
          className="cover"
          src={manga.cover}
          alt={manga.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <div className="cover cover-placeholder" aria-label="ไม่มีรูปปก">
          <span>{manga.title?.slice(0, 1) || 'M'}</span>
        </div>
      )}
      <div className="info">
        <div className="title">{manga.title}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {manga.subtitle ?? `${manga.status}${manga.year ? ` · ${manga.year}` : ''}`}
        </div>
      </div>
    </Link>
  );
}

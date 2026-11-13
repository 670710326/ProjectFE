import { useAsync } from '../api/useAsync';
import { getPopularManga } from '../api/mangadex';
import DemoBanner from '../components/DemoBanner';
import FeaturedCarousel from '../components/FeaturedCarousel';
import MangaGrid from '../components/MangaGrid';

export default function Home() {
  const { status, data, error } = useAsync(() => getPopularManga(24), []);
  const items = data || [];
  const featured = items.slice(0, 6);

  return (
    <>
      <DemoBanner show={status === 'error'} error={error} />
      <h1>มังงะแนะนำ</h1>
      {status === 'loading' ? (
        <p className="muted">กำลังโหลดมังงะแนะนำ…</p>
      ) : (
        <FeaturedCarousel items={featured} />
      )}
      <h2>ยอดนิยม</h2>
      <MangaGrid status={status} items={items} error={error} />
    </>
  );
}

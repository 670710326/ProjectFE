// ชั้นกลางสำหรับเรียก MangaDex ผ่าน proxy /mdx
import { onceADay } from './cache';

const BASE = import.meta.env.VITE_API_BASE || '/mdx';
const COVER_BASE = 'https://uploads.mangadex.org/covers';
const RATINGS = ['safe', 'suggestive'];

function toQuery(params) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((item) => q.append(`${key}[]`, item));
    else if (typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        q.append(`${key}[${subKey}]`, subValue);
      }
    } else q.append(key, value);
  }
  return q.toString();
}

export async function request(path, params = {}) {
  const query = toQuery(params);
  let response;
  try {
    response = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('เชื่อมต่อ MangaDex ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือ Proxy');
  }

  if (response.status === 429) {
    throw new Error('MangaDex ส่งคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่');
  }
  if (!response.ok) {
    throw new Error(`MangaDex ตอบกลับ ${response.status}`);
  }
  return response.json();
}

const pick = (obj) =>
  obj?.en || obj?.th || obj?.['ja-ro'] || Object.values(obj || {})[0] || '';

export function normalizeManga(manga) {
  const attributes = manga.attributes || {};
  const coverFile = manga.relationships?.find(
    (relationship) => relationship.type === 'cover_art'
  )?.attributes?.fileName;

  return {
    id: manga.id,
    title: pick(attributes.title) || 'ไม่มีชื่อเรื่อง',
    description: pick(attributes.description),
    status: attributes.status || 'unknown',
    year: attributes.year || null,
    tags: (attributes.tags || [])
      .map((tag) => pick(tag.attributes?.name))
      .filter(Boolean),
    cover: coverFile
      ? `${COVER_BASE}/${manga.id}/${coverFile}.256.jpg`
      : null,
  };
}

export async function searchManga({
  title,
  limit = 24,
  offset = 0,
  order = { followedCount: 'desc' },
} = {}) {
  const json = await request('/manga', {
    title,
    limit,
    offset,
    order,
    includes: ['cover_art'],
    contentRating: RATINGS,
    hasAvailableChapters: 'true',
  });
  return (json.data || []).map(normalizeManga);
}

export async function getPopularManga(limit = 24) {
  return searchManga({ limit, order: { followedCount: 'desc' } });
}

export async function getManga(id) {
  const json = await request(`/manga/${encodeURIComponent(id)}`, {
    includes: ['cover_art'],
  });
  return normalizeManga(json.data);
}

export async function getTags() {
  const json = await request('/manga/tag');
  return (json.data || []).map((tag) => ({
    id: tag.id,
    name: pick(tag.attributes?.name),
  }));
}

export async function getChapters(mangaId, lang = 'en') {
  const json = await request(`/manga/${encodeURIComponent(mangaId)}/feed`, {
    translatedLanguage: [lang],
    order: { chapter: 'asc' },
    contentRating: RATINGS,
    includes: ['scanlation_group'],
    limit: 100,
  });

  return (json.data || [])
    .filter((chapter) => !chapter.attributes?.externalUrl)
    .map((chapter) => ({
      id: chapter.id,
      chapter: chapter.attributes?.chapter,
      title: chapter.attributes?.title,
      pages: chapter.attributes?.pages,
    }));
}

export async function getChapterPages(chapterId) {
  const json = await request(`/at-home/server/${encodeURIComponent(chapterId)}`);
  const hash = json.chapter?.hash;
  const files = json.chapter?.data || [];
  if (!json.baseUrl || !hash || files.length === 0) {
    throw new Error('ไม่พบรูปภาพของตอนนี้');
  }
  return files.map(
    (file) => `${json.baseUrl}/data/${hash}/${file}`
  );
}

export { onceADay };

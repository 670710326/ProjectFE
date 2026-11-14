// ชั้นกลางสำหรับเรียก MangaDex ผ่าน proxy /mdx
import { onceADay } from './cache';

const BASE = import.meta.env.VITE_API_BASE || '/mdx';
// ผ่าน proxy /covers (vite dev / vercel rewrites) ไปที่ uploads.mangadex.org/covers
const COVER_BASE = '/covers';
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

// ล้างคำอธิบายเรื่อง: ตัดส่วน "Links:" และบรรทัดที่เป็นลิงก์/URL ออก เหลือแต่เรื่องย่อ
export function cleanDescription(text = '') {
  let t = String(text);
  const cut = t.search(/\*{0,2}\s*(?:official\s+|external\s+)?links?\s*:\s*\*{0,2}/i);
  if (cut >= 0) t = t.slice(0, cut);
  return t
    .split('\n')
    .filter((line) => !/\]\(|https?:\/\//i.test(line))
    .join('\n')
    .replace(/\*\*|__/g, '')
    .replace(/(^|\n)\s*[-*_]{3,}\s*(?=\n|$)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\s\-*_]+$/, '')
    .trim();
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
    description: cleanDescription(pick(attributes.description)),
    status: attributes.status || 'unknown',
    year: attributes.year || null,
    languages: attributes.availableTranslatedLanguages || [],
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

// เหมือน searchManga แต่คืน total ด้วย เพื่อทำปุ่มเปลี่ยนหน้า + กรองแนว (tags = id ของแนว) ที่ฝั่ง MangaDex
export async function searchMangaPage({
  title,
  tags = [],
  limit = 60,
  offset = 0,
  order = { followedCount: 'desc' },
} = {}) {
  const json = await request('/manga', {
    title,
    limit,
    offset,
    order,
    includedTags: tags,
    includes: ['cover_art'],
    contentRating: RATINGS,
    hasAvailableChapters: 'true',
  });
  return { items: (json.data || []).map(normalizeManga), total: json.total || 0 };
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
    limit: 500,
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

// ข้อมูลตอนเดียว: ใช้หาว่าตอนนี้อยู่เรื่องไหน/ภาษาอะไร เพื่อทำปุ่มตอนก่อนหน้า-ถัดไป
export async function getChapterInfo(chapterId) {
  const json = await request(`/chapter/${encodeURIComponent(chapterId)}`);
  const data = json.data || {};
  const attrs = data.attributes || {};
  return {
    id: data.id,
    mangaId: data.relationships?.find((r) => r.type === 'manga')?.id || null,
    lang: attrs.translatedLanguage || null,
    chapter: attrs.chapter,
    title: attrs.title,
  };
}

// ดึงตอนทุกภาษาที่เรื่องนั้นมี แล้วเก็บเฉพาะภาษาที่ "มีตอนให้อ่านจริง" (ตัดตอนที่ลิงก์ไปเว็บภายนอกทิ้ง)
// คืนค่า [{ lang, chapters }] เรียง อังกฤษ -> ไทย -> ภาษาที่มีตอนมากสุด
export async function getChaptersByLanguage(mangaId, languages = []) {
  const limit = 500;
  const all = [];
  for (let offset = 0; offset < 3000; offset += limit) {
    const json = await request(`/manga/${encodeURIComponent(mangaId)}/feed`, {
      translatedLanguage: languages.length ? languages : undefined,
      order: { chapter: 'asc' },
      contentRating: RATINGS,
      includeEmptyPages: 0,
      includeFuturePublishAt: 0,
      includeExternalUrl: 0,
      limit,
      offset,
    });
    const batch = json.data || [];
    all.push(...batch);
    if (batch.length === 0 || offset + limit >= (json.total || 0)) break;
  }

  const groups = new Map();
  for (const chapter of all) {
    const attrs = chapter.attributes || {};
    if (attrs.externalUrl || !(attrs.pages > 0)) continue; // ตัดตอนลิงก์ภายนอก/ไม่มีรูป
    const lang = attrs.translatedLanguage;
    if (!lang) continue;
    if (!groups.has(lang)) groups.set(lang, []);
    groups.get(lang).push({
      id: chapter.id,
      chapter: attrs.chapter,
      title: attrs.title,
      pages: attrs.pages,
    });
  }

  const rank = (lang) => (lang === 'en' ? 0 : lang === 'th' ? 1 : 2);
  return [...groups.entries()]
    .map(([lang, chapters]) => ({ lang, chapters }))
    .sort((a, b) => rank(a.lang) - rank(b.lang) || b.chapters.length - a.chapters.length);
}

// ให้รูปมังงะผ่านเซิร์ฟเวอร์ของเรา (/img) เพราะเบราว์เซอร์บางเครือข่ายต่อเซิร์ฟเวอร์รูปของ MangaDex ตรง ๆ ไม่ได้
const viaProxy = (url) => `/img?u=${encodeURIComponent(url)}`;

// รูปปกที่เป็นลิงก์ MangaDex (เช่น cover_url จาก Backend) ให้ผ่าน proxy ของเรา และใช้ไฟล์ย่อ .256.jpg ให้โหลดเร็ว
export function proxiedThumb(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const isMd = u.protocol === 'https:' && (u.hostname === 'mangadex.org' || u.hostname.endsWith('.mangadex.org') || u.hostname.endsWith('.mangadex.network'));
    if (!isMd) return url;
    const needsThumb =
      u.hostname === 'uploads.mangadex.org' &&
      /^\/covers\/[0-9a-f-]{36}\/[^/]+\.(jpe?g|png|webp)$/i.test(u.pathname) &&
      !/\.(256|512)\.jpg$/i.test(u.pathname);
    if (needsThumb) u.pathname += '.256.jpg';
    return viaProxy(u.toString());
  } catch {
    return url;
  }
}

// คืนค่า [{ src, fallback }] src = ภาพคุณภาพเต็ม, fallback = ภาพ data-saver (เล็กกว่า ใช้สำรองเมื่อรูปเต็มโหลดไม่ขึ้น)
// forcePort443: ให้เซิร์ฟเวอร์รูปใช้พอร์ต 443 เพราะบางเครือข่ายบล็อกพอร์ตแปลก ๆ ของ MD@Home
export async function getChapterPages(chapterId) {
  const json = await request(`/at-home/server/${encodeURIComponent(chapterId)}`, {
    forcePort443: 'true',
  });
  const hash = json.chapter?.hash;
  const full = json.chapter?.data || [];
  const saver = json.chapter?.dataSaver || [];
  if (!json.baseUrl || !hash || full.length === 0) {
    throw new Error('ไม่พบรูปภาพของตอนนี้');
  }
  return full.map((file, i) => ({
    src: viaProxy(`${json.baseUrl}/data/${hash}/${file}`),
    fallback: saver[i] ? viaProxy(`${json.baseUrl}/data-saver/${hash}/${saver[i]}`) : null,
  }));
}

export { onceADay };

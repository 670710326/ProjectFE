// Vercel serverless function: /mdx/... -> https://api.mangadex.org/...
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://local');
    const p = url.searchParams.get('p') || '';
    // Vercel เติมพารามิเตอร์จาก rewrite (p, path) ลงใน query ต้องตัดออกก่อนส่งให้ MangaDex
    url.searchParams.delete('p');
    url.searchParams.delete('path');
    const qs = url.searchParams.toString();

    const upstream = await fetch(`https://api.mangadex.org/${p}${qs ? `?${qs}` : ''}`, {
      headers: { 'User-Agent': 'MangaHub/0.1', Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    if (upstream.ok) res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.end(buf);
  } catch (err) {
    const code = err?.cause?.code || err?.name || err?.message;
    console.error('[mdx proxy]', code);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `proxy error: ${code}` }));
  }
}
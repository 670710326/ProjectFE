// Vercel serverless function: /covers/... -> https://uploads.mangadex.org/covers/...
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://local');
    const p = url.searchParams.get('p') || '';

    const upstream = await fetch(`https://uploads.mangadex.org/covers/${p}`, {
      headers: { 'User-Agent': 'MangaHub/0.1', Accept: 'image/*' },
      signal: AbortSignal.timeout(20000),
    });

    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'text/plain');
      return res.end(`upstream ${upstream.status}`);
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(buf);
  } catch (err) {
    const code = err?.cause?.code || err?.name || err?.message;
    console.error('[covers proxy]', code);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`proxy error: ${code}`);
  }
}
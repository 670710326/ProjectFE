// พร็อกซีรูปมังงะ: เบราว์เซอร์ขอ /img?u=<URL รูป> แล้วให้เซิร์ฟเวอร์ของเราไปดึงจาก MangaDex แทน
// (ใช้ได้ทั้ง Vite dev/preview และ Vercel serverless ที่ api/img.js)
// อนุญาตเฉพาะโดเมนของ MangaDex เพื่อไม่ให้ถูกใช้เป็นพร็อกซีเปิดไปที่อื่น
const allowedHost = (host) =>
  host === 'mangadex.org' || host.endsWith('.mangadex.org') || host.endsWith('.mangadex.network');

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}

export async function handleImg(req, res) {
  try {
    const raw = new URL(req.url, 'http://local').searchParams.get('u');
    let target;
    try {
      target = new URL(raw || '');
    } catch {
      return send(res, 400, 'bad url', { 'Content-Type': 'text/plain' });
    }
    if (target.protocol !== 'https:' || !allowedHost(target.hostname)) {
      return send(res, 400, 'host not allowed', { 'Content-Type': 'text/plain' });
    }

    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'MangaHub/0.1', Accept: 'image/*' },
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) {
      return send(res, upstream.status, `upstream ${upstream.status}`, { 'Content-Type': 'text/plain' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    return send(res, 200, buf, {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });
  } catch (err) {
    const code = err?.cause?.code || err?.name || err?.message;
    console.error('[img proxy]', code);
    return send(res, 502, `proxy error: ${code}`, { 'Content-Type': 'text/plain' });
  }
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleImg } from './server/imgProxy.js';

// เสิร์ฟ /img?u=... ให้รูปมังงะผ่านเซิร์ฟเวอร์ของเรา (dev และ preview)
const imgProxy = () => ({
  name: 'img-proxy',
  configureServer(server) {
    server.middlewares.use('/img', handleImg);
  },
  configurePreviewServer(server) {
    server.middlewares.use('/img', handleImg);
  },
});

// ปลายทาง Backend: ค่าเริ่มต้นคือเครื่องเดียวกัน
// ถ้า backend อยู่อีก Codespace ให้รัน: API_TARGET=https://xxxx-8000.app.github.dev npm run dev
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react(), imgProxy()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      // Backend Go API
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: API_TARGET.startsWith('https'),
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.error('[proxy /api]', req.url, err.code || err.message);
          });
        },
      },
      // รูปปก MangaDex (ผ่าน server เพื่อเลี่ยง hotlink/เครือข่ายบล็อก)
      '/covers': {
        target: 'https://uploads.mangadex.org',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('origin');
            proxyReq.setHeader('User-Agent', 'MangaHub/0.1');
          });
          proxy.on('error', (err, req) => {
            console.error('[proxy /covers]', req.url, err.code || err.message);
          });
        },
      },
      // MangaDex public API (strip /mdx before forwarding)
      '/mdx': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/mdx/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('origin');
            proxyReq.setHeader('User-Agent', 'MangaHub/0.1');
          });
          proxy.on('error', (err, req) => {
            console.error('[proxy /mdx]', req.url, err.code || err.message);
          });
        },
      },
    },
  },
});
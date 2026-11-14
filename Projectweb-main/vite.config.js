
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleImg } from './server/imgProxy.js';

const API_TARGETS = [
  'http://127.0.0.1:8000',
  'https://legendary-xylophone-97g6jgr5vq663p9v7-8000.app.github.dev/',
];

// API Proxy with automatic fallback
const apiProxy = async (req, res, next) => {
  if (!req.url.startsWith('/api')) {
    return next();
  }

  try {
    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);

    for (const target of API_TARGETS) {
      try {
        console.log(`[API] Trying: ${target}`);

        const response = await fetch(`${target}${req.url}`, {
          method: req.method,
          headers: {
            ...req.headers,
            host: new URL(target).host,
          },
          body:
            req.method === 'GET' || req.method === 'HEAD'
              ? undefined
              : body,
        });

        const responseBody = Buffer.from(
          await response.arrayBuffer()
        );

        res.statusCode = response.status;

        response.headers.forEach((value, key) => {
          if (
            ![
              'connection',
              'transfer-encoding',
              'content-length',
              'content-encoding',
            ].includes(key.toLowerCase())
          ) {
            res.setHeader(key, value);
          }
        });

        console.log(`[API] Connected: ${target}`);
        return res.end(responseBody);
      } catch (error) {
        console.error(`[API] Failed: ${target}`, error.message);
      }
    }

    res.statusCode = 502;
    res.end('All backend servers are unavailable.');
  } catch (error) {
    console.error('[API Proxy Error]', error);
    res.statusCode = 500;
    res.end('API Proxy Error');
  }
};

// Image Proxy
const imgProxy = () => ({
  name: 'img-proxy',

  configureServer(server) {
    server.middlewares.use('/img', handleImg);
    server.middlewares.use(apiProxy);
  },

  configurePreviewServer(server) {
    server.middlewares.use('/img', handleImg);
    server.middlewares.use(apiProxy);
  },
});

export default defineConfig({
  plugins: [react(), imgProxy()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    proxy: {
      // MangaDex Cover Images
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
            console.error(
              '[proxy /covers]',
              req.url,
              err.code || err.message
            );
          });
        },
      },

      // MangaDex Public API
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
            console.error(
              '[proxy /mdx]',
              req.url,
              err.code || err.message
            );
          });
        },
      },
    },
  },
});

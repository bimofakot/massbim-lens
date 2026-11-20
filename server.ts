import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { runLiveAudit, SUPPORTED_DETECTIONS } from './server/auditEngine.ts';
import type { ScanMode } from './src/types/audit.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// In-Memory Per-IP Rate Limiter (Express max 25/mnt, Deep Crawl max 6/mnt)
// ============================================================================

interface RateBucket {
  expressTimestamps: number[];
  deepTimestamps: number[];
}

const rateLimitStore = new Map<string, RateBucket>();

function checkAuditRateLimit(ip: string, mode: ScanMode): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = rateLimitStore.get(ip) || { expressTimestamps: [], deepTimestamps: [] };

  bucket.expressTimestamps = bucket.expressTimestamps.filter((t) => now - t < windowMs);
  bucket.deepTimestamps = bucket.deepTimestamps.filter((t) => now - t < windowMs);

  if (mode === 'deep') {
    if (bucket.deepTimestamps.length >= 6) {
      const oldest = bucket.deepTimestamps[0];
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
    }
    bucket.deepTimestamps.push(now);
  } else {
    if (bucket.expressTimestamps.length >= 25) {
      const oldest = bucket.expressTimestamps[0];
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
    }
    bucket.expressTimestamps.push(now);
  }

  rateLimitStore.set(ip, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;
  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Diperlukan agar IP asli klien terbaca di balik Nginx/Cloudflare
  app.use(express.json());

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  );
  const publicAppUrlRaw = (process.env.PUBLIC_APP_URL || '').trim();
  const publicAppUrl =
    /^https?:\/\//i.test(publicAppUrlRaw) ? publicAppUrlRaw : null;

  // Hardening HTTP response headers untuk aplikasi Massbim Lens sendiri
  app.use((req, res, next) => {
    const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.replace(/\/+$/, '') : '';
    const isCorsAllowed = Boolean(requestOrigin && allowedOrigins.has(requestOrigin));

    if (isCorsAllowed) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.headers['sec-fetch-dest'] !== 'iframe') {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader(
      'Cross-Origin-Resource-Policy',
      isCorsAllowed && req.path.startsWith('/api/') ? 'cross-origin' : 'same-origin',
    );

    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    const cspDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com",
      "form-action 'self'",
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' ws: wss:",
      "manifest-src 'self'",
      "worker-src 'self'",
    ];
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

    if (req.method === 'OPTIONS' && req.path.startsWith('/api/')) {
      res.status(204).end();
      return;
    }

    next();
  });

  // Technical SEO & Trust Endpoints for Massbim Lens
  app.get('/robots.txt', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${proto}://${host}/sitemap.xml\n`,
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const today = new Date().toISOString().split('T')[0];
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${proto}://${host}/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`,
    );
  });

  app.get('/.well-known/security.txt', (_req, res) => {
    res.type('text/plain').send(
      `Contact: mailto:andraani30@gmail.com\nContact: https://github.com/bimofakot/\nExpires: 2027-12-31T23:59:00.000Z\nPreferred-Languages: id, en\n`,
    );
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/capabilities', (_req, res) => {
    res.json({ supportedDetections: SUPPORTED_DETECTIONS });
  });

  app.get('/api/self-audit', async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const limit = checkAuditRateLimit(clientIp, 'express');
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      res.status(429).json({
        error: `Terlalu banyak permintaan pemindaian. Silakan coba lagi dalam ${limit.retryAfterSec} detik.`,
      });
      return;
    }

    try {
      const selfUrl = publicAppUrl || `http://127.0.0.1:${port}/`;
      const report = await runLiveAudit(
        selfUrl,
        'express',
        publicAppUrl ? undefined : { allowInternalSelf: true },
      );
      res.json(report);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal menjalankan self-audit Massbim Lens.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/audit', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const mode: ScanMode = req.query.mode === 'deep' ? 'deep' : 'express';
    const consent = req.query.consent === 'true';

    if (!rawUrl.trim()) {
      res.status(400).json({ error: 'Parameter URL target wajib diisi.' });
      return;
    }

    if (mode === 'deep' && !consent) {
      res.status(400).json({
        error: 'Mode Deep Crawl memerlukan persetujuan risiko eksplisit dari pengguna.',
      });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const limit = checkAuditRateLimit(clientIp, mode);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      res.status(429).json({
        error: `Terlalu banyak permintaan pemindaian. Silakan coba lagi dalam ${limit.retryAfterSec} detik.`,
      });
      return;
    }

    try {
      const report = await runLiveAudit(rawUrl, mode);
      res.json(report);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal memindai target URL yang diminta.';
      res.status(400).json({ error: message });
    }
  });

  if (isProd) {
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Massbim Lens server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import * as tls from 'node:tls';
import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import * as crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import type {
  AdminExposureItem,
  AiTemplateAnalysis,
  AiTemplateSignalItem,
  AssetBreakdown,
  AuditCategory,
  AuditFinding,
  AuditReport,
  AuxiliaryProbes,
  CategoryScore,
  CookieAuditItem,
  DeepCrawlPageItem,
  DnsRecordsInfo,
  DomSummary,
  LinkProbeItem,
  MixedContentItem,
  NetworkMetrics,
  PwaManifestInspection,
  PwaReadiness,
  ScanCoverage,
  ScanMode,
  SupportedDetectionCategory,
  TechStackItem,
  ThemeSupportInfo,
  TlsInfo,
} from '../src/types/audit.ts';

export const SUPPORTED_DETECTIONS: SupportedDetectionCategory[] = [
  {
    category: 'Framework & UI',
    signatures: [
      'Astro',
      'Next.js',
      'Nuxt',
      'Remix',
      'SvelteKit',
      'Gatsby',
      'React',
      'Vue.js',
      'Angular',
      'Svelte',
      'Vite',
      'Tailwind CSS',
      'Bootstrap',
      'DaisyUI',
      'Alpine.js',
      'HTMX',
      'jQuery',
    ],
  },
  {
    category: 'Backend, CMS & E-Commerce',
    signatures: [
      'Laravel / Livewire / Inertia',
      'CodeIgniter',
      'WordPress & WooCommerce',
      'Shopify',
      'Magento',
      'Webflow / Framer / Wix',
      'Ghost / Strapi',
      'Express (Node.js)',
      'PHP / ASP.NET',
      'Nginx / Apache / LiteSpeed',
    ],
  },
  {
    category: 'Payment Gateway',
    signatures: [
      'Midtrans (Snap / Core)',
      'Xendit',
      'DOKU',
      'TriPay',
      'Duitku',
      'Stripe',
      'PayPal',
      'Razorpay',
    ],
  },
  {
    category: 'Admin & Autentikasi',
    signatures: [
      'Laravel Filament / Nova',
      'WordPress Admin (wp-admin)',
      'Firebase Auth',
      'Supabase Auth',
      'NextAuth / Auth.js',
      'Clerk / Auth0',
      'Rute /admin, /dashboard, /login',
    ],
  },
  {
    category: 'CDN, Hosting & Analitik',
    signatures: [
      'Cloudflare',
      'Fastly / Firebase Hosting',
      'Vercel / Netlify / GitHub Pages',
      'AWS CloudFront',
      'Google Analytics / GTM / AdSense',
      'Meta Pixel / TikTok Pixel / Clarity / Hotjar',
    ],
  },
];

// ============================================================================
// SSRF Protection — Blokir IP privat, loopback, link-local & host internal
// ============================================================================

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    ) {
      return true;
    }
  }
  return false;
}

export async function validatePublicUrl(rawInput: string): Promise<URL> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Masukkan URL atau nama domain website yang ingin diperiksa.');
  }
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(normalized);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Hanya protokol HTTP dan HTTPS yang didukung.');
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Host lokal atau jaringan internal tidak diizinkan.');
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error('Alamat IP privat tidak diizinkan.');
    }
  } else {
    const resolved = await dns.lookup(host, { all: true });
    for (const entry of resolved) {
      if (isPrivateIp(entry.address)) {
        throw new Error('Domain mengarah ke alamat IP privat.');
      }
    }
  }

  return parsed;
}

// ============================================================================
// TLS/SSL Certificate & Handshake Inspection
// ============================================================================

async function inspectTls(hostname: string, port = 443): Promise<TlsInfo> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname,
        rejectUnauthorized: false,
        timeout: 6000,
      },
      () => {
        try {
          const protocol = socket.getProtocol() || null;
          const cipherObj = socket.getCipher();
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;

          let daysRemaining: number | null = null;
          if (cert?.valid_to) {
            const expiry = new Date(cert.valid_to).getTime();
            if (!Number.isNaN(expiry)) {
              daysRemaining = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
            }
          }

          const issuer = cert?.issuer
            ? [cert.issuer.O, cert.issuer.CN].flat().filter(Boolean).join(' · ')
            : null;
          const rawSubjectCn = cert?.subject?.CN;
          const subject = Array.isArray(rawSubjectCn)
            ? rawSubjectCn.join(', ')
            : rawSubjectCn || null;
          const subjectAltNames = cert?.subjectaltname
            ? cert.subjectaltname
                .split(',')
                .map((s) => s.trim().replace(/^DNS:/i, ''))
                .slice(0, 8)
            : [];

          socket.end();
          resolve({
            protocol,
            cipher: cipherObj?.name || null,
            issuer,
            subject,
            subjectAltNames,
            validFrom: cert?.valid_from || null,
            validTo: cert?.valid_to || null,
            daysRemaining,
            authorized,
          });
        } catch {
          socket.destroy();
          resolve({
            protocol: null,
            cipher: null,
            issuer: null,
            subject: null,
            subjectAltNames: [],
            validFrom: null,
            validTo: null,
            daysRemaining: null,
            authorized: false,
          });
        }
      },
    );

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        protocol: null,
        cipher: null,
        issuer: null,
        subject: null,
        subjectAltNames: [],
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        authorized: false,
      });
    });

    socket.on('error', () => {
      resolve({
        protocol: null,
        cipher: null,
        issuer: null,
        subject: null,
        subjectAltNames: [],
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        authorized: false,
      });
    });
  });
}

async function inspectDns(hostname: string): Promise<DnsRecordsInfo> {
  const apexDomain = hostname.replace(/^www\./i, '');
  const info: DnsRecordsInfo = {
    a: [],
    aaaa: [],
    mx: [],
    ns: [],
    caa: [],
    spf: null,
    dmarc: null,
  };

  try {
    const [aRes, aaaaRes, mxRes, nsRes, caaRes, txtRes, dmarcRes] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname),
      dns.resolveMx(apexDomain),
      dns.resolveNs(apexDomain),
      dns.resolveCaa(apexDomain),
      dns.resolveTxt(apexDomain),
      dns.resolveTxt(`_dmarc.${apexDomain}`),
    ]);

    if (aRes.status === 'fulfilled') info.a = aRes.value;
    if (aaaaRes.status === 'fulfilled') info.aaaa = aaaaRes.value;
    if (mxRes.status === 'fulfilled') {
      info.mx = mxRes.value
        .sort((x, y) => x.priority - y.priority)
        .map((m) => `${m.priority} ${m.exchange}`);
    }
    if (nsRes.status === 'fulfilled') info.ns = nsRes.value;
    if (caaRes.status === 'fulfilled') {
      info.caa = caaRes.value.map((rec) =>
        `${rec.critical ? '128' : '0'} ${rec.issue ? `issue "${rec.issue}"` : rec.issuewild ? `issuewild "${rec.issuewild}"` : rec.iodef || ''}`.trim(),
      );
    }
    if (txtRes.status === 'fulfilled') {
      const flat = txtRes.value.map((chunks) => chunks.join(''));
      info.spf = flat.find((t) => /^v=spf1/i.test(t)) || null;
    }
    if (dmarcRes.status === 'fulfilled') {
      const flat = dmarcRes.value.map((chunks) => chunks.join(''));
      info.dmarc = flat.find((t) => /^v=dmarc1/i.test(t)) || null;
    }
  } catch (err) {
    info.lookupError = err instanceof Error ? err.message : 'Gagal mengambil record DNS';
  }

  return info;
}

async function probeEndpoint(
  url: string,
  method: 'GET' | 'HEAD' = 'HEAD',
  timeoutMs = 5000,
): Promise<{ status: number; headers: Record<string, string>; text: string; redirected: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MassbimLens/2.1 (+https://github.com/bimofakot)',
      },
    });
    const text = method === 'GET' ? await res.text() : '';
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      text,
      redirected: res.redirected,
    };
  } catch {
    return {
      status: 0,
      headers: {},
      text: '',
      redirected: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseCookies(setCookieHeaders: string[]): CookieAuditItem[] {
  return setCookieHeaders.map((raw) => {
    const parts = raw.split(';').map((p) => p.trim());
    const [nameVal, ...attrs] = parts;
    const eqIdx = nameVal.indexOf('=');
    const name = eqIdx > 0 ? nameVal.slice(0, eqIdx) : nameVal;
    const lowerAttrs = attrs.map((a) => a.toLowerCase());
    const sameSitePart = attrs.find((a) => /^samesite=/i.test(a));

    return {
      name,
      secure: lowerAttrs.includes('secure'),
      httpOnly: lowerAttrs.includes('httponly'),
      sameSite: sameSitePart ? sameSitePart.split('=')[1] || null : null,
      raw: raw.length > 140 ? `${raw.slice(0, 140)}…` : raw,
    };
  });
}

function detectTechStack(
  html: string,
  rawHeaders: Record<string, string>,
  cookies: CookieAuditItem[],
  $: cheerio.CheerioAPI,
): TechStackItem[] {
  const stack: TechStackItem[] = [];
  const seen = new Set<string>();
  const add = (name: string, category: TechStackItem['category'], evidence: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    stack.push({ name, category, evidence });
  };

  const lowerHtml = html.toLowerCase();
  const generator = $('meta[name="generator"]').attr('content') || '';
  const server = (rawHeaders['server'] || '').toLowerCase();
  const poweredBy = (rawHeaders['x-powered-by'] || '').toLowerCase();
  const cookieNames = cookies.map((c) => c.name.toLowerCase());
  const scriptSrcs = $('script[src]')
    .map((_, el) => $(el).attr('src') || '')
    .get()
    .join(' ')
    .toLowerCase();
  const linkHrefs = $('link[href]')
    .map((_, el) => $(el).attr('href') || '')
    .get()
    .join(' ')
    .toLowerCase();

  // Framework & UI
  if (/astro/i.test(generator) || lowerHtml.includes('/_astro/')) {
    add('Astro', 'Framework & UI', generator ? `meta generator: ${generator}` : 'Aset /_astro/');
  }
  if (lowerHtml.includes('/_next/') || lowerHtml.includes('__next_data__') || poweredBy.includes('next.js')) {
    add('Next.js', 'Framework & UI', 'Pola aset /_next/ atau __NEXT_DATA__');
  }
  if (lowerHtml.includes('/_nuxt/') || lowerHtml.includes('__nuxt')) {
    add('Nuxt', 'Framework & UI', 'Pola aset /_nuxt/ atau __NUXT__');
  }
  if (lowerHtml.includes('__remixcontext')) {
    add('Remix', 'Framework & UI', 'Marker __remixContext');
  }
  if (lowerHtml.includes('__sveltekit')) {
    add('SvelteKit', 'Framework & UI', 'Marker __sveltekit');
  }
  if (/gatsby/i.test(generator) || lowerHtml.includes('___gatsby')) {
    add('Gatsby', 'Framework & UI', 'Marker ___gatsby');
  }
  if (lowerHtml.includes('data-reactroot') || scriptSrcs.includes('react')) {
    add('React', 'Framework & UI', 'Marker React DOM / bundle');
  }
  if (lowerHtml.includes('data-v-') || scriptSrcs.includes('vue')) {
    add('Vue.js', 'Framework & UI', 'Atribut scoped data-v- / bundle Vue');
  }
  if (lowerHtml.includes('ng-version=')) {
    add('Angular', 'Framework & UI', 'Atribut ng-version');
  }
  if (scriptSrcs.includes('/@vite/client') || scriptSrcs.includes('vite')) {
    add('Vite', 'Framework & UI', 'Skrip Vite bundle');
  }
  if (linkHrefs.includes('tailwind') || /tw-[a-z-]+/i.test(html)) {
    add('Tailwind CSS', 'Framework & UI', 'Utilitas atau stylesheet Tailwind');
  }
  if (linkHrefs.includes('bootstrap') || scriptSrcs.includes('bootstrap')) {
    add('Bootstrap', 'Framework & UI', 'Asset CSS/JS Bootstrap');
  }
  if (scriptSrcs.includes('alpine') || lowerHtml.includes('x-data=')) {
    add('Alpine.js', 'Framework & UI', 'Direktif x-data / skrip Alpine');
  }
  if (scriptSrcs.includes('htmx') || lowerHtml.includes('hx-get=')) {
    add('HTMX', 'Framework & UI', 'Atribut hx-* / skrip HTMX');
  }
  if (scriptSrcs.includes('jquery')) {
    add('jQuery', 'Framework & UI', 'Skrip jQuery');
  }

  // Backend & CMS & E-Commerce
  if (
    cookieNames.some((c) => c.includes('laravel_session') || c === 'xsrf-token') ||
    lowerHtml.includes('livewire') ||
    lowerHtml.includes('wire:id') ||
    lowerHtml.includes('data-page="{')
  ) {
    add(
      'Laravel',
      'Backend & CMS',
      cookieNames.includes('laravel_session')
        ? 'Cookie laravel_session / XSRF-TOKEN'
        : 'Marker Livewire / Inertia',
    );
  }
  if (cookieNames.some((c) => c.includes('ci_session'))) {
    add('CodeIgniter', 'Backend & CMS', 'Cookie ci_session');
  }
  if (
    /wordpress/i.test(generator) ||
    lowerHtml.includes('/wp-content/') ||
    lowerHtml.includes('/wp-includes/')
  ) {
    add('WordPress', 'Backend & CMS', 'Path /wp-content/ atau meta generator');
  }
  if (lowerHtml.includes('woocommerce') || lowerHtml.includes('/wc-ajax=')) {
    add('WooCommerce', 'Backend & CMS', 'Marker WooCommerce DOM/JS');
  }
  if (lowerHtml.includes('cdn.shopify.com') || lowerHtml.includes('shopify.theme')) {
    add('Shopify', 'Backend & CMS', 'Aset cdn.shopify.com');
  }
  if (/webflow/i.test(generator) || lowerHtml.includes('webflow.com') || lowerHtml.includes('w-mod-js')) {
    add('Webflow', 'Backend & CMS', 'Atribut/generator Webflow');
  }
  if (/framer/i.test(generator) || lowerHtml.includes('framerusercontent.com')) {
    add('Framer', 'Backend & CMS', 'Generator atau aset Framer');
  }
  if (/wix/i.test(generator) || lowerHtml.includes('wixstatic.com')) {
    add('Wix', 'Backend & CMS', 'Aset wixstatic.com');
  }
  if (poweredBy.includes('express')) {
    add('Express (Node.js)', 'Backend & CMS', 'Header x-powered-by: Express');
  }
  if (poweredBy.includes('php') || cookieNames.includes('phpsessid')) {
    add('PHP', 'Backend & CMS', poweredBy.includes('php') ? `x-powered-by: ${rawHeaders['x-powered-by']}` : 'Cookie PHPSESSID');
  }
  if (poweredBy.includes('asp.net') || lowerHtml.includes('__viewstate')) {
    add('ASP.NET', 'Backend & CMS', 'Header ASP.NET atau __VIEWSTATE');
  }
  if (server.includes('nginx')) add('Nginx', 'Backend & CMS', `server: ${rawHeaders['server']}`);
  if (server.includes('apache')) add('Apache HTTP', 'Backend & CMS', `server: ${rawHeaders['server']}`);
  if (server.includes('litespeed')) add('LiteSpeed', 'Backend & CMS', `server: ${rawHeaders['server']}`);

  // Payment Gateways
  if (scriptSrcs.includes('midtrans.com') || lowerHtml.includes('snap.js') || lowerHtml.includes('app.midtrans.com')) {
    add('Midtrans', 'Payment Gateway', 'Integrasi Snap JS / domain midtrans.com');
  }
  if (scriptSrcs.includes('xendit.co') || lowerHtml.includes('checkout.xendit.co')) {
    add('Xendit', 'Payment Gateway', 'Skrip/checkout xendit.co');
  }
  if (lowerHtml.includes('doku.com') || scriptSrcs.includes('doku')) {
    add('DOKU', 'Payment Gateway', 'Referensi domain/skrip DOKU');
  }
  if (lowerHtml.includes('tripay.co.id')) {
    add('TriPay', 'Payment Gateway', 'Referensi tripay.co.id');
  }
  if (lowerHtml.includes('duitku.com')) {
    add('Duitku', 'Payment Gateway', 'Referensi duitku.com');
  }
  if (scriptSrcs.includes('js.stripe.com') || lowerHtml.includes('stripe.com/v3')) {
    add('Stripe', 'Payment Gateway', 'Skrip js.stripe.com');
  }
  if (scriptSrcs.includes('paypal.com/sdk')) {
    add('PayPal SDK', 'Payment Gateway', 'Skrip paypal.com/sdk');
  }
  if (scriptSrcs.includes('checkout.razorpay.com')) {
    add('Razorpay', 'Payment Gateway', 'Skrip checkout.razorpay.com');
  }

  // Admin & Auth
  if (lowerHtml.includes('filament') && (lowerHtml.includes('livewire') || lowerHtml.includes('fi-'))) {
    add('Laravel Filament', 'Admin & Auth', 'Kelas UI fi-* / Livewire');
  }
  if (lowerHtml.includes('firebase') && (lowerHtml.includes('firebaseauth') || lowerHtml.includes('firebaseapp'))) {
    add('Firebase Auth/SDK', 'Admin & Auth', 'Referensi Firebase SDK');
  }
  if (lowerHtml.includes('supabase.co') || lowerHtml.includes('@supabase')) {
    add('Supabase', 'Admin & Auth', 'Endpoint/SDK supabase.co');
  }
  if (scriptSrcs.includes('clerk') || lowerHtml.includes('clerk.accounts')) {
    add('Clerk Auth', 'Admin & Auth', 'Skrip/domain Clerk');
  }
  if (lowerHtml.includes('auth0.com')) {
    add('Auth0', 'Admin & Auth', 'Referensi auth0.com');
  }

  // CDN & Hosting
  if (rawHeaders['cf-ray'] || server.includes('cloudflare')) {
    add('Cloudflare', 'CDN & Hosting', `cf-ray: ${rawHeaders['cf-ray'] || 'server header'}`);
  }
  if (rawHeaders['x-served-by']?.includes('cache-') || rawHeaders['x-timer']) {
    add('Fastly / Firebase Hosting', 'CDN & Hosting', `x-served-by: ${rawHeaders['x-served-by'] || 'Fastly cache'}`);
  }
  if (rawHeaders['x-vercel-id'] || server.includes('vercel')) {
    add('Vercel', 'CDN & Hosting', `x-vercel-id: ${rawHeaders['x-vercel-id'] || 'server header'}`);
  }
  if (rawHeaders['x-nf-request-id'] || server.includes('netlify')) {
    add('Netlify', 'CDN & Hosting', 'Header x-nf-request-id / Netlify');
  }
  if (rawHeaders['x-amz-cf-id'] || server.includes('cloudfront')) {
    add('AWS CloudFront', 'CDN & Hosting', 'Header x-amz-cf-id');
  }
  if (server.includes('github.com')) {
    add('GitHub Pages', 'CDN & Hosting', 'Header server GitHub.com');
  }

  // Analytics & Ads
  if (scriptSrcs.includes('googletagmanager.com/gtag') || lowerHtml.includes('gtag(')) {
    add('Google Analytics (GA4)', 'Analytics & Ads', 'Skrip gtag.js');
  }
  if (scriptSrcs.includes('googletagmanager.com/gtm.js')) {
    add('Google Tag Manager', 'Analytics & Ads', 'Skrip gtm.js');
  }
  if (scriptSrcs.includes('googlesyndication.com') || lowerHtml.includes('adsbygoogle')) {
    add('Google AdSense', 'Analytics & Ads', 'Skrip pagead2.googlesyndication.com');
  }
  if (scriptSrcs.includes('connect.facebook.net') || lowerHtml.includes('fbq(')) {
    add('Meta Pixel', 'Analytics & Ads', 'Skrip fbevents.js / fbq');
  }
  if (scriptSrcs.includes('clarity.ms')) {
    add('Microsoft Clarity', 'Analytics & Ads', 'Skrip clarity.ms');
  }
  if (scriptSrcs.includes('hotjar.com')) {
    add('Hotjar', 'Analytics & Ads', 'Skrip hotjar.com');
  }

  return stack;
}

// ============================================================================
// Theme Posture & Heuristic AI/Template Analysis
// ============================================================================

function analyzeThemeSupport(html: string, cssText: string, $: cheerio.CheerioAPI): ThemeSupportInfo {
  const colorSchemeMeta = $('meta[name="color-scheme"]').attr('content') || null;
  const combinedText = `${html}\n${cssText}`;
  const hasPrefersColorScheme = /prefers-color-scheme\s*:\s*dark/i.test(combinedText);
  const hasDarkClassOrAttr =
    /\.dark\b|data-theme|theme-toggle|darkMode|classList\.toggle\(['"]dark['"]/i.test(combinedText);

  if (
    hasPrefersColorScheme ||
    hasDarkClassOrAttr ||
    (colorSchemeMeta && /light\s+dark|dark\s+light/i.test(colorSchemeMeta))
  ) {
    return {
      posture: 'dual',
      label: 'Dual Theme (Light & Dark Mode)',
      hasPrefersColorScheme,
      hasDarkClassOrAttr,
      colorSchemeMeta,
      details:
        'Website terdeteksi mendukung mode terang & gelap (prefers-color-scheme / toggle tema). Pastikan kontras teks, border, dan gambar tetap >= 4.5:1 di kedua mode.',
    };
  }

  if (
    colorSchemeMeta?.toLowerCase().trim() === 'dark' ||
    /<body[^>]*class=["'][^"']*(bg-slate-950|bg-gray-950|bg-black|dark-theme)[^"']*["']/i.test(html)
  ) {
    return {
      posture: 'dark-only',
      label: 'Dark Mode Terencana',
      hasPrefersColorScheme,
      hasDarkClassOrAttr,
      colorSchemeMeta,
      details:
        'Website sengaja menggunakan palet gelap tunggal (Dark-Only). Pastikan meta color-scheme="dark" terpasang agar scrollbar dan form kontrol browser serasi.',
    };
  }

  if (colorSchemeMeta?.toLowerCase().trim() === 'light') {
    return {
      posture: 'light-only',
      label: 'Light Mode Terencana',
      hasPrefersColorScheme,
      hasDarkClassOrAttr,
      colorSchemeMeta,
      details:
        'Website mendeklarasikan mode terang tunggal (color-scheme="light") secara eksplisit.',
    };
  }

  return {
    posture: 'unspecified',
    label: 'Tunggal (Tanpa Deklarasi color-scheme)',
    hasPrefersColorScheme,
    hasDarkClassOrAttr,
    colorSchemeMeta,
    details:
      'Tidak ditemukan dukungan dual-theme maupun deklarasi <meta name="color-scheme">. Jika website memang dirancang khusus light-only atau dark-only, deklarasikan meta color-scheme untuk konsistensi UI bawaan browser.',
  };
}

function analyzeAiAndTemplateSignals(
  html: string,
  cssText: string,
  $: cheerio.CheerioAPI,
): AiTemplateAnalysis {
  const signals: AiTemplateSignalItem[] = [];
  const lowerHtml = html.toLowerCase();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const lowerBody = bodyText.toLowerCase();
  const generator = $('meta[name="generator"]').attr('content') || '';

  if (lowerHtml.includes('elementor-') || lowerHtml.includes('/wp-content/themes/')) {
    const themeMatch = html.match(/\/wp-content\/themes\/([a-zA-Z0-9_-]+)/);
    signals.push({
      label: 'Template CMS WordPress / Page Builder',
      evidence: themeMatch ? `Tema terdeteksi: ${themeMatch[1]}` : 'Kelas CSS Elementor / wp-content',
      weight: 'high',
    });
  }
  if (
    /webflow|framer|wix|squarespace/i.test(generator) ||
    lowerHtml.includes('w-mod-js') ||
    lowerHtml.includes('framerusercontent')
  ) {
    signals.push({
      label: 'Builder Visual / Template Platform',
      evidence: generator || 'Struktur DOM builder visual (Webflow/Framer/Wix)',
      weight: 'high',
    });
  }
  if (/lorem ipsum|dolor sit amet|your company name|acme corp/i.test(lowerBody)) {
    signals.push({
      label: 'Teks Placeholder Bawaan Template',
      evidence: 'Ditemukan frasa placeholder (Lorem Ipsum / contoh generik)',
      weight: 'high',
    });
  }
  if (
    /^(vite \+ react|create next app|react app|document|my google ai studio app)$/i.test(
      $('title').text().trim(),
    )
  ) {
    signals.push({
      label: 'Judul Bawaan Starter Kit Belum Diganti',
      evidence: `<title>${$('title').text().trim()}</title>`,
      weight: 'high',
    });
  }

  const aiBuzzwords = [
    'unlock the power',
    'elevate your',
    'supercharge your',
    'seamless experience',
    'cutting-edge solution',
    'revolutionize your',
    'tingkatkan bisnis anda ke level berikutnya',
    'solusi all-in-one',
  ];
  const matchedBuzz = aiBuzzwords.filter((w) => lowerBody.includes(w));
  if (matchedBuzz.length >= 2) {
    signals.push({
      label: 'Pola Copywriting Generik Umum pada Konten AI',
      evidence: `Frasa terdeteksi: "${matchedBuzz.join('", "')}"`,
      weight: 'medium',
    });
  }

  const rounded2xlCount = (html.match(/rounded-2xl/g) || []).length;
  const gradientTextCount = (html.match(/bg-gradient-to-[a-z]+/g) || []).length;
  const purpleIndigoCount = (html.match(/(from-purple-|via-indigo-|to-pink-|shadow-purple-)/g) || [])
    .length;
  if (rounded2xlCount >= 6 && (gradientTextCount >= 3 || purpleIndigoCount >= 2)) {
    signals.push({
      label: 'Kepadatan Pola Utilitas UI AI Scaffolding (Rounded Cards + Gradien)',
      evidence: `${rounded2xlCount} elemen rounded-2xl, ${gradientTextCount} kelas bg-gradient-to-*`,
      weight: 'medium',
    });
  }

  const lucideSvgCount = $('svg[class*="lucide"]').length;
  if (lucideSvgCount >= 12) {
    signals.push({
      label: 'Penggunaan Massal Ikon Library Standar (Lucide)',
      evidence: `${lucideSvgCount} ikon SVG Lucide terdeteksi di DOM awal`,
      weight: 'low',
    });
  }

  if (
    cssText.includes('Plus Jakarta Sans') === false &&
    lowerHtml.includes('fonts.googleapis.com/css2?family=inter')
  ) {
    signals.push({
      label: 'Tipografi Default Starter UI (Inter)',
      evidence: 'Memuat Google Fonts Inter sebagai font utama',
      weight: 'low',
    });
  }

  const hasTemplateBuilder = signals.some(
    (s) => s.label.includes('Template') || s.label.includes('Builder Visual'),
  );
  const highOrMediumCount = signals.filter((s) => s.weight === 'high' || s.weight === 'medium').length;
  const penalty = signals.reduce(
    (sum, s) => sum + (s.weight === 'high' ? 28 : s.weight === 'medium' ? 16 : 6),
    0,
  );
  const customAuthenticityScore = Math.max(15, 100 - penalty);

  let verdict: AiTemplateAnalysis['verdict'] = 'custom-code';
  let verdictLabel = 'Terindikasi Kode Kustom / Dirancang Khusus';
  let confidenceLabel = 'Orisinalitas Tinggi';
  let summary =
    'Tidak ditemukan jejak template pasaran populer maupun pola scaffolding AI generik yang dominan. Struktur HTML & CSS tampak dibangun secara khusus.';

  if (hasTemplateBuilder && highOrMediumCount >= 2) {
    verdict = 'mixed-signals';
    verdictLabel = 'Kombinasi Template / Builder & Pola Generik';
    confidenceLabel = 'Indikasi Campuran';
    summary =
      'Terdapat tanda penggunaan platform/template siap pakai sekaligus pola desain atau teks generik.';
  } else if (hasTemplateBuilder) {
    verdict = 'cms-template';
    verdictLabel = 'Menggunakan Template CMS / Visual Builder';
    confidenceLabel = 'Terdeteksi Signature Builder';
    summary =
      'Website dibangun di atas platform CMS atau visual builder berbasis template yang umum dipakai.';
  } else if (highOrMediumCount >= 2) {
    verdict = 'ai-assisted-pattern';
    verdictLabel = 'Terdeteksi Pola UI Scaffolding / AI-Assisted';
    confidenceLabel = 'Indikasi Pola Heuristik';
    summary =
      'Ditemukan kombinasi pola komponen, utilitas gradien/kartu, atau copywriting yang sering muncul pada website hasil generator AI atau starter kit.';
  }

  return {
    verdict,
    verdictLabel,
    confidenceLabel,
    customAuthenticityScore,
    summary,
    signals,
    disclaimer:
      'Catatan transparansi: Analisis ini bersifat heuristik berdasarkan pola DOM, kelas CSS, meta generator, dan teks publik. Hasil bukan bukti mutlak apakah manusia atau AI yang menulis kode.',
  };
}

// ============================================================================
// Weighted Partial-Credit Scoring (passed=100%, info=60%, warning=30%, critical=0%)
// ============================================================================

function getEarnedPoints(passed: boolean, severity: AuditFinding['severity'], impactWeight: number): number {
  if (passed) return impactWeight;
  if (severity === 'info') return Math.round(impactWeight * 0.6);
  if (severity === 'warning') return Math.round(impactWeight * 0.3);
  return 0;
}

function buildCategoryScores(findings: AuditFinding[]): Record<AuditCategory, CategoryScore> {
  const labels: Record<AuditCategory, string> = {
    performance: 'Performa',
    accessibility: 'Aksesibilitas',
    seo: 'SEO',
    security: 'Keamanan',
    pwa: 'PWA & Installability',
    ai_origin: 'Pola AI & Desain',
  };

  const result = {} as Record<AuditCategory, CategoryScore>;
  (['performance', 'accessibility', 'seo', 'security', 'pwa', 'ai_origin'] as AuditCategory[]).forEach(
    (cat) => {
      const items = findings.filter((f) => f.category === cat);
      const maxPoints = items.reduce((sum, item) => sum + item.impactWeight, 0);
      const earnedPoints = items.reduce(
        (sum, item) => sum + getEarnedPoints(item.passed, item.severity, item.impactWeight),
        0,
      );
      const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 100;

      result[cat] = {
        category: cat,
        label: labels[cat],
        score,
        maxPoints,
        earnedPoints,
        criticalCount: items.filter((i) => !i.passed && i.severity === 'critical').length,
        warningCount: items.filter((i) => !i.passed && i.severity === 'warning').length,
        infoCount: items.filter((i) => !i.passed && i.severity === 'info').length,
        passCount: items.filter((i) => i.passed).length,
      };
    },
  );

  return result;
}

// ============================================================================
// Main Live Audit Orchestrator (Express Inspection & Deep Crawl Audit)
// ============================================================================

export async function runLiveAudit(
  rawTargetUrl: string,
  mode: ScanMode = 'express',
  options?: { allowInternalSelf?: boolean },
): Promise<AuditReport> {
  const scanStart = performance.now();
  const targetUrl = options?.allowInternalSelf
    ? new URL(rawTargetUrl)
    : await validatePublicUrl(rawTargetUrl);
  const partialReasons: string[] = [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const startMs = performance.now();
  let response: Response;
  let redirectCount = 0;
  let currentUrl = targetUrl.toString();

  try {
    let hop = 0;
    while (true) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'MassbimLens/2.1 (+https://github.com/bimofakot)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'br, gzip, deflate',
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location') && hop < 5) {
        redirectCount += 1;
        hop += 1;
        currentUrl = new URL(res.headers.get('location')!, currentUrl).toString();
        continue;
      }
      response = res;
      break;
    }
  } finally {
    clearTimeout(timeout);
  }

  const ttfbMs = Math.round(performance.now() - startMs);
  const html = await response.text();
  const totalTimeMs = Math.round(performance.now() - startMs);

  const finalUrlObj = new URL(response.url || targetUrl.toString());
  const origin = finalUrlObj.origin;

  const rawHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    rawHeaders[key.toLowerCase()] = value;
  });

  const setCookieList =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : rawHeaders['set-cookie']
        ? [rawHeaders['set-cookie']]
        : [];
  const cookies = parseCookies(setCookieList);

  const htmlBytes = Buffer.byteLength(html, 'utf8');
  const $ = cheerio.load(html);

  if (
    response.status === 403 ||
    response.status === 429 ||
    /just a moment\.\.\.|cf-browser-verification|access denied|attention required/i.test($('title').text())
  ) {
    partialReasons.push(
      `Halaman utama mengembalikan HTTP ${response.status} atau tantangan bot/WAF sehingga isi DOM sebenarnya tidak sepenuhnya dapat dibaca.`,
    );
  }

  const title = $('title').first().text().trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const lang = ($('html').attr('lang') || '').trim() || null;
  const h1Texts = $('h1')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const headingSequence = $('h1, h2, h3, h4, h5, h6')
    .map((_, el) => `${el.tagName.toUpperCase()}: ${$(el).text().trim().replace(/\s+/g, ' ').slice(0, 48)}`)
    .get();

  const imgs = $('img').toArray();
  const emptyAltImages = imgs.filter((el) => {
    const alt = $(el).attr('alt');
    return alt === undefined || alt.trim() === '';
  }).length;
  const nonDecorativeEmptyAltImages = imgs.filter((el) => {
    const alt = $(el).attr('alt');
    const isAriaHidden = $(el).closest('[aria-hidden="true"]').length > 0;
    return isAriaHidden ? alt === undefined : alt === undefined || alt.trim() === '';
  }).length;
  const missingWidthHeightImages = imgs.filter(
    (el) => !$(el).attr('width') || !$(el).attr('height'),
  ).length;
  const eagerLcpCandidate = imgs.find(
    (el) => $(el).attr('fetchpriority') === 'high' || $(el).attr('loading') !== 'lazy',
  );

  const blankLinks = $('a[target="_blank"]').toArray();
  const externalBlankLinks = blankLinks.filter((el) => {
    const href = $(el).attr('href') || '';
    return /^https?:\/\//i.test(href) && !href.startsWith(origin);
  });
  const externalLinksMissingNoreferrer = externalBlankLinks.filter((el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase();
    return !rel.includes('noopener') || !rel.includes('noreferrer');
  }).length;

  const inlineScriptCount = $('script:not([src])').filter((_, el) => {
    const type = ($(el).attr('type') || '').toLowerCase();
    return type !== 'application/ld+json';
  }).length;

  const externalScripts = $('script[src]').toArray();
  const renderBlockingScripts = externalScripts.filter((el) => {
    const type = ($(el).attr('type') || '').toLowerCase();
    const isAsyncOrDefer = $(el).attr('async') !== undefined || $(el).attr('defer') !== undefined;
    const isInHead = $(el).closest('head').length > 0;
    return isInHead && type !== 'module' && !isAsyncOrDefer;
  });

  const stylesheets = $('link[rel="stylesheet"]').toArray();
  const preloadCount = $('link[rel="preload"]').length;
  const firstStaticHref = $(stylesheets[0]).attr('href') || $(externalScripts[0]).attr('src') || null;

  const firstLinkHref = $('a[href^="#"]').first().attr('href') || '';
  const hasSkipLink =
    firstLinkHref.toLowerCase().includes('main') ||
    firstLinkHref.toLowerCase().includes('content') ||
    $('a[class*="skip" i]').length > 0;

  const hasMainLandmark = $('main').length > 0;
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  const ogTitle = $('meta[property="og:title"]').attr('content') || null;
  const ogDescription = $('meta[property="og:description"]').attr('content') || null;
  const ogImage = $('meta[property="og:image"]').attr('content') || null;
  const twitterTitle = $('meta[name="twitter:title"]').attr('content') || null;
  const twitterDescription = $('meta[name="twitter:description"]').attr('content') || null;
  const hasOgTags = Boolean(ogTitle) && Boolean(ogDescription) && Boolean(ogImage);
  const hasTwitterCard = Boolean($('meta[name="twitter:card"]').attr('content'));
  const generator = $('meta[name="generator"]').attr('content') || null;
  const hasMarqueeOrAutoScroll = $('[class*="marquee" i]').length > 0;

  // Mixed Content Scan
  const mixedContent: MixedContentItem[] = [];
  if (finalUrlObj.protocol === 'https:') {
    const mixedChecks: [string, string][] = [
      ['script', 'src'],
      ['link', 'href'],
      ['img', 'src'],
      ['iframe', 'src'],
      ['video', 'src'],
      ['audio', 'src'],
      ['form', 'action'],
    ];
    for (const [tag, attr] of mixedChecks) {
      $(tag).each((_, el) => {
        const val = ($(el).attr(attr) || '').trim();
        if (/^http:\/\//i.test(val)) {
          mixedContent.push({ tag, attribute: attr, url: val });
        }
      });
    }
  }

  // PWA & Manifest & Service Worker deep inspection
  const viewport = $('meta[name="viewport"]').attr('content') || null;
  const blocksZoom = Boolean(
    viewport &&
      (/user-scalable\s*=\s*(no|0)/i.test(viewport) || /maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport)),
  );
  const hasFavicon = $('link[rel~="icon"]').length > 0;
  const appleIconHref = $('link[rel="apple-touch-icon"]').attr('href') || '';
  const hasAppleTouchIcon = Boolean(appleIconHref);
  const manifestHref = $('link[rel="manifest"]').attr('href') || null;
  const manifestUrl = manifestHref ? new URL(manifestHref, origin).toString() : null;
  const themeColor = $('meta[name="theme-color"]').attr('content') || null;

  // Collect links for integrity check
  const discoveredLinksMap = new Map<string, 'internal' | 'external'>();
  $('a[href]').each((_, el) => {
    const rawHref = ($(el).attr('href') || '').trim();
    if (!rawHref || rawHref.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(rawHref)) {
      return;
    }
    try {
      const resolved = new URL(rawHref, finalUrlObj.toString());
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return;
      const clean = `${resolved.origin}${resolved.pathname}${resolved.search}`;
      const type = resolved.origin === origin ? 'internal' : 'external';
      if (!discoveredLinksMap.has(clean)) {
        discoveredLinksMap.set(clean, type);
      }
    } catch {
      // Ignore malformed URLs
    }
  });

  const staticAssetUrl = firstStaticHref ? new URL(firstStaticHref, origin).toString() : null;

  // Run Parallel Core Network Probes
  const [
    tlsInfo,
    dnsInfo,
    robotsRes,
    sitemapRes,
    sitemapIndexRes,
    securityTxtRes,
    staticAssetRes,
    manifestRes,
    swDirectRes,
    registerSwRes,
    firstCssRes,
  ] = await Promise.all([
    finalUrlObj.protocol === 'https:'
      ? inspectTls(finalUrlObj.hostname, Number(finalUrlObj.port || 443))
      : Promise.resolve<TlsInfo>({
          protocol: null,
          cipher: null,
          issuer: null,
          subject: null,
          subjectAltNames: [],
          validFrom: null,
          validTo: null,
          daysRemaining: null,
          authorized: false,
        }),
    inspectDns(finalUrlObj.hostname),
    probeEndpoint(`${origin}/robots.txt`, 'GET'),
    probeEndpoint(`${origin}/sitemap.xml`, 'HEAD'),
    probeEndpoint(`${origin}/sitemap-index.xml`, 'HEAD'),
    probeEndpoint(`${origin}/.well-known/security.txt`, 'HEAD'),
    staticAssetUrl
      ? probeEndpoint(staticAssetUrl, 'HEAD')
      : Promise.resolve({ status: 0, headers: {} as Record<string, string>, text: '', redirected: false }),
    manifestUrl
      ? probeEndpoint(manifestUrl, 'GET', 4500)
      : probeEndpoint(`${origin}/manifest.webmanifest`, 'GET', 3500),
    probeEndpoint(`${origin}/sw.js`, 'HEAD', 3500),
    probeEndpoint(`${origin}/registerSW.js`, 'HEAD', 3500),
    $(stylesheets[0]).attr('href')
      ? probeEndpoint(new URL($(stylesheets[0]).attr('href')!, origin).toString(), 'GET', 4000)
      : Promise.resolve({ status: 0, headers: {} as Record<string, string>, text: '', redirected: false }),
  ]);

  // Parse Manifest JSON if present
  const manifestInspection: PwaManifestInspection = {
    found: false,
    url: manifestUrl || (manifestRes.status === 200 ? `${origin}/manifest.webmanifest` : null),
    status: manifestRes.status || null,
    name: null,
    shortName: null,
    shortNameLengthOk: false,
    hasId: false,
    startUrl: null,
    scope: null,
    display: null,
    themeColor: null,
    backgroundColor: null,
    hasIcon192: false,
    hasIcon512: false,
    hasSeparateMaskable: false,
    rawJsonPreview: null,
  };

  if (manifestRes.status === 200 && manifestRes.text) {
    try {
      const m = JSON.parse(manifestRes.text) as Record<string, unknown>;
      manifestInspection.found = true;
      manifestInspection.name = typeof m.name === 'string' ? m.name : null;
      manifestInspection.shortName = typeof m.short_name === 'string' ? m.short_name : null;
      manifestInspection.shortNameLengthOk =
        typeof m.short_name === 'string' && m.short_name.length > 0 && m.short_name.length <= 12;
      manifestInspection.hasId = typeof m.id === 'string' && m.id.length > 0;
      manifestInspection.startUrl = typeof m.start_url === 'string' ? m.start_url : null;
      manifestInspection.scope = typeof m.scope === 'string' ? m.scope : null;
      manifestInspection.display = typeof m.display === 'string' ? m.display : null;
      manifestInspection.themeColor = typeof m.theme_color === 'string' ? m.theme_color : null;
      manifestInspection.backgroundColor =
        typeof m.background_color === 'string' ? m.background_color : null;

      if (Array.isArray(m.icons)) {
        const icons = m.icons as Array<{ sizes?: string; purpose?: string }>;
        manifestInspection.hasIcon192 = icons.some((i) => (i.sizes || '').includes('192x192'));
        manifestInspection.hasIcon512 = icons.some((i) => (i.sizes || '').includes('512x512'));
        const maskable = icons.some((i) => (i.purpose || '').trim() === 'maskable');
        const anyOnly = icons.some((i) => !i.purpose || i.purpose.trim() === 'any');
        manifestInspection.hasSeparateMaskable = maskable && anyOnly;
      }
      manifestInspection.rawJsonPreview = JSON.stringify(m, null, 2).slice(0, 700);
    } catch {
      // Invalid JSON in manifest
    }
  }

  // Service Worker detection across HTML + /sw.js + /registerSW.js
  const hasInlineSw = /serviceWorker\.register|registerSW\.js|workbox/i.test(html);
  const serviceWorkerDetected =
    hasInlineSw || swDirectRes.status === 200 || registerSwRes.status === 200;
  const serviceWorkerEvidence = hasInlineSw
    ? 'Registrasi serviceWorker / registerSW terdeteksi pada dokumen HTML'
    : swDirectRes.status === 200
      ? `Berkas /sw.js aktif (HTTP 200)`
      : registerSwRes.status === 200
        ? `Berkas /registerSW.js aktif (HTTP 200)`
        : 'Tidak ditemukan registrasi Service Worker pada HTML maupun /sw.js';

  const cssSample = firstCssRes.text.slice(0, 150000);
  const themeSupport = analyzeThemeSupport(html, cssSample, $);
  const aiTemplateAnalysis = analyzeAiAndTemplateSignals(html, cssSample, $);
  const techStack = detectTechStack(html, rawHeaders, cookies, $);

  const assetUrlsToSize = [
    ...stylesheets.map((el) => $(el).attr('href')).filter(Boolean),
    ...externalScripts.map((el) => $(el).attr('src')).filter(Boolean),
  ]
    .slice(0, 6)
    .map((u) => new URL(u!, origin).toString());

  const assetHeadResults = await Promise.all(
    assetUrlsToSize.map((u) => probeEndpoint(u, 'HEAD', 3500)),
  );
  let sampledAssetBytes = 0;
  for (const r of assetHeadResults) {
    const len = Number(r.headers['content-length'] || 0);
    if (!Number.isNaN(len)) sampledAssetBytes += len;
  }

  const assetBreakdown: AssetBreakdown = {
    htmlKb: Number((htmlBytes / 1024).toFixed(1)),
    stylesheetsCount: stylesheets.length,
    externalScriptsCount: externalScripts.length,
    imagesCount: imgs.length,
    sampledAssetKb: Number(((htmlBytes + sampledAssetBytes) / 1024).toFixed(1)),
  };

  // Broken Links Probe
  const linkLimit = mode === 'deep' ? 25 : 12;
  const linksToProbe = Array.from(discoveredLinksMap.entries()).slice(0, linkLimit);
  const linkAudit: LinkProbeItem[] = await Promise.all(
    linksToProbe.map(async ([url, type]) => {
      const res = await probeEndpoint(url, 'HEAD', 4500);
      const finalRes = res.status === 405 ? await probeEndpoint(url, 'GET', 4500) : res;
      const ok = finalRes.status >= 200 && finalRes.status < 400;
      return {
        url,
        type,
        status: finalRes.status,
        ok,
        redirected: finalRes.redirected,
      };
    }),
  );

  const timedOutLinks = linkAudit.filter((l) => l.status === 0).length;
  if (timedOutLinks > 0) {
    partialReasons.push(`${timedOutLinks} tautan tidak merespons (timeout) saat verifikasi status.`);
  }

  // Deep Crawl Audit Mode
  const deepCrawlPages: DeepCrawlPageItem[] = [];
  const adminExposures: AdminExposureItem[] = [];
  let pagesDiscovered = 1;

  if (mode === 'deep') {
    const candidateInternalUrls = new Set<string>();
    candidateInternalUrls.add(finalUrlObj.toString());

    for (const [u, type] of discoveredLinksMap.entries()) {
      if (type === 'internal') candidateInternalUrls.add(u);
    }

    const sitemapUrlToParse =
      sitemapRes.status === 200
        ? `${origin}/sitemap.xml`
        : sitemapIndexRes.status === 200
          ? `${origin}/sitemap-index.xml`
          : null;
    if (sitemapUrlToParse) {
      const sm = await probeEndpoint(sitemapUrlToParse, 'GET', 5000);
      const locs = Array.from(sm.text.matchAll(/<loc>(.*?)<\/loc>/gi)).map((m) => m[1].trim());
      for (const loc of locs) {
        if (loc.endsWith('.xml')) {
          const childSm = await probeEndpoint(loc, 'GET', 4500);
          const childLocs = Array.from(childSm.text.matchAll(/<loc>(.*?)<\/loc>/gi)).map((m) =>
            m[1].trim(),
          );
          childLocs.forEach((c) => candidateInternalUrls.add(c));
        } else {
          candidateInternalUrls.add(loc);
        }
      }
    }

    pagesDiscovered = candidateInternalUrls.size;
    const crawlList = Array.from(candidateInternalUrls).slice(0, 20);

    const crawled = await Promise.all(
      crawlList.map(async (pageUrl): Promise<DeepCrawlPageItem> => {
        if (pageUrl === finalUrlObj.toString()) {
          return {
            url: pageUrl,
            status: response.status,
            title,
            metaDescLength: metaDescription.length,
            h1Count: h1Texts.length,
            ttfbMs,
          };
        }
        const t0 = performance.now();
        const res = await probeEndpoint(pageUrl, 'GET', 6000);
        const dt = Math.round(performance.now() - t0);
        if (res.status === 0) {
          return {
            url: pageUrl,
            status: 0,
            title: '',
            metaDescLength: 0,
            h1Count: 0,
            ttfbMs: dt,
            error: 'Timeout / tidak terjangkau',
          };
        }
        const p$ = cheerio.load(res.text);
        return {
          url: pageUrl,
          status: res.status,
          title: p$('title').first().text().trim(),
          metaDescLength: (p$('meta[name="description"]').attr('content') || '').trim().length,
          h1Count: p$('h1').length,
          ttfbMs: dt,
        };
      }),
    );

    const titleCounts = new Map<string, number>();
    for (const p of crawled) {
      if (p.title) titleCounts.set(p.title, (titleCounts.get(p.title) || 0) + 1);
    }
    for (const p of crawled) {
      if (p.title && (titleCounts.get(p.title) || 0) > 1) {
        p.duplicateTitle = true;
      }
      deepCrawlPages.push(p);
    }

    const failedPages = deepCrawlPages.filter(
      (p) => p.status === 0 || p.status === 429 || p.status === 403,
    ).length;
    if (failedPages > 0) {
      partialReasons.push(
        `${failedPages} halaman internal gagal atau diblokir (HTTP 403/429/Timeout) saat Deep Crawl.`,
      );
    }
    if (pagesDiscovered > crawlList.length) {
      partialReasons.push(
        `Situs memiliki ${pagesDiscovered} URL internal terdeteksi; Deep Crawl membatasi pemeriksaan pada ${crawlList.length} halaman pertama.`,
      );
    }

    const sensitivePaths = [
      { path: '/.env', note: 'File konfigurasi environment sensitif' },
      { path: '/.git/config', note: 'Metadata repositori Git' },
      { path: '/wp-login.php', note: 'Halaman login admin WordPress' },
      { path: '/admin', note: 'Panel admin umum' },
      { path: '/dashboard', note: 'Halaman dashboard aplikasi' },
    ];
    const exposureResults = await Promise.all(
      sensitivePaths.map(async (item) => {
        const res = await probeEndpoint(`${origin}${item.path}`, 'HEAD', 3500);
        const isCriticalLeak =
          (item.path === '/.env' || item.path === '/.git/config') && res.status === 200;
        const isAdminAccessible = res.status === 200 || res.status === 302;
        return {
          path: item.path,
          status: res.status,
          accessible:
            isCriticalLeak ||
            (item.path !== '/.env' && item.path !== '/.git/config' && isAdminAccessible),
          note: item.note,
        };
      }),
    );
    adminExposures.push(...exposureResults);
  }

  const probes: AuxiliaryProbes = {
    robotsTxt: {
      status: robotsRes.status,
      hasSitemap: /^sitemap:/im.test(robotsRes.text),
      preview: robotsRes.text.slice(0, 500),
    },
    sitemapXml: { url: `${origin}/sitemap.xml`, status: sitemapRes.status },
    sitemapIndexXml: { url: `${origin}/sitemap-index.xml`, status: sitemapIndexRes.status },
    securityTxt: { status: securityTxtRes.status },
    staticAssetCache: {
      url: staticAssetUrl,
      cacheControl: staticAssetRes.headers['cache-control'] || null,
      status: staticAssetRes.status || null,
    },
  };

  const dom: DomSummary = {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    lang,
    h1Count: h1Texts.length,
    h1Texts,
    headingSequence,
    totalImages: imgs.length,
    emptyAltImages,
    missingWidthHeightImages,
    externalBlankLinks: externalBlankLinks.length,
    externalLinksMissingNoreferrer,
    inlineScriptCount,
    externalScriptCount: externalScripts.length,
    stylesheetCount: stylesheets.length,
    preloadCount,
    hasSkipLink,
    hasMainLandmark,
    hasJsonLd,
    hasOgTags,
    hasTwitterCard,
    ogTitle,
    ogDescription,
    ogImage,
    twitterTitle,
    twitterDescription,
    generator,
  };

  const network: NetworkMetrics = {
    requestedUrl: targetUrl.toString(),
    finalUrl: finalUrlObj.toString(),
    statusCode: response.status,
    ttfbMs,
    totalTimeMs,
    htmlBytes,
    contentEncoding: rawHeaders['content-encoding'] || null,
    serverHeader: rawHeaders['server'] || rawHeaders['x-served-by'] || null,
    redirectCount,
    httpVersion: 'HTTP/2',
  };

  // ==================== BUILD WEIGHTED FINDINGS ACROSS 6 CATEGORIES ====================
  const findings: AuditFinding[] = [];

  // --- 1. SECURITY ---
  const isHttps = finalUrlObj.protocol === 'https:';
  findings.push({
    id: 'sec-https-tls',
    category: 'security',
    severity: isHttps && tlsInfo.authorized ? 'pass' : 'critical',
    title: 'Enkripsi HTTPS & Validitas Sertifikat TLS',
    impactWeight: 18,
    passed: isHttps && tlsInfo.authorized,
    summary:
      isHttps && tlsInfo.authorized
        ? `Koneksi terenkripsi aktif (${tlsInfo.protocol || 'TLS'}) dengan sertifikat valid (${tlsInfo.daysRemaining ?? '?'} hari tersisa).`
        : 'Situs tidak memakai HTTPS atau sertifikat TLS tidak valid/kedaluwarsa.',
    evidence: isHttps
      ? `Protocol: ${tlsInfo.protocol || '-'} · Issuer: ${tlsInfo.issuer || '-'} · Expired: ${tlsInfo.validTo || '-'}`
      : `Final URL: ${finalUrlObj.toString()}`,
    recommendation: 'Pastikan sertifikat TLS 1.3 valid dan seluruh trafik HTTP diarahkan ke HTTPS.',
  });

  const csp = rawHeaders['content-security-policy'] || '';
  const hasCsp = Boolean(csp);
  const cspWeak = /script-src[^;]*'unsafe-inline'|'unsafe-eval'/i.test(csp);
  findings.push({
    id: 'sec-csp-strictness',
    category: 'security',
    severity: !hasCsp ? 'critical' : !cspWeak ? 'pass' : 'warning',
    title: 'Content-Security-Policy (CSP) & Proteksi XSS',
    impactWeight: 18,
    passed: hasCsp && !cspWeak,
    summary: !hasCsp
      ? 'Header Content-Security-Policy tidak ditemukan sehingga risiko injeksi skrip XSS lebih tinggi.'
      : !cspWeak
        ? 'Header CSP aktif dan tidak menggunakan direktif unsafe-inline/unsafe-eval pada script-src.'
        : 'CSP sudah terpasang, tetapi masih mengizinkan unsafe-inline/unsafe-eval pada script-src.',
    evidence: hasCsp ? `content-security-policy: ${csp.slice(0, 220)}…` : 'Header CSP tidak ditemukan.',
    recommendation:
      'Gunakan nonce atau SHA-256 hash untuk inline script agar direktif unsafe-inline dapat dihapus.',
    codeSnippet: `Content-Security-Policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'sha256-<HASH>'; upgrade-insecure-requests`,
    codeLanguage: 'http',
  });

  const hsts = rawHeaders['strict-transport-security'] || '';
  const hasHsts = Boolean(hsts);
  const hasHstsPreload = /preload/i.test(hsts) && /includeSubDomains/i.test(hsts);
  findings.push({
    id: 'sec-hsts-preload',
    category: 'security',
    severity: !hasHsts ? 'critical' : hasHstsPreload ? 'pass' : 'info',
    title: 'Strict-Transport-Security (HSTS) & Preload',
    impactWeight: 10,
    passed: hasHsts && hasHstsPreload,
    summary: !hasHsts
      ? 'Header HSTS tidak ditemukan.'
      : hasHstsPreload
        ? 'HSTS aktif lengkap dengan includeSubDomains dan preload.'
        : 'HSTS aktif, namun belum menambahkan direktif preload.',
    evidence: hasHsts ? `strict-transport-security: ${hsts}` : 'Header HSTS tidak ada.',
    recommendation: 'Tambahkan direktif includeSubDomains; preload bila seluruh subdomain siap HTTPS.',
    codeSnippet: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`,
    codeLanguage: 'http',
  });

  const coop = rawHeaders['cross-origin-opener-policy'] || '';
  const corp = rawHeaders['cross-origin-resource-policy'] || '';
  findings.push({
    id: 'sec-coop-corp',
    category: 'security',
    severity: coop && corp ? 'pass' : 'warning',
    title: 'Isolasi Cross-Origin (COOP & CORP)',
    impactWeight: 10,
    passed: Boolean(coop && corp),
    summary:
      coop && corp
        ? 'Header Cross-Origin-Opener-Policy dan Cross-Origin-Resource-Policy aktif.'
        : 'Header COOP dan/atau CORP belum terpasang untuk isolasi konteks lintas origin.',
    evidence: `COOP: ${coop || 'Tidak ada'} · CORP: ${corp || 'Tidak ada'}`,
    recommendation: 'Tambahkan header COOP (same-origin-allow-popups) dan CORP (same-site).',
    codeSnippet: `Cross-Origin-Opener-Policy: same-origin-allow-popups\nCross-Origin-Resource-Policy: same-site`,
    codeLanguage: 'http',
  });

  const xfo = rawHeaders['x-frame-options'] || '';
  const xcto = rawHeaders['x-content-type-options'] || '';
  const refPol = rawHeaders['referrer-policy'] || '';
  const permPol = rawHeaders['permissions-policy'] || '';
  const coreHeadersOk =
    Boolean(xfo) && xcto.toLowerCase() === 'nosniff' && Boolean(refPol) && Boolean(permPol);
  findings.push({
    id: 'sec-hardening-headers',
    category: 'security',
    severity: coreHeadersOk ? 'pass' : 'warning',
    title: 'Header Hardening Standar (XFO, Nosniff, Referrer, Permissions)',
    impactWeight: 14,
    passed: coreHeadersOk,
    summary: coreHeadersOk
      ? 'Keempat header hardening dasar terkonfigurasi dengan baik.'
      : 'Sebagian header hardening standar (XFO, nosniff, Referrer-Policy, Permissions-Policy) belum lengkap.',
    evidence: `XFO: ${xfo || '-'} · XCTO: ${xcto || '-'} · Referrer: ${refPol || '-'} · Permissions: ${permPol ? 'Ada' : '-'}`,
    recommendation:
      'Pasang X-Frame-Options: DENY/SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy, dan Permissions-Policy.',
  });

  findings.push({
    id: 'sec-mixed-content',
    category: 'security',
    severity: mixedContent.length === 0 ? 'pass' : 'critical',
    title: 'Kebersihan Mixed Content (Aset HTTP di Halaman HTTPS)',
    impactWeight: 12,
    passed: mixedContent.length === 0,
    summary:
      mixedContent.length === 0
        ? 'Tidak ditemukan pemuatan aset tidak terenkripsi (http://) di dalam halaman HTTPS.'
        : `Ditemukan ${mixedContent.length} referensi aset/form memakai http:// pada halaman HTTPS.`,
    evidence:
      mixedContent.length > 0
        ? mixedContent.slice(0, 3).map((m) => `<${m.tag} ${m.attribute}="${m.url}">`).join(' | ')
        : '0 referensi http:// tidak aman.',
    recommendation: 'Ubah seluruh URL aset eksternal dan form action ke https://.',
  });

  const insecureCookies = cookies.filter((c) => !c.secure || !c.httpOnly || !c.sameSite);
  findings.push({
    id: 'sec-cookies',
    category: 'security',
    severity: cookies.length === 0 || insecureCookies.length === 0 ? 'pass' : 'warning',
    title: 'Keamanan Flag Set-Cookie (Secure, HttpOnly, SameSite)',
    impactWeight: 10,
    passed: cookies.length === 0 || insecureCookies.length === 0,
    summary:
      cookies.length === 0
        ? 'Server tidak mengirimkan header Set-Cookie pada halaman awal.'
        : insecureCookies.length === 0
          ? `Seluruh ${cookies.length} cookie memiliki flag Secure, HttpOnly, dan SameSite.`
          : `${insecureCookies.length} dari ${cookies.length} cookie belum melengkapi flag Secure/HttpOnly/SameSite.`,
    evidence:
      cookies.length > 0
        ? cookies.map((c) => `${c.name} (Secure:${c.secure}, HttpOnly:${c.httpOnly}, SameSite:${c.sameSite || '-'})`).join(' · ')
        : '0 Set-Cookie headers.',
    recommendation: 'Setel flag Secure; HttpOnly; SameSite=Lax pada cookie sesi/autentikasi.',
  });

  findings.push({
    id: 'sec-external-links-rel',
    category: 'security',
    severity: externalLinksMissingNoreferrer === 0 ? 'pass' : 'info',
    title: 'Atribut rel="noopener noreferrer" pada Tautan Eksternal',
    impactWeight: 8,
    passed: externalLinksMissingNoreferrer === 0,
    summary:
      externalLinksMissingNoreferrer === 0
        ? `Seluruh ${externalBlankLinks.length} tautan eksternal target="_blank" aman.`
        : `${externalLinksMissingNoreferrer} dari ${externalBlankLinks.length} tautan eksternal target="_blank" belum menyertakan noreferrer.`,
    evidence: `Tautan target="_blank" eksternal: ${externalBlankLinks.length} · Tanpa noreferrer: ${externalLinksMissingNoreferrer}`,
    recommendation: 'Gunakan rel="noopener noreferrer" pada semua tautan eksternal target="_blank".',
  });

  // --- 2. PERFORMANCE ---
  const ttfbOk = ttfbMs <= 350;
  findings.push({
    id: 'perf-ttfb',
    category: 'performance',
    severity: ttfbMs > 900 ? 'critical' : ttfbOk ? 'pass' : 'warning',
    title: 'Waktu Respons Server Awal (TTFB)',
    impactWeight: 20,
    passed: ttfbOk,
    summary: ttfbOk
      ? `TTFB cepat (${ttfbMs} ms), memberikan respons awal yang responsif.`
      : `TTFB tercatat ${ttfbMs} ms (di atas ambang ideal <= 350 ms).`,
    evidence: `TTFB: ${ttfbMs} ms · Total download HTML: ${totalTimeMs} ms · Server: ${network.serverHeader || '-'}`,
    recommendation: 'Gunakan edge CDN caching, optimalkan query database server, dan aktifkan HTTP/2 atau HTTP/3.',
  });

  const hasCompression = Boolean(rawHeaders['content-encoding']);
  findings.push({
    id: 'perf-compression',
    category: 'performance',
    severity: hasCompression ? 'pass' : 'critical',
    title: 'Kompresi Respons HTTP (Brotli / Gzip)',
    impactWeight: 15,
    passed: hasCompression,
    summary: hasCompression
      ? `Kompresi aktif (${rawHeaders['content-encoding']}) dengan payload HTML ${assetBreakdown.htmlKb} KB.`
      : 'Server tidak mengaktifkan kompresi Brotli atau Gzip pada dokumen HTML.',
    evidence: `content-encoding: ${rawHeaders['content-encoding'] || 'Tidak ada'} · HTML: ${htmlBytes.toLocaleString('id-ID')} bytes`,
    recommendation: 'Aktifkan Brotli (br) atau Gzip di web server / CDN.',
  });

  const staticCache = probes.staticAssetCache.cacheControl || '';
  const hasImmutableAssetCache =
    Boolean(staticCache) &&
    (/immutable/i.test(staticCache) || /max-age=(31536000|604800|2592000)/i.test(staticCache));
  findings.push({
    id: 'perf-static-cache',
    category: 'performance',
    severity: !staticAssetUrl || hasImmutableAssetCache ? 'pass' : 'warning',
    title: 'Kebijakan Cache Aset Statis CSS/JS',
    impactWeight: 15,
    passed: !staticAssetUrl || hasImmutableAssetCache,
    summary: !staticAssetUrl
      ? 'Tidak ada aset CSS/JS eksternal untuk diuji.'
      : hasImmutableAssetCache
        ? `Aset statis memakai cache jangka panjang (${staticCache}).`
        : 'Aset statis CSS/JS belum menerapkan Cache-Control jangka panjang.',
    evidence: staticAssetUrl ? `${staticAssetUrl} -> Cache-Control: ${staticCache || 'Tidak ada'}` : 'N/A',
    recommendation: 'Terapkan Cache-Control: public, max-age=31536000, immutable pada aset statis ber-hash.',
  });

  findings.push({
    id: 'perf-resource-preload',
    category: 'performance',
    severity: preloadCount > 0 ? 'pass' : 'warning',
    title: 'Preload Aset Kritis (Font / LCP)',
    impactWeight: 15,
    passed: preloadCount > 0,
    summary:
      preloadCount > 0
        ? `Terdapat ${preloadCount} petunjuk <link rel="preload"> di <head>.`
        : 'Belum ditemukan <link rel="preload"> untuk font web atau aset kritis LCP.',
    evidence: `<link rel="preload">: ${preloadCount} · Stylesheets: ${stylesheets.length}`,
    recommendation:
      'Tambahkan <link rel="preload"> untuk font woff2 utama dan fetchpriority="high" pada gambar utama above-the-fold.',
    codeSnippet: `<link rel="preload" href="/fonts/primary.woff2" as="font" type="font/woff2" crossorigin />`,
    codeLanguage: 'html',
  });

  const hasBlockingJs = renderBlockingScripts.length > 0;
  findings.push({
    id: 'perf-render-blocking',
    category: 'performance',
    severity: hasBlockingJs ? 'critical' : inlineScriptCount > 4 ? 'warning' : 'pass',
    title: 'Optimasi Jalur Render (Skrip & Stylesheet)',
    impactWeight: 15,
    passed: !hasBlockingJs && inlineScriptCount <= 4,
    summary: hasBlockingJs
      ? `${renderBlockingScripts.length} script sinkron di <head> memblokir parsing HTML.`
      : inlineScriptCount > 4
        ? `Tidak ada script eksternal pemblokir di <head>, namun ada ${inlineScriptCount} inline script terpisah.`
        : 'Tidak ditemukan script pemblokir render di <head>.',
    evidence: `Blocking <head> scripts: ${renderBlockingScripts.length} · Inline scripts: ${inlineScriptCount} · CSS files: ${stylesheets.length}`,
    recommendation: 'Tambahkan atribut defer atau type="module" pada script di <head>.',
  });

  const imageDimensionsOk = missingWidthHeightImages === 0;
  const excessiveLazyWithoutLcp = imgs.length > 10 && !eagerLcpCandidate;
  findings.push({
    id: 'perf-image-optimization',
    category: 'performance',
    severity: !imageDimensionsOk ? 'warning' : excessiveLazyWithoutLcp ? 'info' : 'pass',
    title: 'Dimensi Gambar (CLS) & Prioritas LCP',
    impactWeight: 20,
    passed: imageDimensionsOk && !excessiveLazyWithoutLcp,
    summary: !imageDimensionsOk
      ? `${missingWidthHeightImages} dari ${imgs.length} gambar tidak menyertakan width & height eksplisit.`
      : excessiveLazyWithoutLcp
        ? `Dimensi ${imgs.length} gambar sudah lengkap, namun seluruh gambar memakai lazy-loading tanpa prioritas fetchpriority="high" untuk LCP.`
        : `Seluruh ${imgs.length} gambar memiliki atribut dimensi yang baik.`,
    evidence: `Total <img>: ${imgs.length} · Tanpa width/height: ${missingWidthHeightImages} · LCP eager/high: ${eagerLcpCandidate ? 'Ada' : 'Tidak ada'}`,
    recommendation: 'Sertakan width & height pada setiap <img> serta atur fetchpriority="high" pada gambar utama.',
  });

  // --- 3. ACCESSIBILITY ---
  findings.push({
    id: 'a11y-html-lang',
    category: 'accessibility',
    severity: lang ? 'pass' : 'critical',
    title: 'Atribut Bahasa Dokumen (<html lang>)',
    impactWeight: 15,
    passed: Boolean(lang),
    summary: lang ? `Atribut bahasa valid: lang="${lang}".` : 'Tag <html> tidak memiliki atribut lang.',
    evidence: `<html lang="${lang || 'tidak ada'}">`,
    recommendation: 'Tambahkan atribut lang="id" atau sesuai bahasa konten pada tag <html>.',
  });

  findings.push({
    id: 'a11y-viewport-zoom',
    category: 'accessibility',
    severity: !viewport || blocksZoom ? 'critical' : 'pass',
    title: 'Kesiapan Viewport Mobile & Kebebasan Zoom (WCAG 1.4.4)',
    impactWeight: 15,
    passed: Boolean(viewport) && !blocksZoom,
    summary: !viewport
      ? 'Tag <meta name="viewport"> tidak ditemukan.'
      : blocksZoom
        ? 'Viewport memblokir zoom pengguna (user-scalable=no atau maximum-scale=1).'
        : 'Konfigurasi viewport mobile responsif dan mengizinkan zoom.',
    evidence: `viewport: ${viewport || 'Tidak ada'}`,
    recommendation: 'Gunakan <meta name="viewport" content="width=device-width, initial-scale=1"> tanpa membatasi zoom.',
  });

  findings.push({
    id: 'a11y-skip-link',
    category: 'accessibility',
    severity: hasSkipLink ? 'pass' : 'warning',
    title: 'Navigasi Keyboard: Skip to Content Link',
    impactWeight: 15,
    passed: hasSkipLink,
    summary: hasSkipLink
      ? 'Tautan skip-to-content tersedia bagi pengguna keyboard dan pembaca layar.'
      : 'Belum ada tautan Skip-to-Content di awal <body> untuk melewati navigasi berulang.',
    evidence: `Skip link ditemukan: ${hasSkipLink ? 'Ya' : 'Tidak'}`,
    recommendation: 'Sediakan tautan <a href="#main-content">Lewati ke konten utama</a> di awal <body>.',
  });

  findings.push({
    id: 'a11y-img-alt',
    category: 'accessibility',
    severity: nonDecorativeEmptyAltImages > 0 ? 'critical' : 'pass',
    title: 'Teks Alternatif Gambar (alt attribute)',
    impactWeight: 20,
    passed: nonDecorativeEmptyAltImages === 0,
    summary:
      nonDecorativeEmptyAltImages > 0
        ? `${nonDecorativeEmptyAltImages} gambar konten tidak memiliki deskripsi alt.`
        : `Seluruh ${imgs.length} gambar memiliki atribut alt yang sesuai (atau ditandai dekoratif).`,
    evidence: `Total <img>: ${imgs.length} · Non-dekoratif tanpa alt: ${nonDecorativeEmptyAltImages}`,
    recommendation: 'Berikan teks alt deskriptif pada gambar informatif.',
  });

  findings.push({
    id: 'a11y-heading-landmark',
    category: 'accessibility',
    severity: !hasMainLandmark || h1Texts.length !== 1 ? 'warning' : 'pass',
    title: 'Landmark <main> & Keseimbangan Hierarki Heading',
    impactWeight: 15,
    passed: hasMainLandmark && h1Texts.length === 1 && headingSequence.length >= 2,
    summary: !hasMainLandmark
      ? 'Landmark <main> tidak ditemukan.'
      : h1Texts.length !== 1
        ? `Jumlah <h1> tercatat ${h1Texts.length} (standar terbaik tepat 1 <h1> utama).`
        : 'Landmark <main> dan tag <h1> utama terstruktur baik.',
    evidence: `<main>: ${hasMainLandmark ? 'Ada' : 'Tidak ada'} · <h1> count: ${h1Texts.length} · Total heading: ${headingSequence.length}`,
    recommendation: 'Gunakan tepat satu <h1> per halaman dan bungkus konten utama dengan <main>.',
  });

  findings.push({
    id: 'a11y-theme-motion',
    category: 'accessibility',
    severity:
      hasMarqueeOrAutoScroll
        ? 'warning'
        : themeSupport.posture === 'unspecified'
          ? 'info'
          : 'pass',
    title: 'Postur Tema (Light/Dark) & Kontrol Gerakan Otomatis',
    impactWeight: 20,
    passed: !hasMarqueeOrAutoScroll && themeSupport.posture !== 'unspecified',
    summary: hasMarqueeOrAutoScroll
      ? 'Terdapat komponen animasi berjalan otomatis (marquee) yang perlu menyediakan tombol jeda & dukungan prefers-reduced-motion.'
      : themeSupport.details,
    evidence: `Postur tema: ${themeSupport.label} · color-scheme meta: ${themeSupport.colorSchemeMeta || 'Tidak ada'}`,
    recommendation:
      'Pastikan dual-theme memiliki kontras >= 4.5:1 di mode terang & gelap, atau deklarasikan <meta name="color-scheme">.',
  });

  // --- 4. SEO ---
  const titleOptimal = title.length >= 30 && title.length <= 65;
  findings.push({
    id: 'seo-title',
    category: 'seo',
    severity: !title ? 'critical' : titleOptimal ? 'pass' : 'warning',
    title: 'Kualitas & Panjang Tag <title>',
    impactWeight: 15,
    passed: Boolean(title) && titleOptimal,
    summary: !title
      ? 'Tag <title> kosong atau tidak ditemukan.'
      : titleOptimal
        ? `Panjang <title> ideal (${title.length} karakter).`
        : `Panjang <title> ${title.length} karakter (disarankan 30–65 karakter).`,
    evidence: `<title>${title || '(kosong)'}</title>`,
    recommendation: 'Tulis judul halaman unik berpanjang 50–60 karakter.',
  });

  const descOptimal = metaDescription.length >= 120 && metaDescription.length <= 165;
  findings.push({
    id: 'seo-meta-description',
    category: 'seo',
    severity: !metaDescription ? 'critical' : descOptimal ? 'pass' : 'warning',
    title: 'Meta Description Optimal (120–160 Karakter)',
    impactWeight: 18,
    passed: Boolean(metaDescription) && descOptimal,
    summary: !metaDescription
      ? 'Tag <meta name="description"> belum dipasang.'
      : descOptimal
        ? `Meta description berada pada panjang optimal (${metaDescription.length} karakter).`
        : `Meta description berpanjang ${metaDescription.length} karakter (rentang ideal 120–160 karakter).`,
    evidence: `"${metaDescription || '(kosong)'}" (${metaDescription.length} karakter)`,
    recommendation: 'Lengkapi meta description ringkas sekitar 135–155 karakter.',
  });

  const canonicalMismatch = Boolean(canonical) && canonical === origin && !canonical.endsWith('/');
  findings.push({
    id: 'seo-canonical',
    category: 'seo',
    severity: !canonical ? 'warning' : canonicalMismatch ? 'info' : 'pass',
    title: 'Tag Canonical & Konsistensi URL',
    impactWeight: 12,
    passed: Boolean(canonical) && !canonicalMismatch,
    summary: !canonical
      ? 'Tag <link rel="canonical"> belum ditemukan.'
      : canonicalMismatch
        ? `Canonical tidak memakai trailing slash (${canonical}) sedangkan standar root URL memakai trailing slash.`
        : `Canonical terkonfigurasi: ${canonical}.`,
    evidence: `<link rel="canonical" href="${canonical || 'tidak ada'}">`,
    recommendation: 'Pastikan tag canonical konsisten di seluruh halaman.',
  });

  const robotsOk = probes.robotsTxt.status === 200;
  const hasAnySitemap = probes.sitemapIndexXml.status === 200 || probes.sitemapXml.status === 200;
  findings.push({
    id: 'seo-robots-sitemap',
    category: 'seo',
    severity: !robotsOk || !hasAnySitemap ? 'warning' : 'pass',
    title: 'Ketersediaan robots.txt & XML Sitemap',
    impactWeight: 20,
    passed: robotsOk && hasAnySitemap,
    summary:
      robotsOk && hasAnySitemap
        ? 'robots.txt dan berkas sitemap XML tersedia dan dapat diakses crawler.'
        : 'robots.txt atau sitemap XML belum tersedia/mengembalikan error.',
    evidence: `robots.txt: HTTP ${probes.robotsTxt.status} · sitemap.xml: HTTP ${probes.sitemapXml.status} · sitemap-index.xml: HTTP ${probes.sitemapIndexXml.status}`,
    recommendation: 'Sediakan /robots.txt yang mengarah ke XML sitemap aktif.',
  });

  findings.push({
    id: 'seo-social-schema',
    category: 'seo',
    severity: hasOgTags && hasTwitterCard && hasJsonLd ? 'pass' : hasOgTags ? 'info' : 'warning',
    title: 'Open Graph, Twitter Card & Schema.org JSON-LD',
    impactWeight: 20,
    passed: hasOgTags && hasTwitterCard && hasJsonLd,
    summary:
      hasOgTags && hasTwitterCard && hasJsonLd
        ? 'Metadata Open Graph, Twitter Card, dan JSON-LD Schema.org sudah terpasang.'
        : 'Sebagian metadata berbagi sosial (OG/Twitter) atau data terstruktur JSON-LD belum lengkap.',
    evidence: `OG Lengkap: ${hasOgTags ? 'Ya' : 'Tidak'} · Twitter Card: ${hasTwitterCard ? 'Ya' : 'Tidak'} · JSON-LD: ${hasJsonLd ? 'Ada' : 'Tidak ada'}`,
    recommendation: 'Tambahkan og:title, og:description, og:image, twitter:card, serta JSON-LD.',
  });

  const brokenLinks = linkAudit.filter((l) => !l.ok && l.status !== 0);
  findings.push({
    id: 'seo-broken-links',
    category: 'seo',
    severity: brokenLinks.length > 0 ? 'critical' : 'pass',
    title: `Integritas Tautan Halaman (${linkAudit.length} Tautan Diuji)`,
    impactWeight: 15,
    passed: brokenLinks.length === 0,
    summary:
      brokenLinks.length === 0
        ? `Tidak ada tautan rusak (HTTP 4xx/5xx) di antara ${linkAudit.length} tautan yang diuji.`
        : `Ditemukan ${brokenLinks.length} tautan rusak dari ${linkAudit.length} tautan yang diperiksa.`,
    evidence:
      brokenLinks.length > 0
        ? brokenLinks.map((b) => `${b.url} (HTTP ${b.status})`).join(' · ')
        : `Seluruh tautan yang merespons mengembalikan status HTTP 2xx/3xx.`,
    recommendation: 'Perbaiki atau hapus tautan yang mengarah ke halaman 404/500.',
  });

  // --- 5. PWA & INSTALLABILITY ---
  findings.push({
    id: 'pwa-manifest-valid',
    category: 'pwa',
    severity: manifestInspection.found ? 'pass' : 'critical',
    title: 'Ketersediaan & Validitas Web App Manifest',
    impactWeight: 25,
    passed: manifestInspection.found,
    summary: manifestInspection.found
      ? `Manifest JSON valid ditemukan (${manifestInspection.name || manifestInspection.shortName || 'berisi metadata aplikasi'}).`
      : 'Web App Manifest (<link rel="manifest">) tidak ditemukan atau gagal dimuat sebagai JSON valid.',
    evidence: manifestInspection.url
      ? `${manifestInspection.url} -> HTTP ${manifestInspection.status ?? 0}`
      : 'Tidak ada tag <link rel="manifest"> pada HTML.',
    recommendation:
      'Sediakan manifest.webmanifest atau manifest.json valid dengan id, name, short_name (<= 12 karakter), start_url, scope, dan display: "standalone".',
    codeSnippet: `{
  "id": "/",
  "name": "Nama Aplikasi Anda",
  "short_name": "AppAnda",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#2563EB",
  "background_color": "#FFFFFF"
}`,
    codeLanguage: 'json',
  });

  const manifestFieldsComplete =
    manifestInspection.found &&
    manifestInspection.hasId &&
    Boolean(manifestInspection.startUrl) &&
    manifestInspection.display === 'standalone' &&
    manifestInspection.shortNameLengthOk;
  findings.push({
    id: 'pwa-manifest-fields',
    category: 'pwa',
    severity: !manifestInspection.found ? 'warning' : manifestFieldsComplete ? 'pass' : 'warning',
    title: 'Kelengkapan Properti Installability Manifest (id, display, short_name <= 12)',
    impactWeight: 20,
    passed: manifestFieldsComplete,
    summary: manifestFieldsComplete
      ? 'Properti manifest utama (id, start_url, display: standalone, short_name <= 12 karakter) terpenuhi.'
      : 'Sebagian properti installability di manifest belum lengkap (mis. id, display: standalone, atau short_name melebihi 12 karakter).',
    evidence: `id: ${manifestInspection.hasId ? 'Ada' : 'Tidak'} · display: ${manifestInspection.display || '-'} · short_name: "${manifestInspection.shortName || '-'}" (${manifestInspection.shortName?.length || 0} kar)`,
    recommendation: 'Pastikan manifest memuat id, start_url, scope, display: "standalone", dan short_name <= 12 karakter.',
  });

  const iconsComplete =
    manifestInspection.hasIcon192 &&
    manifestInspection.hasIcon512 &&
    manifestInspection.hasSeparateMaskable &&
    hasAppleTouchIcon &&
    !/\.svg$/i.test(appleIconHref);
  findings.push({
    id: 'pwa-icons-compliance',
    category: 'pwa',
    severity:
      manifestInspection.hasIcon192 && manifestInspection.hasIcon512
        ? iconsComplete
          ? 'pass'
          : 'info'
        : 'warning',
    title: 'Kepatuhan Ikon PWA (192x192, 512x512, Maskable & Apple Touch Icon PNG)',
    impactWeight: 20,
    passed: iconsComplete,
    summary: iconsComplete
      ? 'Ikon 192x192, 512x512, maskable terpisah, dan apple-touch-icon PNG lengkap.'
      : 'Ikon PWA (192x192, 512x512, pemisahan purpose any vs maskable, atau apple-touch-icon PNG) belum lengkap.',
    evidence: `192px: ${manifestInspection.hasIcon192 ? 'Ya' : 'Tidak'} · 512px: ${manifestInspection.hasIcon512 ? 'Ya' : 'Tidak'} · Separate Maskable: ${manifestInspection.hasSeparateMaskable ? 'Ya' : 'Tidak'} · Apple Icon: ${appleIconHref || 'Tidak ada'}`,
    recommendation:
      'Sediakan ikon PNG 192x192 & 512x512 (purpose: "any"), ikon khusus safe-zone untuk purpose: "maskable", serta apple-touch-icon format PNG (bukan SVG) untuk iOS Safari.',
  });

  findings.push({
    id: 'pwa-service-worker',
    category: 'pwa',
    severity: serviceWorkerDetected ? 'pass' : 'critical',
    title: 'Registrasi Service Worker & Dukungan Offline',
    impactWeight: 25,
    passed: serviceWorkerDetected,
    summary: serviceWorkerDetected
      ? 'Service Worker terdeteksi aktif untuk caching aset dan syarat instalasi browser.'
      : 'Tidak ditemukan Service Worker yang terdaftar; browser Chromium mewajibkan Service Worker aktif agar aplikasi lolos standar PWA penuh.',
    evidence: serviceWorkerEvidence,
    recommendation:
      'Daftarkan Service Worker (misal menggunakan Workbox / vite-plugin-pwa atau sw.js) untuk mengelola fetch & cache offline.',
    codeSnippet: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}`,
    codeLanguage: 'javascript',
  });

  findings.push({
    id: 'pwa-theme-favicon',
    category: 'pwa',
    severity: hasFavicon && Boolean(themeColor) ? 'pass' : 'info',
    title: 'Theme Color Meta & Favicon Browser',
    impactWeight: 10,
    passed: hasFavicon && Boolean(themeColor),
    summary:
      hasFavicon && Boolean(themeColor)
        ? `Favicon dan <meta name="theme-color" content="${themeColor}"> terpasang.`
        : 'Favicon atau <meta name="theme-color"> belum dikonfigurasi.',
    evidence: `Favicon: ${hasFavicon ? 'Ada' : 'Tidak'} · theme-color: ${themeColor || 'Tidak ada'}`,
    recommendation: 'Tambahkan <meta name="theme-color"> dan <link rel="icon"> agar tampilan bilah status perangkat serasi.',
  });

  // --- 6. AI & TEMPLATE ORIGIN ---
  const hasLeftoverPlaceholders = aiTemplateAnalysis.signals.some((s) =>
    s.label.includes('Placeholder') || s.label.includes('Starter Kit'),
  );
  findings.push({
    id: 'ai-leftover-check',
    category: 'ai_origin',
    severity: hasLeftoverPlaceholders ? 'critical' : 'pass',
    title: 'Kebersihan dari Teks Placeholder & Judul Starter Kit',
    impactWeight: 35,
    passed: !hasLeftoverPlaceholders,
    summary: hasLeftoverPlaceholders
      ? 'Ditemukan sisa teks placeholder (Lorem Ipsum/contoh) atau judul bawaan starter kit yang belum diganti.'
      : 'Tidak ditemukan sisa teks placeholder maupun judul bawaan starter kit.',
    evidence: hasLeftoverPlaceholders
      ? aiTemplateAnalysis.signals
          .filter((s) => s.label.includes('Placeholder') || s.label.includes('Starter Kit'))
          .map((s) => s.evidence)
          .join(' · ')
      : `Judul aktif: "${title}"`,
    recommendation: 'Ganti seluruh teks placeholder, judul tab, dan identitas bawaan template sebelum rilis.',
  });

  const hasGenericCopy = aiTemplateAnalysis.signals.some((s) =>
    s.label.includes('Copywriting Generik'),
  );
  findings.push({
    id: 'ai-copy-originality',
    category: 'ai_origin',
    severity: hasGenericCopy ? 'warning' : 'pass',
    title: 'Orisinalitas Copywriting (Bebas Frasa Klise AI)',
    impactWeight: 30,
    passed: !hasGenericCopy,
    summary: hasGenericCopy
      ? 'Terdeteksi pengulangan frasa pemasaran generik yang umum dihasilkan generator AI.'
      : 'Narasi konten terbebas dari klise copywriting generik AI yang berlebihan.',
    evidence: hasGenericCopy
      ? aiTemplateAnalysis.signals.find((s) => s.label.includes('Copywriting'))?.evidence || ''
      : '0 pola frasa klise AI dominan ditemukan.',
    recommendation: 'Gunakan bahasa spesifik yang menjelaskan nilai nyata layanan, angka terukur, dan studi kasus asli.',
  });

  const hasScaffoldingUi = aiTemplateAnalysis.signals.some(
    (s) => s.label.includes('AI Scaffolding') || s.label.includes('Template'),
  );
  findings.push({
    id: 'ai-design-fingerprint',
    category: 'ai_origin',
    severity: hasScaffoldingUi ? 'info' : 'pass',
    title: 'Pola Struktur UI (Custom Code vs Template / Scaffolding)',
    impactWeight: 35,
    passed: !hasScaffoldingUi,
    summary: aiTemplateAnalysis.summary,
    evidence:
      aiTemplateAnalysis.signals.length > 0
        ? aiTemplateAnalysis.signals.map((s) => `${s.label}: ${s.evidence}`).join(' | ')
        : 'Tidak ada pola scaffolding AI atau builder template dominan.',
    recommendation:
      'Pertahankan identitas visual yang konsisten dan hindari komponen generik berlapis atau gradien dekoratif berlebihan.',
  });

  const categories = buildCategoryScores(findings);
  const overallScore = Math.round(
    (categories.performance.score +
      categories.accessibility.score +
      categories.seo.score +
      categories.security.score +
      categories.pwa.score +
      categories.ai_origin.score) /
      6,
  );

  const pwa: PwaReadiness = {
    viewport,
    blocksZoom,
    hasFavicon,
    hasAppleTouchIcon,
    manifestUrl: manifestInspection.url,
    manifestStatus: manifestInspection.status,
    themeColor,
    serviceWorkerDetected,
    serviceWorkerEvidence,
    installabilityScore: categories.pwa.score,
    installableReady:
      isHttps && manifestInspection.found && manifestInspection.hasIcon192 && serviceWorkerDetected,
    manifest: manifestInspection,
  };

  const durationMs = Math.round(performance.now() - scanStart);
  const coverage: ScanCoverage = {
    mode,
    complete: partialReasons.length === 0,
    statusLabel:
      partialReasons.length === 0
        ? mode === 'deep'
          ? 'Deep Crawl Selesai Lengkap'
          : 'Express Inspection Selesai'
        : 'Pemeriksaan Selesai Sebagian (Partial Coverage)',
    partialReasons,
    pagesScanned: mode === 'deep' ? deepCrawlPages.length : 1,
    pagesDiscovered,
    linksChecked: linkAudit.length,
    durationMs,
  };

  return {
    id: crypto.randomUUID(),
    scannedAt: new Date().toISOString(),
    overallScore,
    coverage,
    categories,
    findings,
    network,
    tls: tlsInfo,
    rawHeaders,
    dom,
    probes,
    themeSupport,
    aiTemplateAnalysis,
    techStack,
    supportedDetections: SUPPORTED_DETECTIONS,
    dns: dnsInfo,
    cookies,
    linkAudit,
    mixedContent,
    pwa,
    assetBreakdown,
    deepCrawlPages,
    adminExposures,
  };
}

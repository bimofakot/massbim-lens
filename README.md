# Massbim Lens

**Massbim Lens** adalah aplikasi web diagnostik *open-source* dan **Progressive Web App (PWA)** untuk memeriksa kualitas, performa, aksesibilitas, SEO, keamanan, installability PWA, serta arsitektur teknologi sebuah website secara langsung (*real-time*).

Dikembangkan dan dipelihara di bawah ekosistem **Massbim** ([bimofakot](https://github.com/bimofakot/)).

---

## Fitur Utama

### 1. Dua Mode Pemindaian + Self-Audit
- **Express Inspection (Pemeriksaan Cepat ~2–5 detik)**
  Memeriksa HTML utama, header HTTP, sertifikat TLS/SSL, record DNS (`A`, `AAAA`, `MX`, `NS`, `CAA`, `SPF`, `DMARC`), flag `Set-Cookie`, struktur DOM, manifest PWA, Service Worker, pola AI, serta pengujian hingga 12 tautan utama.
- **Deep Crawl Audit (Audit Menyeluruh — dengan Persetujuan Risiko)**
  Menelusuri hingga 20 halaman internal (dari `sitemap.xml` / `sitemap-index.xml` dan tautan navigasi), memeriksa duplikasi judul halaman, menguji hingga 25 tautan, serta melakukan pemeriksaan pasif jalur konfigurasi/admin umum (`/.env`, `/.git/config`, `/wp-login.php`, `/admin`, `/dashboard`).
- **Audit Website Ini (Self-Audit)**
  Memindai langsung aplikasi **Massbim Lens** melalui endpoint `/api/self-audit` agar pengguna dapat memverifikasi keamanan dan kepatuhan PWA dari alat audit ini sendiri.

### 2. Enam Pilar Skor & Sepuluh Modul Diagnostik
1. **Ringkasan & Skor**: Grafik radar 6 sumbu, metrik jaringan/payload, dan tabel prioritas perbaikan interaktif dengan simulasi skor instan.
2. **Performa**: TTFB server, kompresi Brotli/Gzip, kebijakan `Cache-Control` aset statis, `<link rel="preload">`, skrip/stylesheet pemblokir render, dimensi gambar, serta bobot payload.
3. **Aksesibilitas**: `<html lang>`, kesiapan mobile viewport tanpa pemblokiran zoom, *Skip-to-Content link*, atribut `alt` gambar, landmark `<main>`, serta postur tema (**Dual Light/Dark Mode**, Light-Only, atau Dark-Only).
4. **SEO**: Panjang `<title>` & `<meta description>`, tag `canonical`, `robots.txt` & XML sitemap, Schema.org JSON-LD, dan integritas *broken links*.
5. **Keamanan**: Validitas sertifikat TLS/SSL, analisis `Content-Security-Policy`, HSTS, COOP/CORP, header hardening dasar, dan *mixed content*.
6. **PWA & Installability**: Audit `manifest.webmanifest`/`manifest.json` (`id`, `short_name <= 12`, `display: standalone`), kepatuhan ikon `192x192`, `512x512`, pemisahan `any` vs `maskable`, `apple-touch-icon` PNG, serta deteksi Service Worker (`/sw.js` / `/registerSW.js`).
7. **Pola AI, Template & Tech Stack**: Analisis sinyal scaffolding AI/template, skor orisinalitas desain, serta deteksi framework, Laravel, payment gateway (Midtrans, Xendit, Stripe, dll.), admin/auth, dan CDN.
8. **Simulator SERP & Media Sosial**: Pratinjau multi-platform (**Google Desktop**, **Google Mobile**, **WhatsApp**, **X/Twitter**, **LinkedIn/FB**) dilengkapi **Editor Uji Coba Meta Tags Live** & generator kode `<head>`.
9. **DNS, Email Security & Server Config**: Inspeksi `A`, `AAAA`, `MX`, `NS`, `CAA`, `SPF`, `DMARC`, flag `Set-Cookie`, `/.well-known/security.txt`, dan panduan siap salin konfigurasi DNS.
10. **Integritas Tautan, Aset & Raw HTTP/SSL**: Rincian payload aset, *mixed content*, tabel status tautan, hasil Deep Crawl, dan header HTTP mentah.

### 3. Keamanan & PWA Massbim Lens Sendiri
- **Hardening Server Express**: Header keamanan (`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Referrer-Policy`, `Permissions-Policy`), menonaktifkan `X-Powered-By`, SSRF protection pada validator URL, serta rate limiting per IP pada `/api/audit`.
- **Technical SEO & Trust**: Melayani `/robots.txt`, `/sitemap.xml`, dan `/.well-known/security.txt`.
- **Installable PWA**: Menggunakan `vite-plugin-pwa`, ikon 192px/512px/maskable/apple-touch-icon PNG terpisah, dukungan offline cache, serta tombol **Instal App** di header.

---

## Struktur Proyek

```text
├── server.ts                         # Express server, security headers, rate limiter, API & Vite/static serving
├── server/
│   └── auditEngine.ts                # Mesin inspeksi HTTP, TLS/SSL, DNS, PWA, tech stack & skor 6 pilar
├── src/
│   ├── App.tsx                       # Root orchestrator, state laporan & sinkronisasi localStorage
│   ├── components/
│   │   ├── LayoutChrome.tsx          # BrandLogo, TopBar, PWAInstallButton, Sidebar, Consent Modal, Toast, Footer
│   │   ├── ScannerAndCompare.tsx     # Halaman ScannerHub, ScanProgressStepper & perbandingan Head-to-Head
│   │   ├── ReportDashboard.tsx       # Ringkasan 6 pilar, radar chart & FindingsChecklist interaktif
│   │   ├── PwaAndAiModules.tsx       # Modul audit PWA/Manifest & analisis pola AI/Tema/Tech Stack
│   │   ├── SerpSocialSimulator.tsx   # Simulator pratinjau Google SERP & media sosial + editor meta live
│   │   └── TechnicalInspectors.tsx   # DNS/Email/Server Config, Integritas Tautan/Crawl & Raw HTTP/SSL
│   ├── hooks/                        # Custom React hooks (useOnlineStatus, usePWAInstall)
│   ├── types/audit.ts                # Kontrak TypeScript laporan diagnostik lengkap
│   └── utils/scoreSimulation.ts      # Kalkulasi simulasi skor & ekspor laporan Markdown (.md)
├── public/                           # Ikon PWA PNG/SVG statis
├── .env.example                      # Contoh variabel lingkungan (PORT, NODE_ENV)
├── CONTRIBUTING.md                   # Panduan kontribusi open-source
└── LICENSE                           # Lisensi MIT
```

---

## Menjalankan Secara Lokal

Prasyarat: **Node.js 20+** dan **npm**.

```bash
git clone https://github.com/bimofakot/massbim-lens.git
cd massbim-lens
npm install
cp .env.example .env
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

### Verifikasi & Build Produksi

```bash
# Cek TypeScript dan build Vite sekaligus
npm run check

# Menjalankan mode produksi setelah build
NODE_ENV=production npm start
```

---

## Kontribusi & Kredit

Kontribusi terbuka melalui Pull Request — silakan baca [CONTRIBUTING.md](./CONTRIBUTING.md).

Dikembangkan oleh **Massbim**:
- GitHub: [https://github.com/bimofakot/](https://github.com/bimofakot/)
- Email: `andraani30@gmail.com`
- Instagram: [@massbibim_](https://instagram.com/massbibim_)

Lisensi: **MIT** — lihat berkas [LICENSE](./LICENSE).

# Panduan Kontribusi Massbim Lens

Terima kasih sudah tertarik berkontribusi pada **Massbim Lens**. Proyek ini bersifat *open-source* di bawah lisensi MIT dan terbuka untuk perbaikan bug, penambahan signature tech stack, maupun peningkatan akurasi audit.

## Alur Kerja Kontribusi

1. **Fork** repository ini ke akun GitHub Anda.
2. Buat *branch* baru dari `main` dengan nama yang deskriptif:
   ```bash
   git checkout -b feat/nama-fitur
   # atau
   git checkout -b fix/deskripsi-perbaikan
   ```
3. Jalankan lingkungan pengembangan lokal:
   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```
4. Pastikan tidak ada error TypeScript maupun kegagalan build sebelum membuat commit:
   ```bash
   npm run check
   ```
5. Kirim **Pull Request** dengan penjelasan singkat mengenai perubahan yang dilakukan beserta alasan teknisnya.

## Pedoman Kode

- Gunakan TypeScript yang ketat tanpa `any` bila tidak mendesak.
- Jangan menambahkan klaim deteksi fiktif: seluruh hasil audit dan signature teknologi di `server/auditEngine.ts` harus berbasis bukti HTTP/DNS/TLS/DOM yang nyata.
- Pertahankan tampilan Light Mode & Dark Mode yang kontras serta ramah diakses.
- Jangan pernah menyertakan rahasia, API key, atau data privat di dalam commit.

## Pelaporan Bug & Usulan Fitur

Silakan buka **GitHub Issue** di `https://github.com/bimofakot/` dengan menyertakan langkah reproduksi, URL contoh (jika relevan), dan pesan error yang muncul.

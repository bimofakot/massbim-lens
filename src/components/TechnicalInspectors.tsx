import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cookie,
  Copy,
  FileCode,
  Globe,
  Link2,
  Shield,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { AuditReport } from '../types/audit';

// ============================================================================
// DnsServerSection — DNS Records (A/AAAA/NS/MX/CAA/SPF/DMARC), Cookies & Config
// ============================================================================

export function DnsServerSection({
  report,
  onNotify,
}: {
  report: AuditReport;
  onNotify?: (msg: string) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const hostname = (() => {
    try {
      return new URL(report.network.finalUrl).hostname.replace(/^www\./, '');
    } catch {
      return 'domainanda.com';
    }
  })();

  const dnsTemplates = [
    {
      key: 'spf',
      title: 'TXT SPF Record (Root @)',
      missing: !report.dns.spf,
      record: `v=spf1 include:_spf.google.com ~all`,
      desc: 'Mencegah pihak lain mengirim email palsu menggunakan nama domain Anda. Sesuaikan "include:" dengan layanan email yang dipakai.',
    },
    {
      key: 'dmarc',
      title: 'TXT DMARC Record (_dmarc)',
      missing: !report.dns.dmarc,
      record: `v=DMARC1; p=quarantine; rua=mailto:admin@${hostname}; adkim=r; aspf=r`,
      desc: 'Menentukan kebijakan penerima email saat validasi SPF/DKIM gagal dan mengirim laporan ke alamat email admin.',
    },
    {
      key: 'caa',
      title: 'CAA Record (Otoritas Sertifikat SSL)',
      missing: report.dns.caa.length === 0,
      record: `0 issue "letsencrypt.org"\n0 issue "pki.goog"`,
      desc: 'Membatasi Certificate Authority (CA) mana saja yang diizinkan menerbitkan sertifikat SSL untuk domain Anda.',
    },
  ];

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onNotify?.(`Template ${key.toUpperCase()} record berhasil disalin`);
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Modul Infrastruktur DNS &amp; Server · {report.network.finalUrl}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          DNS Records, Keamanan Email (SPF/DMARC/CAA) &amp; Server Config
        </h1>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            <Globe className="w-4 h-4 text-[#2563EB]" />
            <span>Catatan DNS Publik Saat Ini ({hostname})</span>
          </div>
          <dl className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">A (IPv4)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.dns.a.join(', ') || '-'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">AAAA (IPv6)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.dns.aaaa.join(', ') || 'Tidak ada'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Nameserver (NS)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.dns.ns.slice(0, 3).join(', ') || '-'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">MX (Mail Server)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.dns.mx.slice(0, 2).join(', ') || 'Tidak ada'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">CAA (SSL Authority)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.dns.caa.length > 0 ? report.dns.caa.join(' · ') : 'Belum dikonfigurasi'}
              </dd>
            </div>
            <div className="px-4 py-2.5 space-y-1">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">TXT SPF Record</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] break-all">
                {report.dns.spf || 'Belum terkonfigurasi (berisiko spoofing email domain)'}
              </dd>
            </div>
            <div className="px-4 py-2.5 space-y-1">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">TXT DMARC (_dmarc)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] break-all">
                {report.dns.dmarc || 'Belum terkonfigurasi'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              <Shield className="w-4 h-4 text-[#2563EB]" />
              <span>Konfigurasi Server, Cache Statis &amp; Security.txt</span>
            </div>
            <dl className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
              <div className="px-4 py-2.5 flex justify-between gap-4">
                <dt className="text-[#64748B] dark:text-[#94A3B8]">Server Header</dt>
                <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                  {report.network.serverHeader || 'Disembunyikan (Baik)'}
                </dd>
              </div>
              <div className="px-4 py-2.5 flex justify-between gap-4">
                <dt className="text-[#64748B] dark:text-[#94A3B8]">Kompresi Konten</dt>
                <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                  {report.network.contentEncoding || 'Tidak terdeteksi'}
                </dd>
              </div>
              <div className="px-4 py-2.5 flex justify-between gap-4">
                <dt className="text-[#64748B] dark:text-[#94A3B8]">Cache-Control Aset Statis</dt>
                <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                  {report.probes.staticAssetCache.cacheControl || 'Tidak ada / tidak diuji'}
                </dd>
              </div>
              <div className="px-4 py-2.5 flex justify-between gap-4">
                <dt className="text-[#64748B] dark:text-[#94A3B8]">/.well-known/security.txt</dt>
                <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                  HTTP {report.probes.securityTxt.status || 0}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              <Cookie className="w-4 h-4 text-[#2563EB]" />
              <span>Audit Flag Set-Cookie ({report.cookies.length})</span>
            </div>
            {report.cookies.length === 0 ? (
              <div className="p-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Tidak ada header Set-Cookie pada respons HTTP awal.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                {report.cookies.map((c, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {c.name}
                    </span>
                    <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">
                      Secure: {c.secure ? 'Ya' : 'Tidak'} · HttpOnly: {c.httpOnly ? 'Ya' : 'Tidak'} ·
                      SameSite: {c.sameSite || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Actionable DNS Configuration Guide */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Panduan Penguatan DNS Domain (Untuk Panel DNS / Cloudflare)
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Pengaturan DNS seperti SPF, DMARC, dan CAA tidak dapat diatur dari dalam kode aplikasi
            web, melainkan perlu dimasukkan langsung ke pengelola DNS domain Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {dnsTemplates.map((tpl) => (
            <div
              key={tpl.key}
              className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {tpl.title}
                  </span>
                  {tpl.missing ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D97706]">
                      <XCircle className="w-3 h-3" />
                      <span>Belum Ada</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Terpasang</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {tpl.desc}
                </p>
              </div>

              <div className="space-y-2">
                <pre className="p-2.5 rounded-lg bg-[#0F172A] dark:bg-[#020617] text-[#F8FAFC] font-mono text-[11px] overflow-x-auto">
                  <code>{tpl.record}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopy(tpl.key, tpl.record)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:text-[#2563EB]"
                >
                  {copiedKey === tpl.key ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span className="text-[#16A34A]">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Contoh Record</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// InfraLinksSection — Payload Aset, Mixed Content, Broken Links & Deep Crawl
// ============================================================================

export function InfraLinksSection({ report }: { report: AuditReport }) {
  const { assetBreakdown, mixedContent, linkAudit, deepCrawlPages, adminExposures } = report;

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Modul Integritas Aset &amp; Tautan · {report.network.finalUrl}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Integritas Tautan, Payload Aset &amp; Hasil Deep Crawl
        </h1>
      </div>

      {/* Asset Breakdown & Mixed Content */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            <FileCode className="w-4 h-4 text-[#2563EB]" />
            <span>Rincian Payload &amp; Komposisi Aset Halaman</span>
          </div>
          <dl className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Ukuran Dokumen HTML</dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {assetBreakdown.htmlKb} KB
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">
                Total HTML + Sampel Aset Kritis
              </dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {assetBreakdown.sampledAssetKb} KB
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Stylesheet Eksternal (&lt;link&gt;)</dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {assetBreakdown.stylesheetsCount} berkas
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">
                Skrip Eksternal (&lt;script src&gt;)
              </dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {assetBreakdown.externalScriptsCount} berkas
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Elemen Gambar (&lt;img&gt;)</dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {assetBreakdown.imagesCount} elemen
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#2563EB]" />
              <span>Pemeriksaan Mixed Content (HTTP di Halaman HTTPS)</span>
            </span>
            <span className="font-mono tabular-nums">{mixedContent.length} temuan</span>
          </div>
          {mixedContent.length === 0 ? (
            <div className="p-5 flex items-center gap-2.5 text-xs text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Bersih — seluruh resource dimuat aman tanpa URL http:// tidak terenkripsi.</span>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs max-h-60 overflow-y-auto">
              {mixedContent.map((m, idx) => (
                <div key={idx} className="px-4 py-2.5 space-y-0.5">
                  <div className="font-mono font-semibold text-[#DC2626]">
                    &lt;{m.tag} {m.attribute}=&quot;...&quot;&gt;
                  </div>
                  <div className="font-mono text-[#64748B] dark:text-[#94A3B8] break-all">
                    {m.url}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Broken Links & Link Integrity Table */}
      <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            <Link2 className="w-4 h-4 text-[#2563EB]" />
            <span>Verifikasi Integritas Tautan ({linkAudit.length} Sampel Tautan)</span>
          </span>
          <span className="font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {linkAudit.filter((l) => l.ok).length} OK · {linkAudit.filter((l) => !l.ok).length}{' '}
            Bermasalah/Timeout
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8]">
                <th className="py-2 px-4">URL Tautan</th>
                <th className="py-2 px-3 w-24">Tipe</th>
                <th className="py-2 px-3 w-28">Status</th>
                <th className="py-2 px-4 text-right w-28">Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
              {linkAudit.map((link) => (
                <tr key={link.url} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40">
                  <td className="py-2.5 px-4 font-mono text-[#0F172A] dark:text-[#F8FAFC] break-all">
                    {link.url}
                  </td>
                  <td className="py-2.5 px-3 text-[#64748B] dark:text-[#94A3B8] capitalize">
                    {link.type}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
                    {link.status === 0 ? 'Timeout' : `HTTP ${link.status}`}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {link.ok ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[#16A34A]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-[#DC2626]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Bermasalah</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deep Crawl Multi-Page Results & Admin Exposure Check */}
      {report.coverage.mode === 'deep' ? (
        <>
          <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Hasil Deep Crawl Multi-Halaman ({deepCrawlPages.length} dari{' '}
                {report.coverage.pagesDiscovered} ditemukan)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8]">
                    <th className="py-2 px-4">Halaman</th>
                    <th className="py-2 px-3 w-24">HTTP</th>
                    <th className="py-2 px-3">Judul (&lt;title&gt;)</th>
                    <th className="py-2 px-3 w-24 text-right">Desc Len</th>
                    <th className="py-2 px-4 w-24 text-right">TTFB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                  {deepCrawlPages.map((p) => (
                    <tr key={p.url}>
                      <td className="py-2.5 px-4 font-mono text-[#0F172A] dark:text-[#F8FAFC] break-all">
                        {p.url}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {p.status === 0 ? 'Timeout' : p.status}
                      </td>
                      <td className="py-2.5 px-3 text-[#475569] dark:text-[#CBD5E1]">
                        {p.title || p.error || '(kosong)'}
                        {p.duplicateTitle && (
                          <span className="ml-2 text-[#D97706] font-medium">(Duplikat)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {p.metaDescLength}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{p.ttfbMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Pemeriksaan Pasif Jalur Admin &amp; Berkas Konfigurasi
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
              {adminExposures.map((exp) => (
                <div key={exp.path} className="px-4 py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {exp.path}
                    </span>
                    <span className="ml-2 text-[#64748B] dark:text-[#94A3B8]">· {exp.note}</span>
                  </div>
                  <span
                    className={`font-mono font-semibold ${
                      exp.accessible
                        ? exp.path.includes('.env') || exp.path.includes('.git')
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                        : 'text-[#16A34A]'
                    }`}
                  >
                    HTTP {exp.status || 'Timeout'} {exp.accessible ? '(Terakses)' : '(Aman / Tertutup)'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 text-xs text-[#64748B] dark:text-[#94A3B8]">
          Saat ini Anda melihat hasil <strong>Express Inspection</strong>. Jalankan mode{' '}
          <strong>Deep Crawl Audit</strong> jika ingin menelusuri hingga 20 halaman internal
          sekaligus memeriksa eksposur jalur admin/berkas konfigurasi.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RawInspector — Sertifikat TLS/SSL, probes pendukung, DOM outline, raw headers
// ============================================================================

export function RawInspector({ report }: { report: AuditReport }) {
  const headerEntries = Object.entries(report.rawHeaders).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Inspeksi Teknis Mentah · {report.network.finalUrl}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Raw HTTP Headers, TLS/SSL &amp; Ekstraksi DOM
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl bg-[#FFFFFF] dark:bg-[#0F172A] overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Detail Sertifikat TLS / SSL
          </div>
          <dl className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Protokol Negosiasi</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                {report.tls.protocol || '-'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Cipher Suite</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.tls.cipher || '-'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Penerbit (Issuer)</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.tls.issuer || '-'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Subject CN / SAN</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] text-right">
                {report.tls.subjectAltNames.length > 0
                  ? report.tls.subjectAltNames.slice(0, 3).join(', ')
                  : report.tls.subject || '-'}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Berlaku Hingga</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] tabular-nums text-right">
                {report.tls.validTo || '-'}{' '}
                {report.tls.daysRemaining !== null && `(${report.tls.daysRemaining} hari)`}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl bg-[#FFFFFF] dark:bg-[#0F172A] overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Probe Berkas Pendukung &amp; Ekstraksi DOM
          </div>
          <dl className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">/robots.txt</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                HTTP {report.probes.robotsTxt.status}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">/sitemap-index.xml</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                HTTP {report.probes.sitemapIndexXml.status}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">/sitemap.xml</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                HTTP {report.probes.sitemapXml.status}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">/.well-known/security.txt</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                HTTP {report.probes.securityTxt.status}
              </dd>
            </div>
            <div className="px-4 py-2.5 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Meta Generator</dt>
              <dd className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
                {report.dom.generator || 'Tidak ada'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl bg-[#FFFFFF] dark:bg-[#0F172A] overflow-hidden">
        <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
          Ringkasan Metadata &amp; Urutan Heading DOM
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div>
            <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">
              Title ({report.dom.titleLength} kar):{' '}
            </span>
            <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {report.dom.title || '(kosong)'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">
              Meta Description ({report.dom.metaDescriptionLength} kar):{' '}
            </span>
            <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {report.dom.metaDescription || '(kosong)'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">Canonical: </span>
            <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">
              {report.dom.canonical || '(kosong)'}
            </span>
          </div>
          <div>
            <div className="font-semibold text-[#475569] dark:text-[#CBD5E1] mb-1">
              Urutan Heading Halaman:
            </div>
            <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-xs text-[#334155] dark:text-[#CBD5E1] space-y-1 max-h-60 overflow-y-auto">
              {report.dom.headingSequence.length > 0 ? (
                report.dom.headingSequence.map((h, i) => <div key={i}>{h}</div>)
              ) : (
                <div>Tidak ada tag heading terdeteksi.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl bg-[#FFFFFF] dark:bg-[#0F172A] overflow-hidden">
        <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs">
          <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            HTTP Response Headers ({headerEntries.length})
          </span>
          <span className="font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            HTTP {report.network.statusCode}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8]">
                <th className="py-2 px-4 w-56 font-semibold">Header</th>
                <th className="py-2 px-4 font-semibold">Nilai Aktual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] font-mono">
              {headerEntries.map(([key, val]) => (
                <tr key={key} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/30">
                  <td className="py-2 px-4 font-semibold text-[#0F172A] dark:text-[#F8FAFC] align-top whitespace-nowrap">
                    {key}
                  </td>
                  <td className="py-2 px-4 text-[#475569] dark:text-[#CBD5E1] break-all align-top">
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

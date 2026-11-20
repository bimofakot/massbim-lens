import { useState } from 'react';
import { Check, Copy, Eye, Globe, MessageSquare, Monitor, RotateCcw, Share2, Smartphone } from 'lucide-react';
import type { AuditReport } from '../types/audit';

// ============================================================================
// SerpSocialSimulator — Pratinjau Google SERP, WhatsApp, X & LinkedIn + Editor Live
// ============================================================================

interface SerpSocialSimulatorProps {
  report: AuditReport;
  onNotify?: (msg: string) => void;
}

type PreviewPlatform = 'google_desktop' | 'google_mobile' | 'whatsapp' | 'twitter' | 'linkedin';

export function SerpSocialSimulator({ report, onNotify }: SerpSocialSimulatorProps) {
  const initialTitle = report.dom.title || '';
  const initialDesc = report.dom.metaDescription || '';
  const initialOgTitle = report.dom.ogTitle || initialTitle;
  const initialOgDesc = report.dom.ogDescription || initialDesc;
  const initialOgImage = report.dom.ogImage || '';
  const initialCanonical = report.dom.canonical || report.network.finalUrl;

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDesc);
  const [ogTitle, setOgTitle] = useState(initialOgTitle);
  const [ogDescription, setOgDescription] = useState(initialOgDesc);
  const [ogImage, setOgImage] = useState(initialOgImage);
  const [canonical, setCanonical] = useState(initialCanonical);
  const [platform, setPlatform] = useState<PreviewPlatform>('google_desktop');
  const [copiedHtml, setCopiedHtml] = useState(false);

  const hostname = (() => {
    try {
      return new URL(canonical || report.network.finalUrl).hostname;
    } catch {
      return report.network.finalUrl.replace(/^https?:\/\//, '').split('/')[0];
    }
  })();

  const handleReset = () => {
    setTitle(initialTitle);
    setDescription(initialDesc);
    setOgTitle(initialOgTitle);
    setOgDescription(initialOgDesc);
    setOgImage(initialOgImage);
    setCanonical(initialCanonical);
    onNotify?.('Pratinjau dikembalikan ke metadata aktual website');
  };

  const escapeAttr = (val: string) => val.replace(/"/g, '&quot;');

  const generatedMetaCode = `<title>${title}</title>
<meta name="description" content="${escapeAttr(description)}" />
<link rel="canonical" href="${escapeAttr(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeAttr(canonical)}" />
<meta property="og:title" content="${escapeAttr(ogTitle)}" />
<meta property="og:description" content="${escapeAttr(ogDescription)}" />
${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}" />\n` : ''}<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(ogTitle)}" />
<meta name="twitter:description" content="${escapeAttr(ogDescription)}" />`;

  const handleCopyHead = async () => {
    try {
      await navigator.clipboard.writeText(generatedMetaCode);
      setCopiedHtml(true);
      onNotify?.('Kode HTML meta tags berhasil disalin ke clipboard');
      setTimeout(() => setCopiedHtml(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const platformTabs: { id: PreviewPlatform; label: string; icon: typeof Monitor }[] = [
    { id: 'google_desktop', label: 'Google Desktop', icon: Monitor },
    { id: 'google_mobile', label: 'Google Mobile', icon: Smartphone },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'twitter', label: 'X / Twitter', icon: Share2 },
    { id: 'linkedin', label: 'LinkedIn / FB', icon: Globe },
  ];

  const titleStatus =
    title.length === 0
      ? 'text-[#DC2626]'
      : title.length >= 30 && title.length <= 60
        ? 'text-[#16A34A]'
        : 'text-[#D97706]';

  const descStatus =
    description.length === 0
      ? 'text-[#DC2626]'
      : description.length >= 70 && description.length <= 160
        ? 'text-[#16A34A]'
        : 'text-[#D97706]';

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Modul Simulator SERP &amp; Sosial · {report.network.finalUrl}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Simulator Pratinjau Google SERP &amp; Media Sosial
        </h1>
        <p className="mt-1 text-xs text-[#475569] dark:text-[#94A3B8]">
          Uji tampilan link website Anda saat muncul di pencarian Google dan ketika dibagikan ke WhatsApp, X, atau LinkedIn. Ubah teks di editor sebelah kiri untuk simulasi langsung.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Meta Tags Sandbox Editor */}
        <section className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Editor Uji Coba Meta Tags Live
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Aktual</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label htmlFor="serp-title" className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Tag &lt;title&gt;
                </label>
                <span className={`font-mono tabular-nums ${titleStatus}`}>
                  {title.length} / 60 kar
                </span>
              </div>
              <input
                id="serp-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul halaman di hasil pencarian Google"
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label htmlFor="serp-desc" className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Meta Description
                </label>
                <span className={`font-mono tabular-nums ${descStatus}`}>
                  {description.length} / 160 kar
                </span>
              </div>
              <textarea
                id="serp-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ringkasan yang tampil di bawah judul pada hasil pencarian Google"
                className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="serp-canonical" className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block">
                URL Canonical
              </label>
              <input
                id="serp-canonical"
                type="text"
                value={canonical}
                onChange={(e) => setCanonical(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
              <div className="space-y-1">
                <label htmlFor="og-title" className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block">
                  Open Graph Title (og:title)
                </label>
                <input
                  id="og-title"
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="og-desc" className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block">
                  Open Graph Description (og:description)
                </label>
                <textarea
                  id="og-desc"
                  rows={2}
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="og-image" className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block">
                  URL Gambar Pratinjau (og:image)
                </label>
                <input
                  id="og-image"
                  type="text"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://domainanda.com/og-cover.jpg"
                  className="w-full px-3 py-2 font-mono rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Multi-Platform Visual Preview + Generated Head Code */}
        <section className="lg:col-span-7 space-y-5">
          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                <Eye className="w-4 h-4 text-[#2563EB]" />
                <span>Simulasi Tampilan Multi-Platform</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl">
              {platformTabs.map((tab) => {
                const Icon = tab.icon;
                const active = platform === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlatform(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#2563EB] text-[#FFFFFF]'
                        : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Platform Canvas */}
            <div className="p-5 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B]">
              {platform === 'google_desktop' && (
                <div className="max-w-xl space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#E2E8F0] dark:bg-[#1E293B] flex items-center justify-center text-[11px] font-bold text-[#475569] dark:text-[#CBD5E1] uppercase">
                      {hostname.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#0F172A] dark:text-[#E2E8F0] truncate">
                        {hostname}
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
                        {canonical}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-medium text-[#1A0DAB] dark:text-[#8AB4F8] leading-snug line-clamp-1">
                    {title || '(Tag <title> belum diisi)'}
                  </div>
                  <p className="text-xs text-[#4D5156] dark:text-[#BDC1C6] leading-relaxed line-clamp-2">
                    {description || 'Meta description belum tersedia. Mesin pencari akan mengambil cuplikan acak dari halaman.'}
                  </p>
                </div>
              )}

              {platform === 'google_mobile' && (
                <div className="max-w-sm mx-auto bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-[10px] font-bold uppercase">
                      {hostname.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {hostname}
                      </div>
                      <div className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
                        {canonical}
                      </div>
                    </div>
                  </div>
                  <div className="text-base font-medium text-[#1A0DAB] dark:text-[#8AB4F8] leading-snug line-clamp-2">
                    {title || '(Tag <title> belum diisi)'}
                  </div>
                  <p className="text-xs text-[#4D5156] dark:text-[#BDC1C6] leading-relaxed line-clamp-3">
                    {description || 'Meta description belum tersedia.'}
                  </p>
                </div>
              )}

              {platform === 'whatsapp' && (
                <div className="max-w-sm mx-auto rounded-xl bg-[#E7FFDB] dark:bg-[#054640] p-2.5 space-y-2 border border-[#16A34A]/20">
                  <div className="rounded-lg overflow-hidden bg-[#FFFFFF]/85 dark:bg-[#0B1120]/70 flex flex-col">
                    {ogImage && (
                      <div className="h-36 bg-[#E2E8F0] dark:bg-[#1E293B] overflow-hidden">
                        <img
                          src={ogImage}
                          alt="WhatsApp OG Preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-2.5 space-y-1">
                      <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-2">
                        {ogTitle || title || '(Tanpa og:title)'}
                      </div>
                      <div className="text-[11px] text-[#475569] dark:text-[#CBD5E1] line-clamp-2">
                        {ogDescription || description || '(Tanpa og:description)'}
                      </div>
                      <div className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
                        {hostname}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#2563EB] dark:text-[#93C5FD] underline font-mono truncate px-1">
                    {canonical}
                  </div>
                </div>
              )}

              {platform === 'twitter' && (
                <div className="max-w-md mx-auto rounded-2xl border border-[#CBD5E1] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#0F172A] overflow-hidden">
                  <div className="h-48 bg-[#E2E8F0] dark:bg-[#1E293B] flex items-center justify-center text-xs font-mono text-[#64748B]">
                    {ogImage ? (
                      <img
                        src={ogImage}
                        alt="Twitter Card Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>Gambar og:image / twitter:image belum tersedia (1200×630)</span>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1">
                    <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{hostname}</div>
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1">
                      {ogTitle || title || '(Tanpa judul)'}
                    </div>
                    <div className="text-xs text-[#475569] dark:text-[#94A3B8] line-clamp-2">
                      {ogDescription || description || '(Tanpa deskripsi)'}
                    </div>
                  </div>
                </div>
              )}

              {platform === 'linkedin' && (
                <div className="max-w-md mx-auto border border-[#CBD5E1] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#0F172A] rounded-lg overflow-hidden">
                  <div className="h-48 bg-[#E2E8F0] dark:bg-[#1E293B] flex items-center justify-center text-xs font-mono text-[#64748B]">
                    {ogImage ? (
                      <img
                        src={ogImage}
                        alt="LinkedIn OG Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>Gambar og:image belum tersedia (1200×627)</span>
                    )}
                  </div>
                  <div className="p-3.5 bg-[#F1F5F9] dark:bg-[#1E293B]/60 space-y-1">
                    <div className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-2">
                      {ogTitle || title || '(Tanpa og:title)'}
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                      {hostname}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Copyable Ready-to-Paste Head Snippet */}
          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Kode HTML &lt;head&gt; Siap Pakai dari Simulasi Anda
              </span>
              <button
                type="button"
                onClick={handleCopyHead}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#FFFFFF] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span className="text-[#16A34A]">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin HTML</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-[#0F172A] dark:bg-[#020617] text-[#F8FAFC] font-mono text-xs overflow-x-auto leading-relaxed">
              <code>{generatedMetaCode}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

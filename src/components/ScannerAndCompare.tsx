import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  Cpu,
  Eye,
  GitCompare,
  Globe,
  History,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  AuditCategory,
  AuditReport,
  ScanMode,
  SupportedDetectionCategory,
} from '../types/audit';
import { ALL_AUDIT_CATEGORIES, CATEGORY_LABELS } from '../utils/scoreSimulation';

// ============================================================================
// ScannerHub — Halaman awal input URL universal, self-audit & riwayat lokal
// ============================================================================

interface ScannerHubProps {
  history: AuditReport[];
  supportedDetections: SupportedDetectionCategory[];
  loading: boolean;
  onStartScan: (url: string, mode: ScanMode) => void;
  onSelfAudit: () => void;
  onOpenReport: (report: AuditReport) => void;
  onDeleteHistoryItem: (id: string) => void;
  onOpenCompareWith: (report: AuditReport) => void;
}

const CAPABILITY_PILLARS = [
  {
    icon: Zap,
    title: 'Performa & Payload Aset',
    desc: 'Mengukur TTFB aktual, kompresi Brotli/Gzip, kebijakan cache aset statis, preload kritis, dan bobot HTML/CSS/JS.',
  },
  {
    icon: ShieldCheck,
    title: 'Keamanan, TLS, DNS & Cookie',
    desc: 'Memeriksa CSP, HSTS, COOP/CORP, mixed content, flag Set-Cookie, validitas SSL, serta SPF, DMARC & CAA pada DNS.',
  },
  {
    icon: Globe,
    title: 'SEO & Simulator SERP / Sosial',
    desc: 'Validasi meta, canonical, robots/sitemap, JSON-LD, broken links, serta simulator pratinjau Google, WhatsApp, X & LinkedIn.',
  },
  {
    icon: Smartphone,
    title: 'Audit PWA & Installability',
    desc: 'Inspeksi Web App Manifest, Service Worker, kepatuhan ikon 192/512px, maskable safe-zone, dan skor kesiapan instalasi.',
  },
  {
    icon: Cpu,
    title: 'Tech Stack, Tema & Pola AI',
    desc: 'Mengenali framework, Laravel, Midtrans/payment gateway, postur Light/Dark mode, dan sinyal template atau pola AI.',
  },
  {
    icon: Eye,
    title: 'Deep Crawl & Self-Audit',
    desc: 'Penelusuran hingga 20 halaman internal, uji jalur sensitif pasif, plus tombol Self-Audit untuk menguji Massbim Lens sendiri.',
  },
];

export function ScannerHub({
  history,
  supportedDetections,
  loading,
  onStartScan,
  onSelfAudit,
  onOpenReport,
  onDeleteHistoryItem,
  onOpenCompareWith,
}: ScannerHubProps) {
  const [urlInput, setUrlInput] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode>('express');
  const [showMatrix, setShowMatrix] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pintasan keyboard Ctrl+K / Cmd+K atau "/" untuk langsung fokus ke input URL
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || loading) return;
    onStartScan(urlInput.trim(), scanMode);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-14 py-6 sm:py-10"
    >
      {/* Hero & Universal Scanner Input */}
      <section className="max-w-4xl mx-auto text-center space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] tracking-wide">
            Open-Source Website Diagnostics, PWA &amp; Architecture Inspector
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] text-balance leading-[1.15]">
            Periksa kualitas, keamanan, PWA, dan arsitektur website apa pun
          </h1>
          <p className="text-sm sm:text-base text-[#475569] dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            Massbim Lens menjalankan inspeksi HTTP, TLS/SSL, DNS, PWA, struktur DOM, integritas
            tautan, simulator Google SERP, hingga deteksi tech stack &amp; pola AI secara real-time.
          </p>
        </div>

        {/* Mode Switcher + URL Search Form */}
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-4 sm:p-5 space-y-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-[#FFFFFF] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl">
              <button
                type="button"
                onClick={() => setScanMode('express')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  scanMode === 'express'
                    ? 'bg-[#2563EB] text-[#FFFFFF]'
                    : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                }`}
              >
                Express Inspection
              </button>
              <button
                type="button"
                onClick={() => setScanMode('deep')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  scanMode === 'deep'
                    ? 'bg-[#D97706] text-[#FFFFFF]'
                    : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                }`}
              >
                Deep Crawl Audit
              </button>
            </div>

            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {scanMode === 'express'
                ? 'Cepat (~2–5 dtk): Halaman utama + 12 tautan + PWA/TLS/DNS'
                : 'Menyeluruh (~15–45 dtk): Hingga 20 halaman internal + uji jalur sensitif (dengan persetujuan risiko)'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Masukkan domain atau URL (tekan Ctrl+K atau / untuk fokus)"
                aria-label="Masukkan URL website yang ingin diaudit"
                className="w-full pl-10 pr-4 py-3 text-sm font-mono text-[#0F172A] dark:text-[#F8FAFC] bg-[#FFFFFF] dark:bg-[#0B1120] border border-[#CBD5E1] dark:border-[#334155] rounded-xl focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className={`px-6 py-3 text-sm font-semibold text-[#FFFFFF] rounded-xl transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 ${
                scanMode === 'deep'
                  ? 'bg-[#D97706] hover:bg-[#B45309]'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}
            >
              <span>
                {loading
                  ? 'Memindai…'
                  : scanMode === 'deep'
                    ? 'Konfirmasi & Deep Crawl'
                    : 'Periksa Website'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <div className="flex flex-wrap items-center gap-2">
              <span>Uji cepat:</span>
              {['massbim.my.id', 'astro.build', 'laravel.com'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setUrlInput(sample)}
                  className="font-mono text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                >
                  {sample}
                </button>
              ))}
              <span className="text-[#CBD5E1] dark:text-[#475569]" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={onSelfAudit}
                className="font-semibold text-[#16A34A] hover:underline disabled:opacity-50"
              >
                Audit Website Ini (Self-Audit)
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowMatrix((v) => !v)}
              className="inline-flex items-center gap-1 font-medium text-[#475569] dark:text-[#CBD5E1] hover:text-[#2563EB]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {showMatrix
                  ? 'Tutup daftar teknologi terdeteksi'
                  : 'Lihat cakupan teknologi terdeteksi'}
              </span>
            </button>
          </div>

          {showMatrix && (
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {supportedDetections.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {cat.category}
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    {cat.signatures.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Browser Scan History */}
      {history.length > 0 && (
        <section className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Riwayat Pemindaian Terakhir (Cache Browser Anda)
              </h2>
            </div>
            <span className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {history.length} tersimpan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.slice(0, 6).map((item) => {
              const host = item.network.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
              return (
                <div
                  key={item.id}
                  className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[#2563EB]/50 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <button
                      type="button"
                      onClick={() => onOpenReport(item)}
                      className="font-mono text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#2563EB] truncate block max-w-full text-left"
                    >
                      {host}
                    </button>
                    <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono tabular-nums">
                      Skor {item.overallScore}/100 · {item.network.ttfbMs} ms ·{' '}
                      {item.coverage.mode === 'deep' ? 'Deep Crawl' : 'Express'} ·{' '}
                      {new Date(item.scannedAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenCompareWith(item)}
                      title="Bandingkan website ini"
                      className="p-2 rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] hover:text-[#2563EB]"
                    >
                      <GitCompare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryItem(item.id)}
                      title="Hapus dari riwayat"
                      className="p-2 rounded-lg text-[#64748B] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D]/30 hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReport(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 rounded-lg hover:bg-[#2563EB]/20 whitespace-nowrap"
                    >
                      Buka
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6 Core Inspection Modules Overview */}
      <section className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Modul Pemeriksaan Massbim Lens
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Setiap skor dihitung secara transparan dari pengujian jaringan dan DOM aktual—tanpa
              angka rekayasa.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#94A3B8]">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>9+ modul diagnostik aktif &amp; simulasi perbaikan</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITY_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  {pillar.title}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] pt-1">
          <Activity className="w-3.5 h-3.5 text-[#16A34A]" />
          <span>
            Jujur terhadap batasan: Jika sebuah situs dilindungi WAF/Cloudflare Challenge atau
            memblokir crawler, Massbim Lens akan menandainya sebagai{' '}
            <strong className="text-[#0F172A] dark:text-[#F8FAFC]">
              Pemeriksaan Selesai Sebagian
            </strong>
            .
          </span>
        </div>
      </section>
    </motion.div>
  );
}

// ============================================================================
// ScanProgressStepper — Indikator progres bertahap saat pemindaian berlangsung
// ============================================================================

const SCAN_STEPS = [
  'Validasi Keamanan URL & SSRF Guard',
  'Inspeksi Jaringan HTTP & Sertifikat TLS/SSL',
  'Resolusi DNS Publik (A, MX, CAA, SPF, DMARC)',
  'Ekstraksi DOM, PWA Manifest, Service Worker & Pola AI',
  'Verifikasi Integritas Tautan & Kalkulasi Skor 6 Pilar',
];

export function ScanProgressStepper({
  mode,
  targetLabel,
}: {
  mode: ScanMode;
  targetLabel?: string;
}) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const intervalMs = mode === 'deep' ? 1800 : 650;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [mode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 py-4"
      aria-busy="true"
      aria-label="Memindai website"
    >
      <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
              {mode === 'deep' ? 'Deep Crawl Audit Berjalan' : 'Express Inspection Berjalan'}
            </div>
            <div className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono">
              {targetLabel || 'Menganalisis target website…'}
            </div>
          </div>
          <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            Tahap {activeStep + 1} / {SCAN_STEPS.length}
          </span>
        </div>

        <ol className="space-y-2.5">
          {SCAN_STEPS.map((label, idx) => {
            const done = idx < activeStep;
            const current = idx === activeStep;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-colors ${
                  current
                    ? 'bg-[#2563EB]/5 border-[#2563EB]/30 text-[#0F172A] dark:text-[#F8FAFC] font-semibold'
                    : done
                      ? 'bg-[#F8FAFC] dark:bg-[#0B1120] border-[#E2E8F0] dark:border-[#1E293B] text-[#475569] dark:text-[#CBD5E1]'
                      : 'bg-transparent border-transparent text-[#94A3B8] dark:text-[#64748B]'
                }`}
              >
                <span className="shrink-0">
                  {done ? (
                    <Check className="w-4 h-4 text-[#16A34A]" />
                  ) : current ? (
                    <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-[#CBD5E1] dark:border-[#334155] inline-block" />
                  )}
                </span>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-32 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// CompareView — Analisis Head-to-Head dua website pada 6 pilar + infrastruktur
// ============================================================================

interface CompareViewProps {
  history: AuditReport[];
  initialReportA: AuditReport | null;
  onScanForCompare: (url: string, slot: 'A' | 'B') => Promise<AuditReport | null>;
}

export function CompareView({
  history,
  initialReportA,
  onScanForCompare,
}: CompareViewProps) {
  const [selectedAId, setSelectedAId] = useState<string>(
    initialReportA?.id || history[0]?.id || '',
  );
  const [selectedBId, setSelectedBId] = useState<string>(
    history.find((h) => h.id !== (initialReportA?.id || history[0]?.id))?.id || '',
  );
  const [urlInputA, setUrlInputA] = useState('');
  const [urlInputB, setUrlInputB] = useState('');
  const [scanningSlot, setScanningSlot] = useState<'A' | 'B' | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const reportA = history.find((h) => h.id === selectedAId) || null;
  const reportB = history.find((h) => h.id === selectedBId) || null;

  const handleQuickScan = async (slot: 'A' | 'B') => {
    const raw = slot === 'A' ? urlInputA : urlInputB;
    if (!raw.trim()) return;
    setScanningSlot(slot);
    setCompareError(null);
    try {
      const result = await onScanForCompare(raw.trim(), slot);
      if (result) {
        if (slot === 'A') {
          setSelectedAId(result.id);
          setUrlInputA('');
        } else {
          setSelectedBId(result.id);
          setUrlInputB('');
        }
      }
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Gagal memindai URL pembanding.');
    } finally {
      setScanningSlot(null);
    }
  };

  const formatHost = (r: AuditReport) =>
    r.network.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const rows: {
    label: string;
    valA: string;
    valB: string;
    diff?: number | null;
    higherIsBetter?: boolean;
  }[] =
    reportA && reportB
      ? [
          {
            label: 'Skor Keseluruhan',
            valA: `${reportA.overallScore}/100`,
            valB: `${reportB.overallScore}/100`,
            diff: reportA.overallScore - reportB.overallScore,
            higherIsBetter: true,
          },
          ...ALL_AUDIT_CATEGORIES.map((cat: AuditCategory) => {
            const scoreA = reportA.categories[cat]?.score ?? 0;
            const scoreB = reportB.categories[cat]?.score ?? 0;
            return {
              label: CATEGORY_LABELS[cat],
              valA: `${scoreA}/100`,
              valB: `${scoreB}/100`,
              diff: scoreA - scoreB,
              higherIsBetter: true,
            };
          }),
          {
            label: 'TTFB Server',
            valA: `${reportA.network.ttfbMs} ms`,
            valB: `${reportB.network.ttfbMs} ms`,
            diff: reportA.network.ttfbMs - reportB.network.ttfbMs,
            higherIsBetter: false,
          },
          {
            label: 'Payload HTML + Aset Sampel',
            valA: `${reportA.assetBreakdown.sampledAssetKb} KB`,
            valB: `${reportB.assetBreakdown.sampledAssetKb} KB`,
            diff: Number(
              (
                reportA.assetBreakdown.sampledAssetKb - reportB.assetBreakdown.sampledAssetKb
              ).toFixed(1),
            ),
            higherIsBetter: false,
          },
          {
            label: 'Protokol TLS',
            valA: reportA.tls.protocol || 'HTTP',
            valB: reportB.tls.protocol || 'HTTP',
          },
          {
            label: 'Postur Tema (Light/Dark)',
            valA: reportA.themeSupport.label,
            valB: reportB.themeSupport.label,
          },
          {
            label: 'Indikasi Desain / Template',
            valA: reportA.aiTemplateAnalysis.verdictLabel,
            valB: reportB.aiTemplateAnalysis.verdictLabel,
          },
          {
            label: 'DNS Email (SPF & DMARC)',
            valA: `SPF ${reportA.dns.spf ? '✓' : '✗'} · DMARC ${reportA.dns.dmarc ? '✓' : '✗'}`,
            valB: `SPF ${reportB.dns.spf ? '✓' : '✗'} · DMARC ${reportB.dns.dmarc ? '✓' : '✗'}`,
          },
          {
            label: 'Tech Stack Terdeteksi',
            valA: reportA.techStack.map((t) => t.name).join(', ') || '-',
            valB: reportB.techStack.map((t) => t.name).join(', ') || '-',
          },
        ]
      : [];

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      <div className="space-y-2 pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
          <GitCompare className="w-4 h-4" />
          <span>Analisis Head-to-Head</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Bandingkan Kualitas Dua Website
        </h1>
        <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
          Pilih dari riwayat scan di browser Anda atau pindai langsung URL baru pada Slot A dan Slot
          B.
        </p>
      </div>

      {compareError && (
        <div className="p-3.5 rounded-xl border border-[#DC2626]/30 bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 text-xs text-[#DC2626]">
          {compareError}
        </div>
      )}

      {/* Dual Slot Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['A', 'B'] as const).map((slot) => {
          const selectedId = slot === 'A' ? selectedAId : selectedBId;
          const setSelectedId = slot === 'A' ? setSelectedAId : setSelectedBId;
          const urlVal = slot === 'A' ? urlInputA : urlInputB;
          const setUrlVal = slot === 'A' ? setUrlInputA : setUrlInputB;

          return (
            <div
              key={slot}
              className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Website {slot}
              </div>

              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label={`Pilih riwayat untuk Website ${slot}`}
                className="w-full px-3 py-2 text-xs font-mono bg-[#FFFFFF] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] rounded-lg"
              >
                <option value="">-- Pilih dari riwayat scan --</option>
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatHost(item)} (Skor {item.overallScore} ·{' '}
                    {new Date(item.scannedAt).toLocaleTimeString('id-ID')})
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={urlVal}
                    onChange={(e) => setUrlVal(e.target.value)}
                    placeholder={`Atau scan URL baru untuk Slot ${slot}…`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#FFFFFF] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  disabled={!urlVal.trim() || scanningSlot !== null}
                  onClick={() => handleQuickScan(slot)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span>{scanningSlot === slot ? 'Memindai…' : 'Scan'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Head-to-Head Matrix */}
      {!reportA || !reportB ? (
        <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-10 text-center bg-[#F8FAFC] dark:bg-[#0F172A] space-y-2">
          <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Pilih atau pindai dua website untuk melihat perbandingan
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Anda dapat membandingkan dua domain berbeda (misalnya website Anda vs kompetitor) atau
            dua hasil scan dari domain yang sama.
          </p>
        </div>
      ) : (
        <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#0F172A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1120]">
                  <th className="py-3 px-4 w-56 text-[#64748B] dark:text-[#94A3B8] font-semibold">
                    Parameter Audit
                  </th>
                  <th className="py-3 px-4 font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    A: {formatHost(reportA)}
                  </th>
                  <th className="py-3 px-4 font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    B: {formatHost(reportB)}
                  </th>
                  <th className="py-3 px-4 text-right w-32 text-[#64748B] dark:text-[#94A3B8] font-semibold">
                    Selisih (A vs B)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                {rows.map((row) => {
                  const hasDiff = typeof row.diff === 'number' && row.diff !== 0;
                  const aWins = hasDiff && (row.higherIsBetter ? row.diff! > 0 : row.diff! < 0);

                  return (
                    <tr key={row.label} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/30">
                      <td className="py-3 px-4 font-medium text-[#475569] dark:text-[#CBD5E1]">
                        {row.label}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                        {row.valA}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#0F172A] dark:text-[#F8FAFC]">
                        {row.valB}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {typeof row.diff !== 'number' ? (
                          <span className="text-[#64748B]">—</span>
                        ) : row.diff === 0 ? (
                          <span className="text-[#64748B]">Imbang</span>
                        ) : (
                          <span
                            className={
                              aWins ? 'text-[#16A34A] font-semibold' : 'text-[#D97706] font-semibold'
                            }
                          >
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

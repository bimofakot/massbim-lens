import { useState } from 'react';
import {
  Accessibility,
  Activity,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Cpu,
  Download,
  Eye,
  FileCode2,
  Gauge,
  Github,
  Globe,
  Info,
  Instagram,
  Link2,
  Mail,
  Menu,
  Moon,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Smartphone,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { AuditCategory, AuditReport } from '../types/audit';

export type AppView = 'hub' | 'report' | 'compare';
export type NavSection =
  | 'overview'
  | AuditCategory
  | 'serp_social'
  | 'dns_infra'
  | 'links_assets'
  | 'inspector';

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'success' | 'info';
}

// ============================================================================
// BrandLogo — Logo resmi Massbim Lens dengan fallback SVG bila gambar gagal
// ============================================================================

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 32, className = '' }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/25 flex items-center justify-center shrink-0 ${className}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4/6 h-4/6 text-[#2563EB]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src="/src/assets/images/massbim_lens_logo_1795190130803.jpg"
      alt="Logo Massbim Lens"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`rounded-lg object-cover border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ============================================================================
// PWAInstallButton — Prompt instalasi PWA (Chromium beforeinstallprompt & iOS)
// ============================================================================

export function PWAInstallButton({ onInstalled }: { onInstalled?: () => void }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          const accepted = await install();
          if (accepted) onInstalled?.();
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] bg-[#2563EB]/10 rounded-lg hover:bg-[#2563EB]/20 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instal App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instal iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Instal Massbim Lens di iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup panduan instalasi iOS"
                  className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-[#475569] dark:text-[#CBD5E1] space-y-2 list-decimal pl-4">
                <li>
                  Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah Safari.
                </li>
                <li>
                  Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2563EB] rounded-lg"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

// ============================================================================
// TopBar — Header navigasi utama (brand, view tabs, PWA install, theme, export)
// ============================================================================

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  report: AuditReport | null;
  loading: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRescan: () => void;
  onExportMarkdown: () => void;
  onPrintPdf: () => void;
  onOpenMobileMenu?: () => void;
  showSidebarTrigger: boolean;
  onAppInstalled?: () => void;
}

export function TopBar({
  activeView,
  onSelectView,
  report,
  loading,
  darkMode,
  onToggleDarkMode,
  onRescan,
  onExportMarkdown,
  onPrintPdf,
  onOpenMobileMenu,
  showSidebarTrigger,
  onAppInstalled,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 dark:bg-[#0B1120]/95 backdrop-blur-sm border-b border-[#E2E8F0] dark:border-[#1E293B] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
      {/* Zone 1: Brand Lockup */}
      <div className="flex items-center gap-3 shrink-0">
        {showSidebarTrigger && onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Buka navigasi laporan"
            className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1]"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelectView('hub')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
        >
          <BrandLogo size={30} />
          <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Massbim Lens
          </span>
        </button>
      </div>

      {/* Zone 2: View Switcher */}
      <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => onSelectView('hub')}
          className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors ${
            activeView === 'hub'
              ? 'text-[#2563EB] dark:text-[#60A5FA] border-b-2 border-[#2563EB]'
              : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Scanner
        </button>
        {report && (
          <button
            type="button"
            onClick={() => onSelectView('report')}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors ${
              activeView === 'report'
                ? 'text-[#2563EB] dark:text-[#60A5FA] border-b-2 border-[#2563EB]'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            Laporan Aktif
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelectView('compare')}
          className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors ${
            activeView === 'compare'
              ? 'text-[#2563EB] dark:text-[#60A5FA] border-b-2 border-[#2563EB]'
              : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Bandingkan
        </button>
      </nav>

      {/* Zone 3: PWA Install + Theme Toggle + Report Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <PWAInstallButton onInstalled={onAppInstalled} />

        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
          className="p-2 rounded-lg border border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors shrink-0"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {activeView === 'report' && report && (
          <>
            <button
              type="button"
              onClick={onPrintPdf}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak PDF</span>
            </button>

            <button
              type="button"
              onClick={onExportMarkdown}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor .MD</span>
            </button>

            <button
              type="button"
              onClick={onRescan}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Memindai…' : 'Scan Ulang'}</span>
            </button>
          </>
        )}

        {activeView !== 'report' && (
          <button
            type="button"
            onClick={() => onSelectView(activeView === 'compare' ? 'hub' : 'compare')}
            className="md:hidden px-3 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2563EB] rounded-lg whitespace-nowrap shrink-0"
          >
            {activeView === 'compare' ? 'Scanner' : 'Bandingkan'}
          </button>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// Sidebar — Navigasi 6 pilar skor & 4 modul diagnostik/simulator laporan
// ============================================================================

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  report: AuditReport;
  simulatedScores: Record<AuditCategory, number>;
  fixedCount: number;
  onResetSimulation: () => void;
  onSwitchTarget: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const SCORE_NAV_ITEMS: { id: AuditCategory; label: string; icon: typeof Activity }[] = [
  { id: 'performance', label: 'Performa', icon: Activity },
  { id: 'accessibility', label: 'Aksesibilitas', icon: Accessibility },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'security', label: 'Keamanan', icon: ShieldAlert },
  { id: 'pwa', label: 'PWA & Installability', icon: Smartphone },
  { id: 'ai_origin', label: 'Pola AI & Tech Stack', icon: Cpu },
];

const DIAGNOSTIC_NAV_ITEMS: { id: NavSection; label: string; icon: typeof Eye }[] = [
  { id: 'serp_social', label: 'Simulator SERP & Sosial', icon: Eye },
  { id: 'dns_infra', label: 'DNS, Email & Server', icon: Server },
  { id: 'links_assets', label: 'Tautan, Aset & Crawl', icon: Link2 },
  { id: 'inspector', label: 'Raw HTTP & SSL', icon: FileCode2 },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  report,
  simulatedScores,
  fixedCount,
  onResetSimulation,
  onSwitchTarget,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const host = report.network.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const renderButton = (
    id: NavSection,
    label: string,
    Icon: typeof Activity,
    score: number | null,
  ) => {
    const isActive = activeSection === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          onSelectSection(id);
          onCloseMobile();
        }}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-[#2563EB]/10 text-[#1D4ED8] dark:text-[#60A5FA] font-semibold'
            : 'text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] font-medium'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        {score !== null && (
          <span
            className={`font-mono text-xs tabular-nums ${
              score >= 90
                ? 'text-[#16A34A]'
                : score >= 70
                  ? 'text-[#D97706]'
                  : 'text-[#DC2626]'
            }`}
          >
            {score}
          </span>
        )}
      </button>
    );
  };

  const content = (
    <div className="flex h-full flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-[#1E293B] px-4 py-5 overflow-y-auto">
      <div className="space-y-5">
        <div className="px-2 space-y-2">
          <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Target Laporan Aktif
          </div>
          <div className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
              <Globe className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{host}</span>
            </div>
            <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {report.coverage.mode === 'deep' ? 'Deep Crawl' : 'Express'} · HTTP{' '}
              {report.network.statusCode} · {report.network.ttfbMs} ms
            </div>
            <button
              type="button"
              onClick={() => {
                onSwitchTarget();
                onCloseMobile();
              }}
              className="w-full text-left text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline pt-0.5"
            >
              Ganti / Periksa Website Lain →
            </button>
          </div>
        </div>

        <nav aria-label="Bagian laporan audit" className="space-y-4">
          <div className="space-y-1">{renderButton('overview', 'Ringkasan & Skor', Gauge, null)}</div>

          <div className="space-y-1">
            <div className="px-2 mb-1.5 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
              6 Pilar Skor Audit
            </div>
            {SCORE_NAV_ITEMS.map((item) =>
              renderButton(item.id, item.label, item.icon, simulatedScores[item.id] ?? 0),
            )}
          </div>

          <div className="space-y-1">
            <div className="px-2 mb-1.5 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Diagnostik &amp; Simulator
            </div>
            {DIAGNOSTIC_NAV_ITEMS.map((item) => renderButton(item.id, item.label, item.icon, null))}
          </div>
        </nav>
      </div>

      <div className="pt-4 mt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-3 px-2">
        <div className="flex items-center justify-between text-xs text-[#475569] dark:text-[#CBD5E1]">
          <span className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Simulasi dicentang</span>
          </span>
          <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
            {fixedCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onResetSimulation}
          disabled={fixedCount === 0}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#FFFFFF] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] disabled:opacity-45 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Simulasi</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 no-print">
        {content}
      </aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-[#0F172A]/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full">{content}</div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// DeepScanConsentModal — Dialog persetujuan risiko eksplisit sebelum Deep Crawl
// ============================================================================

interface DeepScanConsentModalProps {
  isOpen: boolean;
  targetUrl: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeepScanConsentModal({
  isOpen,
  targetUrl,
  onCancel,
  onConfirm,
}: DeepScanConsentModalProps) {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deep-scan-title"
    >
      <div className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="deep-scan-title"
                className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]"
              >
                Konfirmasi Risiko Deep Crawl Audit
              </h2>
              <p className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] truncate max-w-xs">
                {targetUrl}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dialog konfirmasi"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            Mode <strong>Deep Crawl Audit</strong> menelusuri hingga 20 halaman internal (dari
            sitemap &amp; tautan navigasi), memeriksa hingga 25 tautan, serta menguji aksesibilitas
            jalur konfigurasi sensitif secara pasif. Harap perhatikan risiko berikut sebelum
            melanjutkan:
          </p>

          <ul className="space-y-2 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/60 border border-[#E2E8F0] dark:border-[#334155]">
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>
                <strong>Beban Server &amp; Rate Limiting:</strong> Puluhan permintaan paralel dalam
                waktu singkat dapat memicu blokir sementara dari WAF/Cloudflare (HTTP 403/429) atau
                membebani server hosting berskala kecil.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>
                <strong>Durasi Pemindaian Lebih Lama:</strong> Proses membutuhkan sekitar 15–45
                detik tergantung kecepatan respons situs target.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>
                <strong>Izin &amp; Tanggung Jawab Penuh:</strong> Pastikan Anda adalah pemilik
                website atau telah memiliki izin tertulis. Risiko operasional ditanggung penuh oleh
                pengguna.
              </span>
            </li>
          </ul>
        </div>

        <label className="flex items-start gap-2.5 text-xs text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] dark:border-[#475569] text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span>
            Saya memahami seluruh risiko di atas dan bertanggung jawab penuh atas pemindaian Deep
            Crawl pada domain ini.
          </span>
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
          >
            Batalkan
          </button>
          <button
            type="button"
            disabled={!accepted}
            onClick={() => {
              setAccepted(false);
              onConfirm();
            }}
            className="px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#D97706] rounded-lg hover:bg-[#B45309] disabled:opacity-45 disabled:pointer-events-none transition-colors"
          >
            Setuju &amp; Mulai Deep Crawl
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ToastContainer — Notifikasi ringan non-intrusif di pojok kanan bawah
// ============================================================================

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none no-print"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#0F172A] text-xs font-medium border border-[#334155] dark:border-[#CBD5E1]"
          >
            {toast.tone === 'info' ? (
              <Info className="w-3.5 h-3.5 text-[#60A5FA] dark:text-[#2563EB] shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80] dark:text-[#16A34A] shrink-0" />
            )}
            <span>{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Footer — Kredit open-source Massbim dan informasi kontak maintainer
// ============================================================================

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A]/60 py-8 px-4 sm:px-6 lg:px-8 no-print">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={26} />
            <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Massbim Lens
            </span>
            <span className="text-[#CBD5E1] dark:text-[#475569]" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Open-Source Project by{' '}
              <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Massbim</strong>
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-xl leading-relaxed">
            Riwayat scan dan simulasi checklist disimpan secara lokal di cache browser Anda sendiri (
            <code className="font-mono">localStorage</code>) untuk menjaga privasi dan tanpa
            memerlukan akun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569] dark:text-[#CBD5E1]">
          <a
            href="https://github.com/bimofakot/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap"
          >
            <Github className="w-3.5 h-3.5" />
            <span>bimofakot</span>
          </a>
          <a
            href="mailto:andraani30@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>andraani30@gmail.com</span>
          </a>
          <a
            href="https://instagram.com/massbibim_"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>@massbibim_</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

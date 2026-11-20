import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  Info,
  Moon,
  Search,
  Server,
  Smartphone,
  Sparkles,
  Sun,
} from 'lucide-react';
import type {
  AuditCategory,
  AuditFinding,
  AuditReport,
  ScanMode,
  Severity,
} from '../types/audit';
import {
  ALL_AUDIT_CATEGORIES,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  computeSimulatedReport,
} from '../utils/scoreSimulation';
import type { NavSection } from './LayoutChrome';

// ============================================================================
// Shared Visual Helpers — Warna skor & badge keparahan aksesibel
// ============================================================================

function getScoreColor(score: number): {
  label: string;
  text: string;
  stroke: string;
  bg: string;
} {
  if (score >= 90) {
    return { label: 'Optimal', text: 'text-[#16A34A]', stroke: '#16A34A', bg: 'bg-[#16A34A]' };
  }
  if (score >= 70) {
    return {
      label: 'Perlu Optimasi',
      text: 'text-[#D97706]',
      stroke: '#D97706',
      bg: 'bg-[#D97706]',
    };
  }
  return {
    label: 'Prioritas Tinggi',
    text: 'text-[#DC2626]',
    stroke: '#DC2626',
    bg: 'bg-[#DC2626]',
  };
}

function SeverityLabel({ finding, simulated }: { finding: AuditFinding; simulated: boolean }) {
  if (finding.passed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{SEVERITY_LABELS.pass}</span>
      </span>
    );
  }
  if (simulated) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] whitespace-nowrap">
        <Check className="w-3.5 h-3.5" />
        <span>Disimulasikan</span>
      </span>
    );
  }
  if (finding.severity === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#DC2626] whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{SEVERITY_LABELS.critical}</span>
      </span>
    );
  }
  if (finding.severity === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#D97706] whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{SEVERITY_LABELS.warning}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
      <Info className="w-3.5 h-3.5" />
      <span>{SEVERITY_LABELS.info}</span>
    </span>
  );
}

// Grafik radar 6 sumbu: membandingkan skor live (hijau) vs simulasi (biru putus-putus)
function ScoreRadarChart({
  live,
  simulated,
}: {
  live: Record<AuditCategory, number>;
  simulated: Record<AuditCategory, number>;
}) {
  const cx = 135;
  const cy = 125;
  const maxR = 78;
  const axes: { key: AuditCategory; shortLabel: string; angle: number }[] = [
    { key: 'performance', shortLabel: 'Performa', angle: -Math.PI / 2 },
    { key: 'seo', shortLabel: 'SEO', angle: -Math.PI / 6 },
    { key: 'pwa', shortLabel: 'PWA', angle: Math.PI / 6 },
    { key: 'security', shortLabel: 'Keamanan', angle: Math.PI / 2 },
    { key: 'ai_origin', shortLabel: 'Pola AI', angle: (5 * Math.PI) / 6 },
    { key: 'accessibility', shortLabel: 'A11y', angle: (-5 * Math.PI) / 6 },
  ];

  const toPoints = (scores: Record<AuditCategory, number>) =>
    axes
      .map((a) => {
        const r = ((scores[a.key] ?? 0) / 100) * maxR;
        return `${cx + r * Math.cos(a.angle)},${cy + r * Math.sin(a.angle)}`;
      })
      .join(' ');

  return (
    <svg
      viewBox="0 0 270 250"
      className="w-56 h-52 mx-auto"
      role="img"
      aria-label="Grafik radar skor 6 pilar"
    >
      {[25, 50, 75, 100].map((pct) => {
        const r = (pct / 100) * maxR;
        const pts = axes
          .map((a) => `${cx + r * Math.cos(a.angle)},${cy + r * Math.sin(a.angle)}`)
          .join(' ');
        return (
          <polygon
            key={pct}
            points={pts}
            fill="none"
            className="stroke-[#E2E8F0] dark:stroke-[#334155]"
            strokeWidth="1"
          />
        );
      })}
      {axes.map((a) => (
        <line
          key={a.key}
          x1={cx}
          y1={cy}
          x2={cx + maxR * Math.cos(a.angle)}
          y2={cy + maxR * Math.sin(a.angle)}
          className="stroke-[#E2E8F0] dark:stroke-[#334155]"
          strokeWidth="1"
        />
      ))}
      <polygon
        points={toPoints(simulated)}
        fill="#2563EB"
        fillOpacity="0.14"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <polygon
        points={toPoints(live)}
        fill="#16A34A"
        fillOpacity="0.18"
        stroke="#16A34A"
        strokeWidth="2"
      />
      {axes.map((a) => {
        const labelR = maxR + 18;
        const x = cx + labelR * Math.cos(a.angle);
        const y = cy + labelR * Math.sin(a.angle);
        const anchor =
          Math.abs(Math.cos(a.angle)) < 0.2
            ? 'middle'
            : Math.cos(a.angle) > 0
              ? 'start'
              : 'end';
        return (
          <text
            key={a.key}
            x={x}
            y={y + 3}
            textAnchor={anchor}
            className="fill-[#475569] dark:fill-[#CBD5E1] text-[9.5px] font-semibold"
          >
            {a.shortLabel} ({simulated[a.key] ?? 0})
          </text>
        );
      })}
    </svg>
  );
}

// ============================================================================
// OverviewSection — Ringkasan 6 pilar, peluncur cepat modul & tabel prioritas
// ============================================================================

interface OverviewSectionProps {
  report: AuditReport;
  simulatedFixedIds: Set<string>;
  onToggleSimulateFix: (id: string) => void;
  onNavigateSection: (section: NavSection) => void;
  onScanUrl: (url: string, mode: ScanMode) => void;
  loading: boolean;
}

export function OverviewSection({
  report,
  simulatedFixedIds,
  onToggleSimulateFix,
  onNavigateSection,
  onScanUrl,
  loading,
}: OverviewSectionProps) {
  const [quickUrl, setQuickUrl] = useState(report.network.requestedUrl);

  const sim = computeSimulatedReport(report, simulatedFixedIds);
  const overallColor = getScoreColor(sim.overallSimulated);
  const overallDelta = sim.overallSimulated - report.overallScore;

  const liveMap = ALL_AUDIT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = report.categories[cat]?.score ?? 0;
    return acc;
  }, {} as Record<AuditCategory, number>);

  const simMap = ALL_AUDIT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = sim.categories[cat]?.score ?? 0;
    return acc;
  }, {} as Record<AuditCategory, number>);

  const prioritizedIssues = [...report.findings]
    .filter((f) => !f.passed)
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2, pass: 3 };
      if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
      return b.impactWeight - a.impactWeight;
    });

  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (sim.overallSimulated / 100) * circumference;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim() || loading) return;
    onScanUrl(quickUrl.trim(), report.coverage.mode);
  };

  return (
    <div className="space-y-8">
      {/* Banner pengungkapan cakupan scan secara jujur */}
      {!report.coverage.complete ? (
        <div className="border border-[#D97706]/40 bg-[#FFFBEB] dark:bg-[#78350F]/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#B45309] dark:text-[#FBBF24]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{report.coverage.statusLabel}</span>
          </div>
          <ul className="list-disc pl-5 text-xs text-[#92400E] dark:text-[#FDE68A] space-y-1">
            {report.coverage.partialReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="border border-[#16A34A]/25 bg-[#F0FDF4] dark:bg-[#14532D]/20 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-[#15803D] dark:text-[#4ADE80]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {report.coverage.statusLabel} · {report.coverage.pagesScanned} halaman &amp;{' '}
              {report.coverage.linksChecked} tautan diperiksa dalam{' '}
              <span className="font-mono tabular-nums">{report.coverage.durationMs} ms</span>
            </span>
          </div>
          <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">
            {new Date(report.scannedAt).toLocaleString('id-ID')}
          </span>
        </div>
      )}

      {/* Header + Quick Re-target Search */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 pb-6 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
            {report.network.finalUrl}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] text-balance">
            Ringkasan Diagnostik 6 Pilar &amp; Simulasi Perbaikan
          </h1>
          <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
            Ditemukan{' '}
            <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {prioritizedIssues.length}
            </span>{' '}
            rekomendasi peningkatan dari{' '}
            <span className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {report.findings.length}
            </span>{' '}
            pengujian aktif.
          </p>
        </div>

        <form onSubmit={handleQuickSubmit} className="flex flex-wrap items-center gap-2 no-print">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Periksa domain lain…"
              aria-label="Periksa URL website lain"
              className="w-full pl-8 pr-3 py-2 text-xs font-mono text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] whitespace-nowrap"
          >
            Express Scan
          </button>
          {report.coverage.mode === 'express' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onScanUrl(quickUrl.trim() || report.network.finalUrl, 'deep')}
              className="px-3.5 py-2 text-xs font-semibold text-[#D97706] bg-[#FFFBEB] dark:bg-[#78350F]/30 border border-[#D97706]/30 rounded-lg hover:bg-[#FEF3C7] whitespace-nowrap"
            >
              Deep Crawl
            </button>
          )}
        </form>
      </section>

      {/* Visual Score Dashboard: Gauge + 6-Axis Radar + 6 Pillars */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-5 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 flex flex-col sm:flex-row xl:flex-col items-center justify-around gap-4">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="8"
                  className="stroke-[#F1F5F9] dark:stroke-[#1E293B]"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  stroke={overallColor.stroke}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                  {sim.overallSimulated}
                </span>
                <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                  / 100
                </span>
              </div>
            </div>
            <div className={`mt-2 text-xs font-semibold ${overallColor.text}`}>
              {overallColor.label}
            </div>
            <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              Live: {report.overallScore}
              {overallDelta > 0 && <span className="text-[#16A34A]"> (+{overallDelta} sim)</span>}
            </div>
          </div>

          <ScoreRadarChart live={liveMap} simulated={simMap} />
        </div>

        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-4">
          {ALL_AUDIT_CATEGORIES.map((cat) => {
            const liveScore = report.categories[cat]?.score ?? 0;
            const proj = sim.categories[cat];
            const delta = proj.score - liveScore;
            const status = getScoreColor(proj.score);

            return (
              <div
                key={cat}
                className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {CATEGORY_LABELS[cat]}
                    </div>
                    <div className={`mt-0.5 text-xs font-medium ${status.text}`}>
                      {status.label}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-none">
                      {proj.score}
                    </div>
                    <div className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {delta > 0 ? (
                        <span className="text-[#16A34A] font-medium">
                          {liveScore} → {proj.score}
                        </span>
                      ) : (
                        <span>dari 100</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative h-2 w-full bg-[#F1F5F9] dark:bg-[#1E293B] rounded-full overflow-hidden">
                    {delta > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-[#2563EB]/35 transition-all duration-200"
                        style={{ width: `${proj.score}%` }}
                      />
                    )}
                    <div
                      className={`relative h-full ${status.bg} transition-all duration-200`}
                      style={{ width: `${liveScore}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <span className="font-mono tabular-nums">
                      {proj.criticalCount} prioritas · {proj.warningCount} optimasi
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateSection(cat)}
                      className="inline-flex items-center gap-1 font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline no-print"
                    >
                      <span>Detail</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Module Launchers: PWA, AI/Tech, Theme, SERP Simulator */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateSection('pwa')}
          className="text-left bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 space-y-2 hover:border-[#2563EB]/60 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>PWA &amp; Installability</span>
            </span>
            <span className="font-mono tabular-nums">{report.pwa.installabilityScore}/100</span>
          </div>
          <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {report.pwa.installableReady ? 'Siap Diinstal Browser' : 'Belum Memenuhi Syarat Penuh'}
          </div>
          <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            SW: {report.pwa.serviceWorkerDetected ? 'Aktif' : 'Tidak ada'} · Manifest:{' '}
            {report.pwa.manifest?.found ? 'Valid' : 'Tidak'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('ai_origin')}
          className="text-left bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 space-y-2 hover:border-[#2563EB]/60 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Asal Desain &amp; Tema</span>
            </span>
            <span className="font-mono tabular-nums">
              {report.aiTemplateAnalysis.customAuthenticityScore ?? 80}%
            </span>
          </div>
          <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {report.aiTemplateAnalysis.verdictLabel}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5 truncate">
            {report.themeSupport.posture === 'dual' ? (
              <Sun className="w-3 h-3 shrink-0" />
            ) : (
              <Moon className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate">{report.themeSupport.label}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('serp_social')}
          className="text-left bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 space-y-2 hover:border-[#2563EB]/60 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>Simulator SERP &amp; Sosial</span>
            </span>
            <span>Uji Live →</span>
          </div>
          <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {report.dom.title || '(Tag <title> belum diisi)'}
          </div>
          <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            OG Card: {report.dom.hasOgTags ? 'Lengkap' : 'Belum lengkap'} · Twitter:{' '}
            {report.dom.hasTwitterCard ? 'Ada' : 'Belum'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('dns_infra')}
          className="text-left bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-4 space-y-2 hover:border-[#2563EB]/60 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA]">
            <span className="inline-flex items-center gap-1.5">
              <Server className="w-4 h-4" />
              <span>DNS &amp; Tech Stack</span>
            </span>
            <span className="font-mono tabular-nums">{report.techStack.length} stack</span>
          </div>
          <div className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {report.techStack.slice(0, 3).map((t) => t.name).join(', ') || 'Stack Tersembunyi'}
          </div>
          <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            SPF {report.dns.spf ? '✓' : '✗'} · DMARC {report.dns.dmarc ? '✓' : '✗'} · CAA{' '}
            {report.dns.caa?.length ? '✓' : '✗'}
          </div>
        </button>
      </section>

      {/* Network, Asset Payload & TLS Telemetry Strip */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Telemetri Jaringan, Payload Aset &amp; Infrastruktur
          </h2>
          <button
            type="button"
            onClick={() => onNavigateSection('links_assets')}
            className="text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 no-print"
          >
            <span>Lihat Tautan &amp; Payload</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] dark:divide-[#1E293B] overflow-hidden">
          <div className="p-4">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">TTFB Server</div>
            <div className="mt-1 font-mono text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {report.network.ttfbMs} ms
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">HTML + Sampel Aset</div>
            <div className="mt-1 font-mono text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {report.assetBreakdown.sampledAssetKb} KB
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Protokol TLS</div>
            <div className="mt-1 font-mono text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              {report.tls.protocol || 'HTTP'}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">SSL Sisa Hari</div>
            <div className="mt-1 font-mono text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {report.tls.daysRemaining !== null ? `${report.tls.daysRemaining} hr` : '-'}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Tech Stack</div>
            <div className="mt-1 font-mono text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{report.techStack.length} terdeteksi</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">Tautan Diuji</div>
            <div className="mt-1 font-mono text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {report.linkAudit.filter((l) => l.ok).length}/{report.linkAudit.length} OK
            </div>
          </div>
        </div>
      </section>

      {/* Prioritized Action Table */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Prioritas Perbaikan &amp; Simulasi Dampak ({prioritizedIssues.length})
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Centang item perbaikan di bawah untuk melihat proyeksi kenaikan skor secara instan.
          </p>
        </div>

        {prioritizedIssues.length === 0 ? (
          <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-8 text-center bg-[#F8FAFC] dark:bg-[#0F172A]">
            <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Seluruh Pengujian Berstatus Optimal
            </div>
          </div>
        ) : (
          <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden bg-[#FFFFFF] dark:bg-[#0F172A]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1120] text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    <th className="py-2.5 px-4 w-10">
                      <span className="sr-only">Simulasi</span>
                    </th>
                    <th className="py-2.5 px-3 w-36">Tingkat</th>
                    <th className="py-2.5 px-3 w-36">Kategori</th>
                    <th className="py-2.5 px-3">Temuan</th>
                    <th className="py-2.5 px-4 text-right w-24">Bobot</th>
                    <th className="py-2.5 px-4 text-right w-24 no-print">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-sm">
                  {prioritizedIssues.map((finding) => {
                    const isSimulated = simulatedFixedIds.has(finding.id);
                    return (
                      <tr
                        key={finding.id}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors"
                      >
                        <td className="py-3 px-4 align-top">
                          <input
                            type="checkbox"
                            checked={isSimulated}
                            onChange={() => onToggleSimulateFix(finding.id)}
                            aria-label={`Simulasikan perbaikan ${finding.title}`}
                            className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] dark:border-[#475569] text-[#2563EB] cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 align-top">
                          <SeverityLabel finding={finding} simulated={isSimulated} />
                        </td>
                        <td className="py-3 px-3 align-top text-xs font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
                          {CATEGORY_LABELS[finding.category]}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div
                            className={`font-medium ${
                              isSimulated
                                ? 'line-through text-[#64748B] dark:text-[#64748B]'
                                : 'text-[#0F172A] dark:text-[#F8FAFC]'
                            }`}
                          >
                            {finding.title}
                          </div>
                          <div className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                            {finding.summary}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top text-right font-mono text-xs text-[#475569] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                          +{finding.impactWeight} poin
                        </td>
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap no-print">
                          <button
                            type="button"
                            onClick={() => onNavigateSection(finding.category)}
                            className="text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                          >
                            Solusi
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// FindingsChecklist — Daftar temuan per pilar dengan filter, bukti & kode solusi
// ============================================================================

interface FindingsChecklistProps {
  category: AuditCategory;
  report: AuditReport;
  simulatedFixedIds: Set<string>;
  onToggleSimulateFix: (id: string) => void;
  onCopied?: (msg: string) => void;
}

type FilterMode = 'all' | Severity;

export function FindingsChecklist({
  category,
  report,
  simulatedFixedIds,
  onToggleSimulateFix,
  onCopied,
}: FindingsChecklistProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    report.findings
      .filter((f) => f.category === category && !f.passed)
      .slice(0, 2)
      .forEach((f) => initial.add(f.id));
    return initial;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sim = computeSimulatedReport(report, simulatedFixedIds);
  const liveScore = report.categories[category]?.score ?? 100;
  const simCat = sim.categories[category];
  const delta = simCat.score - liveScore;

  const categoryFindings = report.findings.filter((f) => f.category === category);
  const filteredFindings = categoryFindings.filter((f) => {
    if (filter !== 'all') {
      if (filter === 'pass' && !f.passed) return false;
      if (filter !== 'pass' && (f.passed || f.severity !== filter)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.evidence.toLowerCase().includes(q) ||
        f.recommendation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopySnippet = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      onCopied?.('Potongan kode perbaikan berhasil disalin');
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const filterButtons: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'critical', label: SEVERITY_LABELS.critical },
    { id: 'warning', label: SEVERITY_LABELS.warning },
    { id: 'info', label: SEVERITY_LABELS.info },
    { id: 'pass', label: SEVERITY_LABELS.pass },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Pilar Pemeriksaan · {CATEGORY_LABELS[category]}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Checklist &amp; Rekomendasi {CATEGORY_LABELS[category]}
          </h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] font-mono tabular-nums">
            Live Score:{' '}
            <span className="text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
              {liveScore}/100
            </span>
            {' · '}
            Simulasi:{' '}
            <span className="text-[#2563EB] dark:text-[#60A5FA] font-semibold">
              {simCat.score}/100
            </span>
            {delta > 0 && <span className="text-[#16A34A] font-semibold"> (+{delta} poin)</span>}
            {' · '}
            {categoryFindings.filter((f) => !f.passed).length} item perlu tindakan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari temuan…"
              aria-label="Cari temuan audit"
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] rounded-lg focus:outline-none focus:border-[#2563EB] w-44"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === btn.id
                    ? 'bg-[#FFFFFF] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155]'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-transparent'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredFindings.length === 0 ? (
        <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-8 text-center bg-[#F8FAFC] dark:bg-[#0F172A]">
          <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Tidak ada temuan yang sesuai dengan filter
          </div>
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-[#2563EB] bg-[#FFFFFF] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg"
          >
            Tampilkan Semua
          </button>
        </div>
      ) : (
        <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl divide-y divide-[#E2E8F0] dark:divide-[#1E293B] bg-[#FFFFFF] dark:bg-[#0F172A]">
          {filteredFindings.map((finding: AuditFinding) => {
            const isSimulated = simulatedFixedIds.has(finding.id);
            const isExpanded = expandedIds.has(finding.id);

            return (
              <div key={finding.id} className="transition-colors">
                <div className="p-4 sm:px-5 flex items-start gap-3.5">
                  <div className="pt-0.5 shrink-0">
                    {finding.passed ? (
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center bg-[#16A34A]/15 text-[#16A34A]"
                        title="Optimal di server live"
                      >
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <input
                        type="checkbox"
                        checked={isSimulated}
                        onChange={() => onToggleSimulateFix(finding.id)}
                        aria-label={`Simulasikan perbaikan ${finding.title}`}
                        className="h-4 w-4 rounded border-[#CBD5E1] dark:border-[#475569] text-[#2563EB] cursor-pointer"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(finding.id)}
                        className="text-left flex items-center gap-2 group"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            isSimulated && !finding.passed
                              ? 'line-through text-[#64748B]'
                              : 'text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB]'
                          }`}
                        >
                          {finding.title}
                        </span>
                      </button>

                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <SeverityLabel finding={finding} simulated={isSimulated} />
                        <span className="text-[#CBD5E1] dark:text-[#475569]" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                          Bobot {finding.impactWeight} poin
                        </span>
                      </div>
                    </div>

                    <p className="mt-1.5 pl-6 text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                      {finding.summary}
                    </p>

                    {isExpanded && (
                      <div className="mt-4 ml-6 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-4">
                        <div>
                          <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                            Bukti Aktual dari Server
                          </div>
                          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-xs text-[#334155] dark:text-[#CBD5E1] break-all">
                            {finding.evidence}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                            Langkah Perbaikan
                          </div>
                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                            {finding.recommendation}
                          </p>
                        </div>

                        {finding.codeSnippet && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                                Contoh Implementasi ({finding.codeLanguage || 'kode'})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(finding.id, finding.codeSnippet!)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md no-print"
                              >
                                {copiedId === finding.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-[#16A34A]" />
                                    <span className="text-[#16A34A]">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Salin Kode</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-3.5 rounded-lg bg-[#0F172A] dark:bg-[#020617] text-[#F8FAFC] border border-[#1E293B] font-mono text-xs overflow-x-auto leading-relaxed">
                              <code>{finding.codeSnippet}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

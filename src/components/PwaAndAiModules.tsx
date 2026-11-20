import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileJson,
  Layers,
  Moon,
  Smartphone,
  Sparkles,
  Sun,
  Wifi,
  XCircle,
} from 'lucide-react';
import type { AuditReport } from '../types/audit';
import { FindingsChecklist } from './ReportDashboard';

interface ModuleChecklistProps {
  report: AuditReport;
  simulatedFixedIds: Set<string>;
  onToggleSimulateFix: (id: string) => void;
  onCopied?: (msg: string) => void;
}

function StatusItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4">
      <div className="space-y-0.5 min-w-0">
        <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{label}</div>
        <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] break-all">{detail}</div>
      </div>
      <div className="shrink-0 pt-0.5">
        {ok ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terpenuhi</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#D97706]">
            <XCircle className="w-3.5 h-3.5" />
            <span>Belum</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PwaAuditSection — Evaluasi Manifest JSON, Service Worker & Kepatuhan Ikon
// ============================================================================

export function PwaAuditSection({
  report,
  simulatedFixedIds,
  onToggleSimulateFix,
  onCopied,
}: ModuleChecklistProps) {
  const { pwa } = report;
  const manifest = pwa.manifest;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (pwa.installabilityScore / 100) * circumference;
  const scoreStroke =
    pwa.installabilityScore >= 90
      ? '#16A34A'
      : pwa.installabilityScore >= 70
        ? '#D97706'
        : '#DC2626';

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Modul Diagnostik PWA · {report.network.finalUrl}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Progressive Web App (PWA) &amp; Kesiapan Instalasi
        </h1>
        <p className="mt-1 text-xs text-[#475569] dark:text-[#94A3B8]">
          Evaluasi Web App Manifest, registrasi Service Worker, kepatuhan ikon Android/iOS, serta
          syarat instalasi browser modern.
        </p>
      </div>

      {/* Installability Overview Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                strokeWidth="7"
                className="stroke-[#F1F5F9] dark:stroke-[#1E293B]"
              />
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                stroke={scoreStroke}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-200"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {pwa.installabilityScore}
              </span>
              <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8]">/ 100</span>
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Status Installability
            </div>
            <div className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {pwa.installableReady ? 'Siap Diinstal (PWA Ready)' : 'Belum Memenuhi Kriteria Penuh'}
            </div>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              {pwa.installableReady
                ? 'Situs memiliki HTTPS, manifest valid, ikon 192px, dan Service Worker aktif.'
                : 'Lengkapi manifest JSON, ikon 192/512px, serta Service Worker agar browser dapat menawarkan instalasi.'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              <FileJson className="w-4 h-4 text-[#2563EB]" />
              <span>Web App Manifest</span>
            </div>
            <div className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {manifest.found ? 'Manifest JSON Valid' : 'Tidak Ditemukan'}
            </div>
            <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
              {manifest.url ? `HTTP ${manifest.status ?? '-'}` : 'Tag <link rel="manifest"> kosong'}
            </div>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              <Wifi className="w-4 h-4 text-[#2563EB]" />
              <span>Service Worker</span>
            </div>
            <div className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {pwa.serviceWorkerDetected ? 'Terdeteksi Aktif' : 'Belum Terdaftar'}
            </div>
            <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
              {pwa.serviceWorkerEvidence}
            </div>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              <Smartphone className="w-4 h-4 text-[#2563EB]" />
              <span>Kepatuhan Ikon</span>
            </div>
            <div className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {manifest.hasIcon192 && manifest.hasIcon512 ? '192 & 512px Ada' : 'Belum Lengkap'}
            </div>
            <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
              Maskable Terpisah: {manifest.hasSeparateMaskable ? 'Ya' : 'Tidak'} · Apple Icon:{' '}
              {pwa.hasAppleTouchIcon ? 'Ada' : 'Tidak'}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Manifest + Icons Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Rincian Properti Manifest &amp; Kepatuhan Ikon
          </div>
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
            <StatusItem
              label="Nama & Short Name (Maks 12 Karakter)"
              ok={Boolean(manifest.name) && manifest.shortNameLengthOk}
              detail={`name: ${manifest.name || '-'} · short_name: ${manifest.shortName || '-'} (${manifest.shortName?.length || 0} kar)`}
            />
            <StatusItem
              label="ID Unik & Start URL"
              ok={manifest.hasId && Boolean(manifest.startUrl)}
              detail={`has id: ${manifest.hasId ? 'Ya' : 'Tidak'} · start_url: ${manifest.startUrl || '-'} · scope: ${manifest.scope || '-'}`}
            />
            <StatusItem
              label="Mode Tampilan (Display Mode)"
              ok={manifest.display === 'standalone' || manifest.display === 'fullscreen'}
              detail={`display: ${manifest.display || '-'} · theme_color: ${manifest.themeColor || pwa.themeColor || '-'}`}
            />
            <StatusItem
              label="Ikon 192px, 512px & Maskable Terpisah"
              ok={manifest.hasIcon192 && manifest.hasIcon512 && manifest.hasSeparateMaskable}
              detail={`192x192: ${manifest.hasIcon192 ? 'Ya' : 'Tidak'} · 512x512: ${manifest.hasIcon512 ? 'Ya' : 'Tidak'} · Any vs Maskable terpisah: ${manifest.hasSeparateMaskable ? 'Ya' : 'Tidak'}`}
            />
            <StatusItem
              label="Apple Touch Icon & Favicon"
              ok={pwa.hasFavicon && pwa.hasAppleTouchIcon}
              detail={`Favicon: ${pwa.hasFavicon ? 'Ada' : 'Tidak'} · apple-touch-icon: ${pwa.hasAppleTouchIcon ? 'Ada' : 'Tidak'}`}
            />
          </div>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0B1120] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Isi Berkas Manifest JSON
            </span>
            {manifest.url && (
              <span className="font-mono text-[#64748B] dark:text-[#94A3B8] truncate max-w-xs">
                {manifest.url}
              </span>
            )}
          </div>
          {manifest.rawJsonPreview ? (
            <pre className="p-4 bg-[#0F172A] dark:bg-[#020617] text-[#F8FAFC] font-mono text-xs overflow-x-auto flex-1 leading-relaxed">
              <code>{manifest.rawJsonPreview}</code>
            </pre>
          ) : (
            <div className="p-6 text-xs text-[#64748B] dark:text-[#94A3B8] flex-1">
              Target website belum menyediakan file manifest JSON yang valid. Anda dapat menyalin
              contoh struktur manifest dari checklist perbaikan di bawah ini.
            </div>
          )}
        </div>
      </section>

      <FindingsChecklist
        category="pwa"
        report={report}
        simulatedFixedIds={simulatedFixedIds}
        onToggleSimulateFix={onToggleSimulateFix}
        onCopied={onCopied}
      />
    </div>
  );
}

// ============================================================================
// AiTechSection — Deteksi Pola AI, Template, Postur Tema & Tech Stack
// ============================================================================

export function AiTechSection({
  report,
  simulatedFixedIds,
  onToggleSimulateFix,
  onCopied,
}: ModuleChecklistProps) {
  const [showSupportedMatrix, setShowSupportedMatrix] = useState(false);
  const { aiTemplateAnalysis, themeSupport, techStack, supportedDetections } = report;

  const authScore = aiTemplateAnalysis.customAuthenticityScore;
  const authBarColor =
    authScore >= 80 ? 'bg-[#16A34A]' : authScore >= 55 ? 'bg-[#2563EB]' : 'bg-[#D97706]';

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Modul Arsitektur &amp; Orisinalitas · {report.network.finalUrl}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
          Deteksi Pola AI, Template, Tema &amp; Tech Stack
        </h1>
        <p className="mt-1 text-xs text-[#475569] dark:text-[#94A3B8]">
          Inspeksi sinyal scaffolding AI, builder template, dukungan Light/Dark Mode, framework,
          payment gateway, dan panel autentikasi publik.
        </p>
      </div>

      {/* AI Authenticity Meter + Theme Posture */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Analisis Pola AI &amp; Orisinalitas Desain
              </h2>
            </div>
            <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
              {aiTemplateAnalysis.confidenceLabel}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                {aiTemplateAnalysis.verdictLabel}
              </span>
              <span className="font-mono text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
                {authScore}/100 Orisinalitas
              </span>
            </div>
            <div className="h-2 w-full bg-[#F1F5F9] dark:bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className={`h-full ${authBarColor} transition-all duration-200`}
                style={{ width: `${authScore}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            {aiTemplateAnalysis.summary}
          </p>

          {aiTemplateAnalysis.signals.length > 0 ? (
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
              <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Sinyal Teramati di DOM &amp; CSS:
              </div>
              <ul className="space-y-1.5">
                {aiTemplateAnalysis.signals.map((sig, idx) => (
                  <li key={idx} className="text-xs flex items-start justify-between gap-3">
                    <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">
                      {sig.label}
                    </span>
                    <span className="font-mono text-[#64748B] dark:text-[#94A3B8] text-right">
                      {sig.evidence}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] text-xs text-[#16A34A]">
              Tidak ada pola scaffolding AI generik atau teks placeholder bawaan yang terdeteksi.
            </div>
          )}

          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] italic">
            {aiTemplateAnalysis.disclaimer}
          </p>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {themeSupport.posture === 'dual' ? (
                <Sun className="w-4 h-4 text-[#2563EB]" />
              ) : (
                <Moon className="w-4 h-4 text-[#475569] dark:text-[#94A3B8]" />
              )}
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Pemeriksaan Postur Tema (Light &amp; Dark Mode)
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-[#2563EB] dark:text-[#60A5FA]">
              {themeSupport.posture === 'dual' ? 'Dual Mode' : themeSupport.posture}
            </span>
          </div>

          <div className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            {themeSupport.label}
          </div>

          <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
            {themeSupport.details}
          </p>

          <dl className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
            <div className="py-2 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">
                Media Query prefers-color-scheme
              </dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {themeSupport.hasPrefersColorScheme ? 'Didukung' : 'Tidak terdeteksi'}
              </dd>
            </div>
            <div className="py-2 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">Class .dark / Atribut Tema</dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {themeSupport.hasDarkClassOrAttr ? 'Terdeteksi' : 'Tidak terdeteksi'}
              </dd>
            </div>
            <div className="py-2 flex justify-between gap-4">
              <dt className="text-[#64748B] dark:text-[#94A3B8]">
                Meta &lt;meta name=&quot;color-scheme&quot;&gt;
              </dt>
              <dd className="font-mono font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {themeSupport.colorSchemeMeta || 'Belum diatur'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Tech Stack, Payment Gateways & Admin Detection */}
      <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Tech Stack, Payment Gateway &amp; Ekosistem Terdeteksi ({techStack.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowSupportedMatrix((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline no-print"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cakupan Deteksi Terdukung</span>
            {showSupportedMatrix ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {techStack.length === 0 ? (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Tidak ditemukan signature framework, CMS, atau payment gateway publik pada header/HTML
            yang dikirimkan server.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {techStack.map((item) => (
              <div
                key={item.name}
                className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {item.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#2563EB] dark:text-[#60A5FA]">
                    {item.category}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8] truncate">
                  {item.evidence}
                </div>
              </div>
            ))}
          </div>
        )}

        {showSupportedMatrix && (
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              <strong>Transparansi Mesin Deteksi:</strong> Massbim Lens hanya melaporkan teknologi
              yang memiliki bukti nyata pada HTTP header, cookie, skrip, atau DOM HTML.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {supportedDetections.map((group) => (
                <div key={group.category} className="text-xs space-y-1">
                  <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {group.category}
                  </div>
                  <div className="text-[#64748B] dark:text-[#94A3B8]">
                    {group.signatures.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <FindingsChecklist
        category="ai_origin"
        report={report}
        simulatedFixedIds={simulatedFixedIds}
        onToggleSimulateFix={onToggleSimulateFix}
        onCopied={onCopied}
      />
    </div>
  );
}

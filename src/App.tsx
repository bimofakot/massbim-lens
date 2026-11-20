import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import {
  DeepScanConsentModal,
  Footer,
  Sidebar,
  ToastContainer,
  TopBar,
  type AppView,
  type NavSection,
  type ToastMessage,
} from './components/LayoutChrome';
import { AiTechSection, PwaAuditSection } from './components/PwaAndAiModules';
import { FindingsChecklist, OverviewSection } from './components/ReportDashboard';
import { CompareView, ScanProgressStepper, ScannerHub } from './components/ScannerAndCompare';
import { SerpSocialSimulator } from './components/SerpSocialSimulator';
import { DnsServerSection, InfraLinksSection, RawInspector } from './components/TechnicalInspectors';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type { AuditCategory, AuditReport, ScanMode, SupportedDetectionCategory } from './types/audit';
import {
  ALL_AUDIT_CATEGORIES,
  buildMarkdownExport,
  computeSimulatedReport,
} from './utils/scoreSimulation';

// Kunci localStorage lokal untuk menjaga privasi (tanpa akun/database server)
const STORAGE_SIM_KEY = 'massbim_lens_simulated_fixes_v1';
const STORAGE_HISTORY_KEY = 'massbim_lens_history_v1';
const STORAGE_THEME_KEY = 'massbim_lens_theme_v1';
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').replace(/\/+$/, '');

function readStoredFixes(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_SIM_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function readStoredHistory(): AuditReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as AuditReport[]) : [];
  } catch {
    return [];
  }
}

function readInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignore storage error
  }
  return false;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeView, setActiveView] = useState<AppView>('hub');
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [history, setHistory] = useState<AuditReport[]>(readStoredHistory);
  const [supportedDetections, setSupportedDetections] = useState<SupportedDetectionCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanningTargetLabel, setScanningTargetLabel] = useState<string>('');
  const [activeScanMode, setActiveScanMode] = useState<ScanMode>('express');
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(readInitialDark);
  const [pendingDeepTarget, setPendingDeepTarget] = useState<string | null>(null);
  const [compareSeedReport, setCompareSeedReport] = useState<AuditReport | null>(null);
  const [fixesByUrl, setFixesByUrl] = useState<Record<string, string[]>>(readStoredFixes);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, tone: 'success' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  // Sinkronkan preferensi tema ke class .dark pada <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [darkMode]);

  // Ambil daftar signature teknologi resmi yang didukung backend
  useEffect(() => {
    fetch(`${API_BASE}/api/capabilities`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.supportedDetections)) {
          setSupportedDetections(d.supportedDetections);
        }
      })
      .catch(() => {
        // Non-fatal: daftar cakupan tetap aman jika API belum merespons
      });
  }, []);

  const persistHistory = useCallback((newReport: AuditReport) => {
    setHistory((prev) => {
      const next = [newReport, ...prev].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(next));
      } catch {
        try {
          localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(next.slice(0, 6)));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }, []);

  const executeScan = useCallback(
    async (urlToScan: string, mode: ScanMode, consent = false): Promise<AuditReport | null> => {
      setLoading(true);
      setActiveScanMode(mode);
      setScanningTargetLabel(urlToScan);
      setError(null);
      setActiveView('report');
      setActiveSection('overview');
      try {
        const res = await fetch(
          `${API_BASE}/api/audit?url=${encodeURIComponent(urlToScan)}&mode=${mode}&consent=${consent}`,
        );
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || `HTTP ${res.status} saat memindai ${urlToScan}`);
        }
        const data = payload as AuditReport;
        setReport(data);
        persistHistory(data);
        addToast(`Audit ${data.network.finalUrl} selesai`);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menghubungi server diagnostik.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [persistHistory, addToast],
  );

  const handleSelfAudit = useCallback(async () => {
    setLoading(true);
    setActiveScanMode('express');
    setScanningTargetLabel('Massbim Lens (Self-Audit)');
    setError(null);
    setActiveView('report');
    setActiveSection('overview');
    try {
      const res = await fetch(`${API_BASE}/api/self-audit`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status} saat menjalankan self-audit.`);
      }
      const data = payload as AuditReport;
      setReport(data);
      persistHistory(data);
      addToast('Self-Audit Massbim Lens selesai');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menjalankan Self-Audit.');
    } finally {
      setLoading(false);
    }
  }, [persistHistory, addToast]);

  const handleRequestScan = (url: string, mode: ScanMode) => {
    if (mode === 'deep') {
      setPendingDeepTarget(url);
      return;
    }
    executeScan(url, 'express', false);
  };

  const handleScanForCompare = async (url: string): Promise<AuditReport | null> => {
    const res = await fetch(`${API_BASE}/api/audit?url=${encodeURIComponent(url)}&mode=express&consent=false`);
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || `HTTP ${res.status} saat memindai ${url}`);
    }
    const data = payload as AuditReport;
    persistHistory(data);
    addToast(`Data pembanding ${data.network.finalUrl} siap`);
    return data;
  };

  const storageKey = report?.network.finalUrl || '';
  const simulatedFixedIds = useMemo(
    () => new Set(storageKey ? fixesByUrl[storageKey] || [] : []),
    [fixesByUrl, storageKey],
  );

  const simulatedData = useMemo(() => {
    if (!report) return null;
    return computeSimulatedReport(report, simulatedFixedIds);
  }, [report, simulatedFixedIds]);

  const simulatedScoresMap = useMemo(() => {
    if (!simulatedData) return null;
    return ALL_AUDIT_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = simulatedData.categories[cat]?.score ?? 0;
      return acc;
    }, {} as Record<AuditCategory, number>);
  }, [simulatedData]);

  const handleToggleSimulateFix = (findingId: string) => {
    if (!storageKey) return;
    setFixesByUrl((prev) => {
      const current = new Set(prev[storageKey] || []);
      if (current.has(findingId)) current.delete(findingId);
      else current.add(findingId);
      const next = { ...prev, [storageKey]: Array.from(current) };
      try {
        localStorage.setItem(STORAGE_SIM_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleResetSimulation = () => {
    if (!storageKey) return;
    setFixesByUrl((prev) => {
      const next = { ...prev, [storageKey]: [] };
      try {
        localStorage.setItem(STORAGE_SIM_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    addToast('Simulasi checklist direset ke kondisi live', 'info');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    addToast('Item dihapus dari riwayat browser', 'info');
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    const md = buildMarkdownExport(report, simulatedFixedIds);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const host = report.network.finalUrl.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]/gi, '_');
    a.href = url;
    a.download = `massbim-lens-${host}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Laporan Markdown (.md) berhasil diunduh');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F1F5F9]">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        report={report}
        loading={loading}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onRescan={() =>
          report && handleRequestScan(report.network.requestedUrl, report.coverage.mode)
        }
        onExportMarkdown={handleExportMarkdown}
        onPrintPdf={() => window.print()}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        showSidebarTrigger={activeView === 'report' && Boolean(report)}
        onAppInstalled={() => addToast('Massbim Lens berhasil diinstal sebagai aplikasi')}
      />

      {!isOnline && (
        <div className="bg-[#FFFBEB] dark:bg-[#78350F]/40 border-b border-[#D97706]/30 px-4 py-2 text-xs text-[#92400E] dark:text-[#FDE68A] flex items-center justify-center gap-2 no-print">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Anda sedang offline. Riwayat laporan yang tersimpan tetap dapat dibuka, namun pemindaian live membutuhkan koneksi internet.
          </span>
        </div>
      )}

      <DeepScanConsentModal
        isOpen={Boolean(pendingDeepTarget)}
        targetUrl={pendingDeepTarget || ''}
        onCancel={() => setPendingDeepTarget(null)}
        onConfirm={() => {
          const target = pendingDeepTarget;
          setPendingDeepTarget(null);
          if (target) executeScan(target, 'deep', true);
        }}
      />

      {activeView === 'hub' && (
        <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto">
          <ScannerHub
            history={history}
            supportedDetections={supportedDetections}
            loading={loading}
            onStartScan={handleRequestScan}
            onSelfAudit={handleSelfAudit}
            onOpenReport={(saved) => {
              setReport(saved);
              setError(null);
              setActiveView('report');
              setActiveSection('overview');
            }}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onOpenCompareWith={(saved) => {
              setCompareSeedReport(saved);
              setActiveView('compare');
            }}
          />
        </main>
      )}

      {activeView === 'compare' && (
        <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto">
          <CompareView
            history={history}
            initialReportA={compareSeedReport || report}
            onScanForCompare={handleScanForCompare}
          />
        </main>
      )}

      {activeView === 'report' && (
        <div className="flex-1 flex">
          {report && simulatedScoresMap && (
            <Sidebar
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              report={report}
              simulatedScores={simulatedScoresMap}
              fixedCount={simulatedData?.fixedCount ?? 0}
              onResetSimulation={handleResetSimulation}
              onSwitchTarget={() => setActiveView('hub')}
              isOpenMobile={mobileMenuOpen}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          )}

          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl w-full mx-auto min-w-0">
            {loading ? (
              <ScanProgressStepper mode={activeScanMode} targetLabel={scanningTargetLabel} />
            ) : error && !report ? (
              <div className="border border-[#DC2626]/30 bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#DC2626]">
                  <AlertCircle className="w-4 h-4" />
                  <span>Pemindaian Gagal</span>
                </div>
                <p className="text-xs font-mono text-[#7F1D1D] dark:text-[#FCA5A5]">{error}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('hub')}
                    className="px-3 py-1.5 text-xs font-medium bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg"
                  >
                    Kembali ke Scanner
                  </button>
                </div>
              </div>
            ) : report ? (
              <motion.div
                key={`${report.id}-${activeSection}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {error && (
                  <div className="mb-6 border border-[#D97706]/30 bg-[#FFFBEB] dark:bg-[#78350F]/20 rounded-lg px-4 py-3 flex items-center justify-between gap-4 text-xs text-[#92400E] dark:text-[#FDE68A]">
                    <span>Pemindaian ulang gagal: {error}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleRequestScan(report.network.requestedUrl, report.coverage.mode)
                      }
                      className="inline-flex items-center gap-1 font-semibold underline whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Coba lagi</span>
                    </button>
                  </div>
                )}

                {activeSection === 'overview' && (
                  <OverviewSection
                    report={report}
                    simulatedFixedIds={simulatedFixedIds}
                    onToggleSimulateFix={handleToggleSimulateFix}
                    onNavigateSection={setActiveSection}
                    onScanUrl={handleRequestScan}
                    loading={loading}
                  />
                )}

                {(activeSection === 'performance' ||
                  activeSection === 'accessibility' ||
                  activeSection === 'seo' ||
                  activeSection === 'security') && (
                  <FindingsChecklist
                    key={`${report.id}-${activeSection}`}
                    category={activeSection}
                    report={report}
                    simulatedFixedIds={simulatedFixedIds}
                    onToggleSimulateFix={handleToggleSimulateFix}
                    onCopied={(msg) => addToast(msg)}
                  />
                )}

                {activeSection === 'pwa' && (
                  <PwaAuditSection
                    report={report}
                    simulatedFixedIds={simulatedFixedIds}
                    onToggleSimulateFix={handleToggleSimulateFix}
                    onCopied={(msg) => addToast(msg)}
                  />
                )}

                {activeSection === 'ai_origin' && (
                  <AiTechSection
                    report={report}
                    simulatedFixedIds={simulatedFixedIds}
                    onToggleSimulateFix={handleToggleSimulateFix}
                    onCopied={(msg) => addToast(msg)}
                  />
                )}

                {activeSection === 'serp_social' && (
                  <SerpSocialSimulator
                    key={`serp-${report.id}`}
                    report={report}
                    onNotify={(msg) => addToast(msg)}
                  />
                )}

                {activeSection === 'dns_infra' && (
                  <DnsServerSection report={report} onNotify={(msg) => addToast(msg)} />
                )}

                {activeSection === 'links_assets' && <InfraLinksSection report={report} />}

                {activeSection === 'inspector' && <RawInspector report={report} />}
              </motion.div>
            ) : null}
          </main>
        </div>
      )}

      <ToastContainer toasts={toasts} />
      <Footer />
    </div>
  );
}

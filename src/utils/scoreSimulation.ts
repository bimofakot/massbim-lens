import type { AuditCategory, AuditReport, CategoryScore, Severity } from '../types/audit';

// Urutan resmi 6 pilar penilaian Massbim Lens
export const ALL_AUDIT_CATEGORIES: AuditCategory[] = [
  'performance',
  'accessibility',
  'seo',
  'security',
  'pwa',
  'ai_origin',
];

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  performance: 'Performa',
  accessibility: 'Aksesibilitas',
  seo: 'SEO',
  security: 'Keamanan',
  pwa: 'PWA & Installability',
  ai_origin: 'Pola AI & Desain',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Prioritas Tinggi',
  warning: 'Perlu Optimasi',
  info: 'Rekomendasi',
  pass: 'Optimal',
};

// Partial-credit scoring harus identik dengan kalkulasi di server/auditEngine.ts:
// passed = 100%, info = 60%, warning = 30%, critical = 0%
function getEarnedPoints(passed: boolean, severity: string, impactWeight: number): number {
  if (passed) return impactWeight;
  if (severity === 'info') return Math.round(impactWeight * 0.6);
  if (severity === 'warning') return Math.round(impactWeight * 0.3);
  return 0;
}

/**
 * Menghitung proyeksi skor 6 pilar & skor keseluruhan secara real-time
 * berdasarkan daftar temuan yang dicentang oleh pengguna pada simulasi perbaikan.
 */
export function computeSimulatedReport(
  report: AuditReport,
  simulatedFixedIds: Set<string>,
): {
  overallSimulated: number;
  categories: Record<AuditCategory, CategoryScore>;
  fixedCount: number;
  remainingIssuesCount: number;
} {
  const categories = {} as Record<AuditCategory, CategoryScore>;
  let fixedCount = 0;
  let remainingIssuesCount = 0;

  ALL_AUDIT_CATEGORIES.forEach((cat) => {
    const items = report.findings.filter((f) => f.category === cat);
    const maxPoints = items.reduce((sum, item) => sum + item.impactWeight, 0);
    let earnedPoints = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let passCount = 0;

    for (const item of items) {
      const isEffectivelyPassed = item.passed || simulatedFixedIds.has(item.id);
      if (!item.passed && simulatedFixedIds.has(item.id)) {
        fixedCount += 1;
      }
      earnedPoints += getEarnedPoints(isEffectivelyPassed, item.severity, item.impactWeight);
      if (isEffectivelyPassed) {
        passCount += 1;
      } else {
        remainingIssuesCount += 1;
        if (item.severity === 'critical') criticalCount += 1;
        else if (item.severity === 'warning') warningCount += 1;
        else infoCount += 1;
      }
    }

    const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 100;
    categories[cat] = {
      category: cat,
      label: CATEGORY_LABELS[cat],
      score,
      maxPoints,
      earnedPoints,
      criticalCount,
      warningCount,
      infoCount,
      passCount,
    };
  });

  const totalScore = ALL_AUDIT_CATEGORIES.reduce(
    (sum, cat) => sum + categories[cat].score,
    0,
  );
  const overallSimulated = Math.round(totalScore / ALL_AUDIT_CATEGORIES.length);

  return {
    overallSimulated,
    categories,
    fixedCount,
    remainingIssuesCount,
  };
}

export function buildMarkdownExport(
  report: AuditReport,
  simulatedFixedIds: Set<string>,
): string {
  const sim = computeSimulatedReport(report, simulatedFixedIds);
  const lines: string[] = [
    `# Laporan Diagnostik Massbim Lens: ${report.network.finalUrl}`,
    `Waktu Scan: ${new Date(report.scannedAt).toLocaleString('id-ID')}`,
    `Mode & Cakupan: ${report.coverage.statusLabel} (${report.coverage.pagesScanned} halaman, ${report.coverage.linksChecked} tautan diuji)`,
    `Status HTTP: ${report.network.statusCode} | TTFB: ${report.network.ttfbMs} ms | Ukuran HTML: ${report.assetBreakdown.htmlKb} KB`,
    '',
    '## Ringkasan Skor 6 Pilar (Live vs Simulasi Perbaikan)',
    `- Skor Keseluruhan: **${report.overallScore}/100** -> Simulasi: **${sim.overallSimulated}/100**`,
    ...ALL_AUDIT_CATEGORIES.map(
      (cat) =>
        `- ${CATEGORY_LABELS[cat]}: ${report.categories[cat]?.score ?? 0}/100 -> ${sim.categories[cat]?.score ?? 0}/100`,
    ),
    '',
    '## PWA, Arsitektur, Tema & Asal Desain',
    `- PWA Installability Score: ${report.pwa.installabilityScore}/100 (${report.pwa.installableReady ? 'Siap Instal' : 'Belum Memenuhi Kriteria Penuh'})`,
    `- Service Worker: ${report.pwa.serviceWorkerDetected ? 'Terdeteksi' : 'Belum Terdeteksi'} (${report.pwa.serviceWorkerEvidence})`,
    `- Postur Tema: ${report.themeSupport.label}`,
    `- Indikasi Asal Desain: ${report.aiTemplateAnalysis.verdictLabel} (${report.aiTemplateAnalysis.confidenceLabel})`,
    `- Tech Stack Terdeteksi: ${report.techStack.length > 0 ? report.techStack.map((t) => `${t.name} (${t.category})`).join(', ') : 'Tidak ada signature publik yang terdeteksi'}`,
    '',
    '## Daftar Temuan & Checklist Perbaikan',
  ];

  for (const f of report.findings) {
    const checked = f.passed || simulatedFixedIds.has(f.id) ? 'x' : ' ';
    const statusLabel = f.passed
      ? 'OPTIMAL'
      : simulatedFixedIds.has(f.id)
        ? 'DISIMULASIKAN SELESAI'
        : SEVERITY_LABELS[f.severity].toUpperCase();
    lines.push(`### [${checked}] [${CATEGORY_LABELS[f.category]}] ${f.title} (${statusLabel})`);
    lines.push(`- Ringkasan: ${f.summary}`);
    lines.push(`- Bukti Aktual: \`${f.evidence}\``);
    if (!f.passed) {
      lines.push(`- Rekomendasi: ${f.recommendation}`);
    }
    if (f.codeSnippet) {
      lines.push('```' + (f.codeLanguage || 'text'));
      lines.push(f.codeSnippet);
      lines.push('```');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('Dihasilkan oleh **Massbim Lens** (Open-Source by Massbim — https://github.com/bimofakot/)');

  return lines.join('\n');
}

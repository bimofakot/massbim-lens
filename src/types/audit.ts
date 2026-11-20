export type AuditCategory =
  | 'performance'
  | 'accessibility'
  | 'seo'
  | 'security'
  | 'pwa'
  | 'ai_origin';

export type Severity = 'critical' | 'warning' | 'info' | 'pass';

export type ScanMode = 'express' | 'deep';

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: Severity;
  title: string;
  impactWeight: number;
  passed: boolean;
  summary: string;
  evidence: string;
  recommendation: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface CategoryScore {
  category: AuditCategory;
  label: string;
  score: number;
  maxPoints: number;
  earnedPoints: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passCount: number;
}

export interface TlsInfo {
  protocol: string | null;
  cipher: string | null;
  issuer: string | null;
  subject: string | null;
  subjectAltNames: string[];
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  authorized: boolean;
}

export interface AuxiliaryProbes {
  robotsTxt: { status: number; hasSitemap: boolean; preview: string };
  sitemapXml: { url: string; status: number };
  sitemapIndexXml: { url: string; status: number };
  securityTxt: { status: number };
  staticAssetCache: { url: string | null; cacheControl: string | null; status: number | null };
}

export interface NetworkMetrics {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  ttfbMs: number;
  totalTimeMs: number;
  htmlBytes: number;
  contentEncoding: string | null;
  serverHeader: string | null;
  redirectCount: number;
  httpVersion: string;
}

export interface DomSummary {
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonical: string | null;
  lang: string | null;
  h1Count: number;
  h1Texts: string[];
  headingSequence: string[];
  totalImages: number;
  emptyAltImages: number;
  missingWidthHeightImages: number;
  externalBlankLinks: number;
  externalLinksMissingNoreferrer: number;
  inlineScriptCount: number;
  externalScriptCount: number;
  stylesheetCount: number;
  preloadCount: number;
  hasSkipLink: boolean;
  hasMainLandmark: boolean;
  hasJsonLd: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  generator: string | null;
}

export interface ThemeSupportInfo {
  posture: 'dual' | 'light-only' | 'dark-only' | 'unspecified';
  label: string;
  hasPrefersColorScheme: boolean;
  hasDarkClassOrAttr: boolean;
  colorSchemeMeta: string | null;
  details: string;
}

export interface AiTemplateSignalItem {
  label: string;
  evidence: string;
  weight: 'high' | 'medium' | 'low';
}

export interface AiTemplateAnalysis {
  verdict: 'custom-code' | 'cms-template' | 'ai-assisted-pattern' | 'mixed-signals';
  verdictLabel: string;
  confidenceLabel: string;
  customAuthenticityScore: number;
  summary: string;
  signals: AiTemplateSignalItem[];
  disclaimer: string;
}

export interface TechStackItem {
  name: string;
  category:
    | 'Framework & UI'
    | 'Backend & CMS'
    | 'Payment Gateway'
    | 'Admin & Auth'
    | 'CDN & Hosting'
    | 'Analytics & Ads';
  evidence: string;
}

export interface SupportedDetectionCategory {
  category: string;
  signatures: string[];
}

export interface DnsRecordsInfo {
  a: string[];
  aaaa: string[];
  mx: string[];
  ns: string[];
  caa: string[];
  spf: string | null;
  dmarc: string | null;
  lookupError?: string;
}

export interface CookieAuditItem {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  raw: string;
}

export interface LinkProbeItem {
  url: string;
  type: 'internal' | 'external';
  status: number;
  ok: boolean;
  redirected: boolean;
}

export interface MixedContentItem {
  tag: string;
  attribute: string;
  url: string;
}

export interface PwaManifestInspection {
  found: boolean;
  url: string | null;
  status: number | null;
  name: string | null;
  shortName: string | null;
  shortNameLengthOk: boolean;
  hasId: boolean;
  startUrl: string | null;
  scope: string | null;
  display: string | null;
  themeColor: string | null;
  backgroundColor: string | null;
  hasIcon192: boolean;
  hasIcon512: boolean;
  hasSeparateMaskable: boolean;
  rawJsonPreview: string | null;
}

export interface PwaReadiness {
  viewport: string | null;
  blocksZoom: boolean;
  hasFavicon: boolean;
  hasAppleTouchIcon: boolean;
  manifestUrl: string | null;
  manifestStatus: number | null;
  themeColor: string | null;
  serviceWorkerDetected: boolean;
  serviceWorkerEvidence: string;
  installabilityScore: number;
  installableReady: boolean;
  manifest: PwaManifestInspection;
}

export interface AssetBreakdown {
  htmlKb: number;
  stylesheetsCount: number;
  externalScriptsCount: number;
  imagesCount: number;
  sampledAssetKb: number;
}

export interface DeepCrawlPageItem {
  url: string;
  status: number;
  title: string;
  metaDescLength: number;
  h1Count: number;
  ttfbMs: number;
  duplicateTitle?: boolean;
  error?: string;
}

export interface AdminExposureItem {
  path: string;
  status: number;
  accessible: boolean;
  note: string;
}

export interface ScanCoverage {
  mode: ScanMode;
  complete: boolean;
  statusLabel: string;
  partialReasons: string[];
  pagesScanned: number;
  pagesDiscovered: number;
  linksChecked: number;
  durationMs: number;
}

export interface AuditReport {
  id: string;
  scannedAt: string;
  overallScore: number;
  coverage: ScanCoverage;
  categories: Record<AuditCategory, CategoryScore>;
  findings: AuditFinding[];
  network: NetworkMetrics;
  tls: TlsInfo;
  rawHeaders: Record<string, string>;
  dom: DomSummary;
  probes: AuxiliaryProbes;
  themeSupport: ThemeSupportInfo;
  aiTemplateAnalysis: AiTemplateAnalysis;
  techStack: TechStackItem[];
  supportedDetections: SupportedDetectionCategory[];
  dns: DnsRecordsInfo;
  cookies: CookieAuditItem[];
  linkAudit: LinkProbeItem[];
  mixedContent: MixedContentItem[];
  pwa: PwaReadiness;
  assetBreakdown: AssetBreakdown;
  deepCrawlPages: DeepCrawlPageItem[];
  adminExposures: AdminExposureItem[];
}

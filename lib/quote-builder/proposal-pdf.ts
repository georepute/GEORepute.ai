/**
 * 4-page branded PDF proposal generator for Quote Builder.
 * Uses jsPDF + Chart.js (bar chart for DCS layers). White-label support.
 */

import { jsPDF } from "jspdf";
import { appendMandatoryCompliancePdfSection } from "@/lib/disclaimer-pdf";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  BarController,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
  BarController
);

const PURPLE = { r: 147, g: 51, b: 234 };
const GRAY_700 = { r: 55, g: 65, b: 81 };
const GRAY_600 = { r: 75, g: 85, b: 99 };
const GRAY_500 = { r: 107, g: 114, b: 128 };
const GRAY_400 = { r: 156, g: 163, b: 175 };
const GREEN = { r: 16, g: 185, b: 129 };
const AMBER = { r: 245, g: 158, b: 11 };
const RED = { r: 239, g: 68, b: 68 };

const DEFAULT_DISCLAIMER =
  "This proposal is based on publicly available data and comparative market benchmarks. It does not represent official search engine metrics and does not imply algorithm influence or guaranteed results.";

const REPORT_LABELS: Record<string, string> = {
  ai_vs_google_gap: "AI vs Google Gap",
  market_share_of_attention: "Market Share of Attention",
  opportunity_blind_spots: "Opportunity & Blind Spots",
  geo_visibility: "GEO Visibility",
};

const REPORT_DESCRIPTIONS: Record<string, string> = {
  ai_vs_google_gap: "Compare brand visibility in AI answers vs traditional search; identify gaps and opportunities.",
  market_share_of_attention: "Measure share of voice and attention across AI and organic channels.",
  opportunity_blind_spots: "Surface untapped queries and content gaps with competitive context.",
  geo_visibility: "Assess visibility and demand by geography; prioritize markets.",
};

export interface WhiteLabelConfig {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: { r: number; g: number; b: number };
  secondaryColor?: { r: number; g: number; b: number };
  agencyFooter?: string;
  poweredByEnabled?: boolean;
  disclaimerText?: string;
}

/** Raw config from API/DB may have primaryColor/secondaryColor as hex strings. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | undefined {
  const m = String(hex).replace(/^#/, "").match(/^(..)(..)(..)$/);
  if (!m) return undefined;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function normalizeWhiteLabel(raw: WhiteLabelConfig | Record<string, unknown> | null | undefined): WhiteLabelConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const primary = (raw as Record<string, unknown>).primaryColor;
  const secondary = (raw as Record<string, unknown>).secondaryColor;
  const primaryRgb = typeof primary === "string" ? hexToRgb(primary) : Array.isArray(primary) ? undefined : primary as { r: number; g: number; b: number } | undefined;
  const secondaryRgb = typeof secondary === "string" ? hexToRgb(secondary) : Array.isArray(secondary) ? undefined : secondary as { r: number; g: number; b: number } | undefined;
  return {
    companyName: (raw as Record<string, unknown>).companyName as string | undefined,
    logoUrl: (raw as Record<string, unknown>).logoUrl as string | undefined,
    primaryColor: primaryRgb,
    secondaryColor: secondaryRgb,
    agencyFooter: (raw as Record<string, unknown>).agencyFooter as string | undefined,
    poweredByEnabled: (raw as Record<string, unknown>).poweredByEnabled as boolean | undefined,
    disclaimerText: (raw as Record<string, unknown>).disclaimerText as string | undefined,
  };
}

export interface QuoteForPDF {
  client_name: string | null;
  client_email?: string | null;
  contact_person?: string | null;
  valid_until?: string | null;
  domain: string;
  dcs_snapshot: {
    finalScore: number;
    layerBreakdown: { name: string; score: number }[];
    radarChartData: { layer: string; score: number; fullMark: number }[];
    distanceToSafetyZone: number;
    distanceToDominanceZone: number;
    competitorComparison?: { name: string; domain?: string; score: number }[];
  };
  revenue_exposure: {
    searchDemand: number;
    revenueExposureWindow: { conservative: number; strategic: number; dominance: number };
    avgDealValue: number;
    disclaimer?: string;
  };
  market_data?: {
    totalSearchDemand?: number;
    commercialIntentVolume?: number | null;
    cpcWeightedValue?: number | null;
    competitiveShareOfAttention?: number;
    marketOpportunityIndex?: number;
    summary?: { totalSearchDemand?: number; competitiveShareOfAttention?: string; cpcWeightedValue?: string | null };
    aiQueryGrowthTrend?: number | null;
    emergingTopicClusters?: string[] | null;
  };
  threat_data: {
    competitivePressureIndex: number;
    riskAccelerationIndicator: string;
    signals?: Record<string, number>;
    projectedDcsSixMonths?: number;
    projectionDisclaimer?: string;
    legalNegativeMentions?: string;
  };
  recommendation: {
    primaryMode: string;
    allModes: { id: string; name: string; description: string; pricingAnchor: string }[];
    priorities: { area: string; reason: string; urgency: string }[];
    focusAreas: string[];
  };
  pricing_data: {
    suggestedMin: number;
    suggestedMax: number;
    breakdown: Record<string, string>;
    reportAddOns: { reportId: string; amount: number }[];
  };
  selected_reports: string[];
  selected_markets: string[];
  scope_adjustments?: { monitoringDepth?: string };
  total_monthly_price: number | null;
  price_override: number | null;
}

function getPrimaryColor(wl: WhiteLabelConfig | undefined) {
  if (wl?.primaryColor) return wl.primaryColor;
  return PURPLE;
}

async function loadLogoAsDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const img = document.createElement("img") as HTMLImageElement;
    img.crossOrigin = "anonymous";
    return await new Promise<string | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 5000);
      img.onload = () => {
        clearTimeout(t);
        try {
          const c = document.createElement("canvas");
          c.width = 200;
          c.height = 200;
          const ctx = c.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, 200, 200);
          resolve(c.toDataURL("image/png", 0.9));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(t);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

async function createDCSBarChartImage(
  layerBreakdown: { name: string; score: number }[],
  width = 500,
  height = 220
): Promise<string | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const labels = layerBreakdown.map((l) => l.name.length > 18 ? l.name.slice(0, 17) + "…" : l.name);
    const values = layerBreakdown.map((l) => l.score);
    const colors = ["#9333ea", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Score",
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: "Digital Control Score — 6 Layers", font: { size: 12 }, color: "#1f2937" },
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: "#f3f4f6" } },
          x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 8 } } },
        },
      },
    });
    await new Promise((r) => setTimeout(r, 350));
    const dataUrl = canvas.toDataURL("image/png", 0.95);
    chart.destroy();
    canvas.remove();
    return dataUrl;
  } catch (e) {
    console.error("DCS chart error:", e);
    return null;
  }
}

async function createRevenueExposureBarChartImage(
  window: { conservative: number; strategic: number; dominance: number },
  primaryRgb: { r: number; g: number; b: number },
  width = 500,
  height = 140
): Promise<string | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const hex = (r: number, g: number, b: number) => `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
    const primaryHex = hex(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    const labels = ["Conservative", "Strategic", "Dominance"];
    const values = [window.conservative ?? 0, window.strategic ?? 0, window.dominance ?? 0];
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Revenue ($)",
          data: values,
          backgroundColor: [primaryHex + "99", primaryHex + "cc", primaryHex],
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: "Revenue Exposure Window (Est.)", font: { size: 11 }, color: "#1f2937" },
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f3f4f6" }, ticks: { callback: (v) => `$${(v as number) / 1000}K` } },
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        },
      },
    });
    await new Promise((r) => setTimeout(r, 350));
    const dataUrl = canvas.toDataURL("image/png", 0.95);
    chart.destroy();
    canvas.remove();
    return dataUrl;
  } catch {
    return null;
  }
}

async function createRiskSignalsBarChartImage(
  signals: Record<string, number>,
  width = 500,
  height = 180
): Promise<string | null> {
  const entries = Object.entries(signals).slice(0, 6);
  if (entries.length === 0) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const formatLabel = (k: string) =>
      k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/^ /, "").trim();
    const labels = entries.map(([k]) => (formatLabel(k).length > 14 ? formatLabel(k).slice(0, 13) + "…" : formatLabel(k)));
    const values = entries.map(([, v]) => (typeof v === "number" ? v : 0));
    const maxVal = Math.max(...values, 1);
    const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#9333ea", "#7c3aed", "#6d28d9"];

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Score",
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: "Risk Signal Breakdown", font: { size: 11 }, color: "#1f2937" },
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: maxVal * 1.2 || 100, grid: { color: "#f3f4f6" } },
          x: { grid: { display: false }, ticks: { maxRotation: 35, font: { size: 8 } } },
        },
      },
    });
    await new Promise((r) => setTimeout(r, 350));
    const dataUrl = canvas.toDataURL("image/png", 0.95);
    chart.destroy();
    canvas.remove();
    return dataUrl;
  } catch (e) {
    console.error("Risk chart error:", e);
    return null;
  }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatRiskSignalLabel(k: string): string {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/^ /, "").trim();
}

/** Draw a light box for section/callout (no border, light fill). */
function drawSectionBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: { r: number; g: number; b: number } = { r: 248, g: 250, b: 252 }
) {
  doc.setFillColor(fill.r, fill.g, fill.b);
  doc.rect(x, y, w, h, "F");
}

/** Draw a thin horizontal rule. */
function drawRule(doc: jsPDF, x: number, y: number, w: number, gray = 220) {
  doc.setDrawColor(gray, gray, gray);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);
}

export type GenerateProposalPDFOptions = {
  /** If true, returns the PDF as ArrayBuffer instead of triggering download. */
  returnBuffer?: boolean;
};

export async function generateProposalPDF(
  quote: QuoteForPDF,
  whiteLabel?: WhiteLabelConfig | Record<string, unknown> | null,
  options?: GenerateProposalPDFOptions
): Promise<void | ArrayBuffer> {
  const wl = normalizeWhiteLabel(whiteLabel);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentTop = margin + 12;
  const contentBot = pageHeight - 14;
  const primary = getPrimaryColor(wl);
  const brandName = wl?.companyName ?? "GEORepute.ai";
  const logoDataUrl = await loadLogoAsDataUrl(wl?.logoUrl ?? undefined);
  const disclaimer = (wl?.disclaimerText ?? quote.revenue_exposure?.disclaimer) || DEFAULT_DISCLAIMER;

  let totalPages = 5;

  const header = (pageNum: number) => {
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageWidth, 12, "F");
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", margin, 1.5, 9, 9);
      } catch {
        /* skip */
      }
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(brandName, logoDataUrl ? margin + 11 : margin, 7.5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Strategic Intelligence Proposal", pageWidth - margin, 7.5, { align: "right" });
    doc.setDrawColor(GRAY_400.r, GRAY_400.g, GRAY_400.b);
    doc.setLineWidth(0.2);
    doc.line(0, 12, pageWidth, 12);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  };

  const footer = (pageNum: number) => {
    const fy = pageHeight - 6;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    if (disclaimer) {
      const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
      let dy = fy - 2 - (disclaimerLines.length - 1) * 3.2;
      disclaimerLines.forEach((line: string) => {
        doc.text(line, margin, dy, { maxWidth: pageWidth - 2 * margin });
        dy += 3.2;
      });
    }
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, fy, { align: "center" });
    if (wl?.poweredByEnabled !== false) {
      doc.text(`Powered by ${brandName}`, pageWidth - margin, fy, { align: "right" });
    }
  };

  const dcs = quote.dcs_snapshot || {};
  const layerBreakdown = dcs.layerBreakdown || [];
  const chartImg = await createDCSBarChartImage(layerBreakdown);

  // ——— Page 1: Digital Control Overview ———
  header(1);
  let y = contentTop;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("1. Digital Control Score Overview", margin, y);
  y += 6;
  drawRule(doc, margin, y, pageWidth - 2 * margin);
  y += 10;

  const boxPad = 4;
  const clientBoxY = y;
  const hasContact = !!(quote.contact_person || quote.client_email || quote.valid_until);
  const clientBoxH = hasContact ? 28 : 14;
  drawSectionBox(doc, margin, clientBoxY, pageWidth - 2 * margin, clientBoxH);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text(`Client: ${quote.client_name || "—"}`, margin + boxPad, clientBoxY + 6);
  doc.text(`Domain: ${quote.domain || "—"}`, margin + boxPad, clientBoxY + 11);
  if (hasContact) {
    if (quote.contact_person) doc.text(`Contact: ${quote.contact_person}`, margin + boxPad, clientBoxY + 16);
    if (quote.client_email) doc.text(`Email: ${quote.client_email}`, margin + boxPad, clientBoxY + 21);
    if (quote.valid_until) {
      const raw = quote.valid_until;
      const validStr = typeof raw === "string" ? (raw.length >= 10 ? raw.slice(0, 10) : raw) : String(raw);
      doc.text(`Valid until: ${validStr}`, margin + boxPad, clientBoxY + 26);
    }
  }
  y = clientBoxY + clientBoxH + 2;

  const dcsScore = Math.round(dcs.finalScore ?? 0);
  const dcsBoxH = 28;
  drawSectionBox(doc, margin, y, 42, dcsBoxH, { r: primary.r + (255 - primary.r) * 0.85, g: primary.g + (255 - primary.g) * 0.85, b: primary.b + (255 - primary.b) * 0.85 });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_600.r, GRAY_600.g, GRAY_600.b);
  doc.text("DIGITAL CONTROL SCORE", margin + boxPad, y + 6);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(String(dcsScore), margin + boxPad, y + 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  const toSafety = dcs.distanceToSafetyZone ?? 0;
  const toDom = dcs.distanceToDominanceZone ?? 0;
  doc.text(`To Safety (70): ${toSafety > 0 ? toSafety.toFixed(0) : "✓"}  |  To Dominance (85): ${toDom > 0 ? toDom.toFixed(0) : "✓"}`, margin + boxPad, y + 25);
  y += dcsBoxH + 10;

  if (chartImg) {
    try {
      const chartH = 52;
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, chartH);
      doc.addImage(chartImg, "PNG", margin + 2, y + 2, pageWidth - 2 * margin - 4, chartH - 4);
      y += chartH + 8;
    } catch {
      y += 4;
    }
  }

  const comps = dcs.competitorComparison || [];
  if (comps.length > 0) {
    const compBoxTop = y;
    const compBoxH = 6 + comps.slice(0, 5).length * 4.5;
    drawSectionBox(doc, margin, compBoxTop, pageWidth - 2 * margin, compBoxH);
    y = compBoxTop + 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    doc.text("Competitor comparison", margin + boxPad, y);
    y += 5;
    comps.slice(0, 5).forEach((c) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const label = (c as { domain?: string }).domain || (typeof c.name === "string" ? c.name : "");
      doc.text(`${label}: ${c.score}`, margin + boxPad, y);
      y += 4.5;
    });
    y = compBoxTop + compBoxH + 4;
  }
  footer(1);

  // ——— Page 2: Market & Revenue ———
  doc.addPage();
  header(2);
  y = contentTop;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("2. Market & Revenue Exposure", margin, y);
  y += 6;
  drawRule(doc, margin, y, pageWidth - 2 * margin);
  y += 10;

  const market = quote.market_data;
  const rev = quote.revenue_exposure || {};
  const window = rev.revenueExposureWindow || { conservative: 0, strategic: 0, dominance: 0 };
  const marketIndex = market?.marketOpportunityIndex;

  if (marketIndex != null && !Number.isNaN(marketIndex)) {
    const moBoxH = 20;
    drawSectionBox(doc, margin, y, 50, moBoxH, { r: primary.r + (255 - primary.r) * 0.9, g: primary.g + (255 - primary.g) * 0.9, b: primary.b + (255 - primary.b) * 0.9 });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_600.r, GRAY_600.g, GRAY_600.b);
    doc.text("MARKET OPPORTUNITY INDEX", margin + boxPad, y + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(String(Math.round(marketIndex)), margin + boxPad, y + 16);
    y += moBoxH + 10;
  }

  const metricsBoxTop = y;
  let metricsH = 6;
  if (market?.summary?.competitiveShareOfAttention) metricsH += 5;
  if (market?.summary?.cpcWeightedValue) metricsH += 5;
  if (market?.aiQueryGrowthTrend != null && !Number.isNaN(market.aiQueryGrowthTrend)) metricsH += 5;
  if (market?.emergingTopicClusters?.length) metricsH += 5;
  metricsH += 6 + 5 + 5 + 4;
  drawSectionBox(doc, margin, metricsBoxTop, pageWidth - 2 * margin, metricsH);
  let metricsLineY = metricsBoxTop + 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("Market & demand metrics", margin + boxPad, metricsLineY);
  metricsLineY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Total search demand (monthly): ${(market?.totalSearchDemand ?? rev.searchDemand ?? 0).toLocaleString()}`, margin + boxPad, metricsLineY);
  metricsLineY += 5;
  doc.text(`Avg. deal value (input): ${formatCurrency(rev.avgDealValue ?? 0)}`, margin + boxPad, metricsLineY);
  metricsLineY += 5;
  if (market?.summary?.competitiveShareOfAttention) {
    doc.text(`Competitive share of attention: ${market.summary.competitiveShareOfAttention}`, margin + boxPad, metricsLineY);
    metricsLineY += 5;
  }
  if (market?.summary?.cpcWeightedValue) {
    doc.text(`CPC weighted value: ${market.summary.cpcWeightedValue}`, margin + boxPad, metricsLineY);
    metricsLineY += 5;
  }
  if (market?.aiQueryGrowthTrend != null && !Number.isNaN(market.aiQueryGrowthTrend)) {
    doc.text(`AI query growth trend: ${market.aiQueryGrowthTrend}%`, margin + boxPad, metricsLineY);
    metricsLineY += 5;
  }
  if (market?.emergingTopicClusters?.length) {
    const clustersText = market.emergingTopicClusters.slice(0, 3).join(", ") + (market.emergingTopicClusters.length > 3 ? "…" : "");
    doc.text(`Opportunity clusters: ${clustersText}`, margin + boxPad, metricsLineY, { maxWidth: pageWidth - 2 * margin - 2 * boxPad });
    metricsLineY += 5;
  }
  y = metricsBoxTop + metricsH + 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("Revenue Exposure Window (estimated)", margin, y);
  y += 6;
  const revBoxTop = y;
  const revBoxH = 22;
  drawSectionBox(doc, margin, revBoxTop, pageWidth - 2 * margin, revBoxH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Conservative: ${formatCurrency(window.conservative ?? 0)}`, margin + boxPad, revBoxTop + 7);
  doc.text(`Strategic: ${formatCurrency(window.strategic ?? 0)}`, margin + boxPad, revBoxTop + 13);
  doc.text(`Dominance: ${formatCurrency(window.dominance ?? 0)}`, margin + boxPad, revBoxTop + 19);
  y = revBoxTop + revBoxH + 8;
  const revChartImg = await createRevenueExposureBarChartImage(window, primary);
  if (revChartImg) {
    try {
      const chartH = 44;
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, chartH);
      doc.addImage(revChartImg, "PNG", margin + 2, y + 2, pageWidth - 2 * margin - 4, chartH - 4);
      y += chartH + 8;
    } catch {
      y += 6;
    }
  }
  if (disclaimer) {
    doc.setFontSize(7);
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    const wrap = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
    wrap.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 3.5;
    });
  }
  footer(2);

  // ——— Page 3: Risk & Competitive Pressure ———
  doc.addPage();
  header(3);
  y = contentTop;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("3. Risk & Competitive Pressure", margin, y);
  y += 6;
  drawRule(doc, margin, y, pageWidth - 2 * margin);
  y += 10;

  const threat = quote.threat_data || {};
  const cpi = threat.competitivePressureIndex ?? 0;
  const ind = (threat.riskAccelerationIndicator || "LOW").toUpperCase();
  const riskColor = ind === "HIGH" ? RED : ind === "MEDIUM" ? AMBER : GREEN;

  // Intro text
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("We assess competitive pressure and risk signals that may affect your digital visibility. Lower CPI and LOW risk acceleration indicate a stable position.", margin, y, { maxWidth: pageWidth - 2 * margin });
  y += 10;

  // Two separate boxes: CPI (left) and Risk Acceleration (right) — no overlapping
  const halfW = (pageWidth - 2 * margin - 8) / 2; // 8px gap between boxes
  const metricsBoxH = 28;
  drawSectionBox(doc, margin, y, halfW, metricsBoxH, { r: primary.r + (255 - primary.r) * 0.92, g: primary.g + (255 - primary.g) * 0.92, b: primary.b + (255 - primary.b) * 0.92 });
  drawSectionBox(doc, margin + halfW + 8, y, halfW, metricsBoxH, { r: primary.r + (255 - primary.r) * 0.92, g: primary.g + (255 - primary.g) * 0.92, b: primary.b + (255 - primary.b) * 0.92 });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_600.r, GRAY_600.g, GRAY_600.b);
  doc.text("COMPETITIVE PRESSURE INDEX", margin + boxPad, y + 6);
  doc.text("RISK ACCELERATION", margin + halfW + 8 + boxPad, y + 6);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(cpi.toFixed(0), margin + boxPad, y + 18);
  doc.setTextColor(riskColor.r, riskColor.g, riskColor.b);
  doc.text(ind, margin + halfW + 8 + boxPad, y + 18);
  y += metricsBoxH + 10;

  const signals = threat.signals || {};
  const signalEntries = Object.entries(signals).slice(0, 6);
  const riskChartImg = signalEntries.length > 0 ? await createRiskSignalsBarChartImage(signals) : null;

  if (riskChartImg) {
    try {
      const chartH = 48;
      drawSectionBox(doc, margin, y, pageWidth - 2 * margin, chartH);
      doc.addImage(riskChartImg, "PNG", margin + 2, y + 2, pageWidth - 2 * margin - 4, chartH - 4);
      y += chartH + 10;
    } catch {
      y += 6;
    }
  }

  if (signalEntries.length > 0 && !riskChartImg) {
    const sigBoxH = 6 + signalEntries.length * 5;
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, sigBoxH);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    doc.text("Risk signals", margin + boxPad, y + 6);
    let sy = y + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    signalEntries.forEach(([k, v]) => {
      doc.text(`${formatRiskSignalLabel(k)}: ${typeof v === "number" ? v.toFixed(1) : v}`, margin + boxPad, sy);
      sy += 5;
    });
    y += sigBoxH + 8;
  }

  const projDcs = threat.projectedDcsSixMonths;
  if (projDcs != null && !Number.isNaN(projDcs)) {
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    doc.text(`Projected DCS (6 months): ${projDcs}`, margin + boxPad, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    doc.text(threat.projectionDisclaimer ?? "Projection only, not a guarantee.", margin + boxPad, y + 14);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    y += 22;
  }

  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text(`Legal / negative mentions: ${threat.legalNegativeMentions ?? "Not assessed"}`, margin + boxPad, y + 8);
  y += 18;
  footer(3);

  // ——— Page 4: Strategic Prescription & Investment ———
  doc.addPage();
  header(4);
  y = contentTop;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("4. Strategic Prescription & Investment", margin, y);
  y += 6;
  drawRule(doc, margin, y, pageWidth - 2 * margin);
  y += 10;

  const rec = quote.recommendation || {};
  const primaryMode = rec.allModes?.find((m: { id: string }) => m.id === rec.primaryMode) || rec.allModes?.[0];
  if (primaryMode) {
    const recBoxH = 22;
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, recBoxH);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(primaryMode.name, margin + boxPad, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    const descLines = doc.splitTextToSize(primaryMode.description, pageWidth - 2 * margin - 2 * boxPad);
    descLines.slice(0, 2).forEach((line: string, i: number) => {
      doc.text(line, margin + boxPad, y + 14 + i * 4);
    });
    y += recBoxH + 10;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("Scope", margin, y);
  y += 6;
  const scopeLine1 = `Markets: ${quote.selected_markets?.length ? quote.selected_markets.join(", ") : "—"}`;
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(scopeLine1, margin + boxPad, y + 7);
  y += 16;

  if (quote.selected_reports?.length) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    doc.text("Reports included in this proposal", margin, y);
    y += 6;
    const reportIds = quote.selected_reports;
    let reportsBoxH = 4;
    const reportEntries: { name: string; desc: string }[] = reportIds.map((r) => ({
      name: REPORT_LABELS[r] || r,
      desc: REPORT_DESCRIPTIONS[r] || "Included in retainer scope.",
    }));
    reportEntries.forEach(({ name, desc }) => {
      const descWrap = doc.splitTextToSize(desc, pageWidth - 2 * margin - 2 * boxPad - 4);
      reportsBoxH += 6 + descWrap.length * 3.5;
    });
    drawSectionBox(doc, margin, y, pageWidth - 2 * margin, reportsBoxH);
    let ry = y + 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    reportEntries.forEach(({ name, desc }) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text("• " + name, margin + boxPad, ry);
      ry += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      doc.setFontSize(8);
      const wrap = doc.splitTextToSize(desc, pageWidth - 2 * margin - 2 * boxPad - 4);
      wrap.forEach((line: string) => {
        doc.text(line, margin + boxPad + 2, ry);
        ry += 3.5;
      });
      doc.setFontSize(9);
      ry += 3;
    });
    y += reportsBoxH + 6;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("Next steps", margin, y);
  y += 6;
  drawSectionBox(doc, margin, y, pageWidth - 2 * margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("Schedule kickoff call → Define success metrics → Monthly strategy reviews", margin + boxPad, y + 6);
  doc.text("Customize timeline and deliverables in the engagement agreement.", margin + boxPad, y + 12);
  y += 20;

  const displayPrice = quote.price_override ?? quote.total_monthly_price ?? quote.pricing_data?.suggestedMax ?? 0;
  const invBoxTop = y;
  const invBoxH = 24;
  drawSectionBox(doc, margin, invBoxTop, pageWidth - 2 * margin, invBoxH, { r: primary.r + (255 - primary.r) * 0.88, g: primary.g + (255 - primary.g) * 0.88, b: primary.b + (255 - primary.b) * 0.88 });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_600.r, GRAY_600.g, GRAY_600.b);
  doc.text("MONTHLY INVESTMENT (RETAINER)", margin + boxPad, invBoxTop + 6);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(quote.price_override != null ? formatCurrency(quote.price_override) : `${formatCurrency(quote.pricing_data?.suggestedMin ?? 0)} – ${formatCurrency(quote.pricing_data?.suggestedMax ?? 0)}`, margin + boxPad, invBoxTop + 18);
  y = invBoxTop + invBoxH + 10;

  if (disclaimer) {
    doc.setFontSize(8);
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    const discLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
    discLines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 3.5;
    });
  }
  if (wl?.agencyFooter) {
    y += 4;
    doc.text(wl.agencyFooter, margin, y);
  }
  footer(4);

  // Page 5 — mandatory compliance (Methodology & Disclaimer); same text on every proposal PDF
  doc.addPage();
  header(5);
  const inferredLocale =
    typeof document !== "undefined" && document.documentElement?.lang === "he" ? "he" : "en";
  appendMandatoryCompliancePdfSection(doc, {
    margin,
    pageWidth,
    contentTop,
    contentBottom: contentBot,
    locale: inferredLocale,
    startWithNewPage: false,
  });
  footer(5);

  if (options?.returnBuffer) {
    return doc.output("arraybuffer") as ArrayBuffer;
  }
  doc.save(`Proposal-${quote.domain || "quote"}-${Date.now()}.pdf`);
}

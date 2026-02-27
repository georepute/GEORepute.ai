/**
 * 4-page branded PDF proposal generator for Quote Builder.
 * Uses jsPDF + Chart.js (bar chart for DCS layers). White-label support.
 */

import { jsPDF } from "jspdf";
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
const GRAY_500 = { r: 107, g: 114, b: 128 };
const GRAY_400 = { r: 156, g: 163, b: 175 };
const GREEN = { r: 16, g: 185, b: 129 };
const AMBER = { r: 245, g: 158, b: 11 };
const RED = { r: 239, g: 68, b: 68 };

const DEFAULT_DISCLAIMER =
  "This proposal is based on publicly available data and estimates. Results may vary. No guarantee of specific outcomes is expressed or implied.";

export interface WhiteLabelConfig {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: { r: number; g: number; b: number };
  secondaryColor?: { r: number; g: number; b: number };
  agencyFooter?: string;
  poweredByEnabled?: boolean;
  disclaimerText?: string;
}

export interface QuoteForPDF {
  client_name: string | null;
  domain: string;
  dcs_snapshot: {
    finalScore: number;
    layerBreakdown: { name: string; score: number }[];
    radarChartData: { layer: string; score: number; fullMark: number }[];
    distanceToSafetyZone: number;
    distanceToDominanceZone: number;
    competitorComparison?: { name: string; score: number }[];
  };
  revenue_exposure: {
    searchDemand: number;
    revenueExposureWindow: { conservative: number; strategic: number; dominance: number };
    avgDealValue: number;
    disclaimer?: string;
  };
  threat_data: {
    competitivePressureIndex: number;
    riskAccelerationIndicator: string;
    signals?: Record<string, number>;
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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export async function generateProposalPDF(
  quote: QuoteForPDF,
  whiteLabel?: WhiteLabelConfig
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentTop = margin + 12;
  const contentBot = pageHeight - 14;
  const primary = getPrimaryColor(whiteLabel);
  const brandName = whiteLabel?.companyName ?? "GEORepute.ai";
  const logoDataUrl = await loadLogoAsDataUrl(whiteLabel?.logoUrl ?? undefined);
  const disclaimer = (whiteLabel?.disclaimerText ?? quote.revenue_exposure?.disclaimer) || DEFAULT_DISCLAIMER;

  let totalPages = 4;

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
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    doc.text(disclaimer.slice(0, 80) + (disclaimer.length > 80 ? "…" : ""), margin, fy - 2, { maxWidth: pageWidth - 2 * margin });
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, fy, { align: "center" });
    if (whiteLabel?.poweredByEnabled !== false) {
      doc.text(`Powered by ${brandName}`, pageWidth - margin, fy, { align: "right" });
    }
  };

  const dcs = quote.dcs_snapshot || {};
  const layerBreakdown = dcs.layerBreakdown || [];
  const chartImg = await createDCSBarChartImage(layerBreakdown);

  // ——— Page 1: Digital Control Overview ———
  header(1);
  let y = contentTop;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("1. Digital Control Score Overview", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text(`Client: ${quote.client_name || "—"}  |  Domain: ${quote.domain || "—"}`, margin, y);
  y += 8;

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(`DCS: ${Math.round(dcs.finalScore ?? 0)}`, margin, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  const toSafety = dcs.distanceToSafetyZone ?? 0;
  const toDom = dcs.distanceToDominanceZone ?? 0;
  doc.text(`Distance to Safety Zone (70): ${toSafety > 0 ? toSafety.toFixed(0) : "Achieved"}  |  Distance to Dominance (85): ${toDom > 0 ? toDom.toFixed(0) : "Achieved"}`, margin, y);
  y += 10;

  if (chartImg) {
    try {
      doc.addImage(chartImg, "PNG", margin, y, pageWidth - 2 * margin, 55);
      y += 58;
    } catch {
      y += 2;
    }
  }

  const comps = dcs.competitorComparison || [];
  if (comps.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Competitor comparison", margin, y);
    y += 5;
    comps.slice(0, 5).forEach((c) => {
      doc.setFont("helvetica", "normal");
      doc.text(`${c.name}: ${c.score}`, margin + 2, y);
      y += 4;
    });
  }
  footer(1);

  // ——— Page 2: Market & Revenue ———
  doc.addPage();
  header(2);
  y = contentTop;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("2. Market & Revenue Exposure", margin, y);
  y += 10;

  const rev = quote.revenue_exposure || {};
  const window = rev.revenueExposureWindow || { conservative: 0, strategic: 0, dominance: 0 };
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text(`Total search demand (monthly): ${(rev.searchDemand ?? 0).toLocaleString()}`, margin, y);
  y += 6;
  doc.text(`Avg. deal value (input): ${formatCurrency(rev.avgDealValue ?? 0)}`, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Revenue Exposure Window (estimated)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Conservative: ${formatCurrency(window.conservative ?? 0)}`, margin + 2, y);
  y += 5;
  doc.text(`Strategic: ${formatCurrency(window.strategic ?? 0)}`, margin + 2, y);
  y += 5;
  doc.text(`Dominance: ${formatCurrency(window.dominance ?? 0)}`, margin + 2, y);
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  const wrap = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  wrap.forEach((line: string) => {
    doc.text(line, margin, y);
    y += 3.5;
  });
  footer(2);

  // ——— Page 3: Risk & Competitive Pressure ———
  doc.addPage();
  header(3);
  y = contentTop;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("3. Risk & Competitive Pressure", margin, y);
  y += 10;

  const threat = quote.threat_data || {};
  const cpi = threat.competitivePressureIndex ?? 0;
  const ind = (threat.riskAccelerationIndicator || "LOW").toUpperCase();
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Competitive Pressure Index: ${cpi.toFixed(0)}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(ind === "HIGH" ? RED.r : ind === "MEDIUM" ? AMBER.r : GREEN.r, ind === "HIGH" ? RED.g : ind === "MEDIUM" ? AMBER.g : GREEN.g, ind === "HIGH" ? RED.b : ind === "MEDIUM" ? AMBER.b : GREEN.b);
  doc.text(`Risk Acceleration: ${ind}`, margin, y);
  y += 8;
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  const signals = threat.signals || {};
  Object.entries(signals).slice(0, 6).forEach(([k, v]) => {
    doc.setFontSize(8);
    doc.text(`${k}: ${typeof v === "number" ? v.toFixed(1) : v}`, margin + 2, y);
    y += 4;
  });
  footer(3);

  // ——— Page 4: Strategic Prescription & Investment ———
  doc.addPage();
  header(4);
  y = contentTop;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text("4. Strategic Prescription & Investment", margin, y);
  y += 10;

  const rec = quote.recommendation || {};
  const primaryMode = rec.allModes?.find((m: { id: string }) => m.id === rec.primaryMode) || rec.allModes?.[0];
  if (primaryMode) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(primaryMode.name, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(primaryMode.description, pageWidth - 2 * margin);
    descLines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 4;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Scope", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Markets: ${(quote.selected_markets?.length ? quote.selected_markets.join(", ") : "—")}`, margin + 2, y);
  y += 5;
  doc.text(`Reports included: ${(quote.selected_reports?.length ? quote.selected_reports.join(", ") : "—")}`, margin + 2, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Investment (monthly retainer)", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const displayPrice = quote.price_override ?? quote.total_monthly_price ?? quote.pricing_data?.suggestedMax ?? 0;
  doc.text(`Range: ${formatCurrency(quote.pricing_data?.suggestedMin ?? 0)} – ${formatCurrency(quote.pricing_data?.suggestedMax ?? 0)}${quote.price_override != null ? `  (Override: ${formatCurrency(quote.price_override)})` : ""}`, margin + 2, y);
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  const discLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
  discLines.forEach((line: string) => {
    doc.text(line, margin, y);
    y += 3.5;
  });
  if (whiteLabel?.agencyFooter) {
    y += 4;
    doc.text(whiteLabel.agencyFooter, margin, y);
  }
  footer(4);

  doc.save(`Proposal-${quote.domain || "quote"}-${Date.now()}.pdf`);
}

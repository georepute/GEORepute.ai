import { jsPDF } from "jspdf";
import { format } from "date-fns";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  DoughnutController,
  BarController,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  DoughnutController,
  BarController
);

interface ActionStep {
  step: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  completed: boolean;
  channel?: string;
  platform?: string;
}

interface ActionPlan {
  id: string;
  title: string;
  objective: string;
  steps: ActionStep[];
  reasoning: string;
  expectedOutcome: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  category: string;
  projectName?: string;
  domain?: string;
  channels?: string[];
}

const PURPLE = { r: 147, g: 51, b: 234 };
const PURPLE_DARK = { r: 107, g: 33, b: 168 };
const GRAY_700 = { r: 55, g: 65, b: 81 };
const GRAY_500 = { r: 107, g: 114, b: 128 };
const GRAY_400 = { r: 156, g: 163, b: 175 };
const GREEN = { r: 16, g: 185, b: 129 };
const RED = { r: 239, g: 68, b: 68 };
const AMBER = { r: 245, g: 158, b: 11 };

async function loadGeoReputeLogo(): Promise<string | null> {
  try {
    const logoImg = document.createElement("img") as HTMLImageElement;
    logoImg.crossOrigin = "anonymous";
    return await new Promise<string | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 4000);
      logoImg.onload = () => {
        clearTimeout(t);
        try {
          const c = document.createElement("canvas");
          c.width = 400;
          c.height = 400;
          const ctx = c.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(logoImg, 0, 0, 400, 400);
          resolve(c.toDataURL("image/png", 0.95));
        } catch {
          resolve(null);
        }
      };
      logoImg.onerror = () => {
        clearTimeout(t);
        resolve(null);
      };
      logoImg.src = "/logo.png";
    });
  } catch {
    return null;
  }
}

const CHART_COLORS = ["#9333ea", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

async function createChartImage(
  type: "pie" | "bar",
  data: { name: string; value: number }[] | number[],
  labels: string[],
  title: string,
  width = 600,
  height = 350
): Promise<string | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    let chartConfig: any;
    const titleOpts = {
      display: true,
      text: title,
      font: { size: 14, weight: "bold" as const },
      color: "#1f2937",
      padding: { bottom: 12 },
    };

    if (type === "pie") {
      const arr = data as { name: string; value: number }[];
      chartConfig = {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: arr.map((d) => d.value),
            backgroundColor: arr.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderColor: "#ffffff",
            borderWidth: 2,
          }],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: titleOpts,
            legend: { display: true, position: "right", labels: { font: { size: 11 }, padding: 10 } },
          },
        },
      };
    } else {
      const values = (data as number[]).map((d) =>
        typeof d === "object" && d !== null && "value" in d ? (d as { value: number }).value : d
      );
      chartConfig = {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: title,
            data: values,
            backgroundColor: CHART_COLORS.slice(0, labels.length),
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: { title: titleOpts, legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "#f3f4f6" } },
            x: { grid: { display: false } },
          },
        },
      };
    }

    const chart = new Chart(ctx, chartConfig);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const imageData = canvas.toDataURL("image/png", 0.95);
    chart.destroy();
    canvas.remove();
    return imageData;
  } catch (error) {
    console.error("Error creating chart:", error);
    return null;
  }
}

// ─── comprehensive client file export ─────────────────────────────────────────

export interface ClientFilePDFData {
  project: {
    name: string;
    industry: string;
    website?: string;
    description?: string;
    keywords?: string[];
  };
  intelligenceData?: any;
  annualPlan?: any;
  actionPlans?: ActionPlan[];
  businessDevMarkets?: any[];
}

export async function exportClientFilePDF(data: ClientFilePDFData): Promise<void> {
  const { project, intelligenceData, annualPlan, actionPlans = [], businessDevMarkets = [] } = data;
  const scores  = intelligenceData?.scores  || {};
  const reports = intelligenceData?.reports || {};

  const doc        = new jsPDF();
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin     = 20;
  const rightEdge  = pageWidth - margin;
  const cW         = rightEdge - margin;
  const lh         = 5;
  const contentTop = margin + 14;
  const contentBot = pageHeight - 12;
  let yPos         = contentTop;

  const logo = await loadGeoReputeLogo();

  // ── helpers ──────────────────────────────────────────────────────────────
  const header = () => {
    doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
    doc.rect(0, 0, pageWidth, 14, "F");
    if (logo) {
      try { doc.addImage(logo, "PNG", margin, 2.5, 9, 9); } catch { /* skip */ }
    }
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("GEORepute.ai", logo ? margin + 11 : margin, 8.5);
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("AI Visibility Intelligence Platform", pageWidth - margin, 8.5, { align: "right" });
    doc.setDrawColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
    doc.setLineWidth(0.4);
    doc.line(0, 14, pageWidth, 14);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  };

  const footer = (pg: number, total: number) => {
    const fy = pageHeight - 7;
    doc.setDrawColor(GRAY_400.r, GRAY_400.g, GRAY_400.b); doc.setLineWidth(0.3);
    doc.line(margin, fy - 3, pageWidth - margin, fy - 3);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    doc.text("Confidential — Generated by GEORepute.ai", margin, fy);
    doc.text(`Page ${pg} of ${total}`, pageWidth / 2, fy, { align: "center" });
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageWidth - margin, fy, { align: "right" });
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  };

  const pageBreak = (need: number) => {
    if (yPos + need > contentBot) { doc.addPage(); header(); yPos = contentTop; }
  };

  const wrap = (text: string, x: number, maxW: number, lhh = lh) => {
    const sw = Math.min(maxW, rightEdge - x);
    (doc.splitTextToSize(text || "—", sw) as string[]).forEach((line) => {
      pageBreak(lhh); doc.text(line, x, yPos, { maxWidth: sw }); yPos += lhh;
    });
  };

  const secHead = (title: string, r: number, g: number, b: number) => {
    // Only add top gap if we're not at the very top of a fresh page
    if (yPos > contentTop + 2) yPos += 4;
    pageBreak(16);
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin, yPos, cW, 11, 1.5, 1.5, "F");
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, yPos + 7.5);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    yPos += 15;
  };

  const subHead = (title: string) => {
    yPos += 5;
    pageBreak(14);
    doc.setFillColor(240, 240, 255);
    doc.rect(margin, yPos, cW, 8, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
    doc.text(title, margin + 3, yPos + 5.5);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    yPos += 12;
  };

  const kvRow = (label: string, value: string) => {
    pageBreak(lh + 3);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold"); doc.text(`${label}:`, margin + 2, yPos);
    doc.setFont("helvetica", "normal");
    const lw = doc.getTextWidth(`${label}: `);
    wrap(value, margin + 2 + lw, cW - lw - 4, lh);
    yPos += 2;
  };

  const tableRows = (
    rows: string[][], cols: number[], startX = margin,
    boldFirst = false, headerBg?: [number, number, number]
  ) => {
    yPos += 3;
    rows.forEach((cells, ri) => {
      const rowH = 8;
      pageBreak(rowH + 2);
      const totalW = cols.reduce((a, b) => a + b, 0);
      if (ri === 0 && headerBg) {
        doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
        doc.rect(startX, yPos, totalW, rowH, "F");
      } else if (ri % 2 === 0) {
        doc.setFillColor(248, 248, 252);
        doc.rect(startX, yPos, totalW, rowH, "F");
      }
      doc.setFont("helvetica", (ri === 0 && boldFirst) ? "bold" : "normal");
      doc.setFontSize(7.5);
      let x = startX;
      cells.forEach((cell, ci) => {
        const maxW = cols[ci] - 2;
        const txt = (doc.splitTextToSize(String(cell ?? "—"), maxW) as string[])[0] ?? "";
        doc.text(txt, x + 1, yPos + 5.5);
        x += cols[ci];
      });
      yPos += rowH;
    });
    yPos += 5;
  };

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  // Full-page gradient band
  doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setFillColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
  doc.rect(0, 55, pageWidth, 15, "F");

  if (logo) {
    try { doc.addImage(logo, "PNG", pageWidth / 2 - 10, 10, 20, 20); } catch { /* skip */ }
  }
  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("GEORepute.ai", pageWidth / 2, logo ? 37 : 28, { align: "center" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("AI Visibility Intelligence Platform", pageWidth / 2, logo ? 43 : 34, { align: "center" });

  doc.setFontSize(8); doc.setTextColor(200, 180, 255);
  doc.text("STRATEGIC INTELLIGENCE REPORT", pageWidth / 2, 53, { align: "center" });

  // Project card — dynamic height based on name length
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  const nameParts = doc.splitTextToSize(project.name || "Brand", cW - 20) as string[];
  const cardTop  = 76;
  const cardH    = Math.max(60, nameParts.length * 9 + 55);
  doc.setFillColor(250, 248, 255);
  doc.roundedRect(margin, cardTop, cW, cardH, 3, 3, "F");
  doc.setDrawColor(220, 200, 255); doc.setLineWidth(0.5);
  doc.roundedRect(margin, cardTop, cW, cardH, 3, 3, "S");

  doc.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  let coverY = cardTop + 12;
  nameParts.forEach((line) => { doc.text(line, pageWidth / 2, coverY, { align: "center" }); coverY += 9; });

  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  coverY += 3;
  doc.text(`Industry: ${project.industry || "—"}`, pageWidth / 2, coverY, { align: "center" });
  coverY += 7;
  if (project.website) {
    doc.text(`Website: ${project.website}`, pageWidth / 2, coverY, { align: "center" });
    coverY += 7;
  }
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth / 2, coverY, { align: "center" }
  );
  coverY += 7;

  // Description — capped at 3 lines
  if (project.description) {
    doc.setFontSize(8); doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    const descLines = doc.splitTextToSize(project.description, cW - 20) as string[];
    coverY += 3;
    descLines.slice(0, 3).forEach((line) => { doc.text(line, pageWidth / 2, coverY, { align: "center" }); coverY += 5.5; });
  }

  // Keywords — placed dynamically below card
  const keywordsY = cardTop + cardH + 10;
  if (project.keywords?.length) {
    doc.setFontSize(7.5); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    doc.text(`Keywords: ${project.keywords.slice(0, 8).join(", ")}`, pageWidth / 2, keywordsY, { align: "center" });
  }

  // Table of contents — placed dynamically below keywords
  const tocStartY = keywordsY + 14;
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  doc.text("Contents", margin, tocStartY);
  doc.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b); doc.setLineWidth(0.5);
  doc.line(margin, tocStartY + 2, margin + 30, tocStartY + 2);

  const tocItems = [
    ["1", "Strategic Intelligence Overview"],
    ["2", "AI Visibility Analysis"],
    ["3", "SEO & Organic Performance"],
    ["4", "Strategic Blind Spots"],
    ["5", "AI vs Google Gap Analysis"],
    ...(reports.shareOfAttention?.available ? [["6", "Market Share of Attention"]] : []),
    ...(annualPlan ? [["7", "12-Month Strategic Plan"]] : []),
    ...(actionPlans.length > 0 ? [["8", "Action Plans"]] : []),
    ...(businessDevMarkets.length > 0 ? [["9", "Business Development"]] : []),
  ];
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  tocItems.forEach((item, i) => {
    doc.text(`${item[0]}. ${item[1]}`, margin + 5, tocStartY + 10 + i * 8);
  });

  // Confidential banner — pinned to bottom of page
  doc.setFillColor(245, 240, 255);
  doc.rect(margin, pageHeight - 28, cW, 12, "F");
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
  doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight - 21, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  doc.text("This document contains proprietary intelligence data generated by GEORepute.ai", pageWidth / 2, pageHeight - 16, { align: "center" });

  // ── Page 2: Intelligence Overview ─────────────────────────────────────────
  doc.addPage(); header(); yPos = contentTop;

  secHead("1 · Strategic Intelligence Overview", PURPLE.r, PURPLE.g, PURPLE.b);

  // Score summary table
  const scoreRows: string[][] = [["Metric", "Score", "Status"]];
  const scoreMap: [string, string, number][] = [
    ["AI Visibility", "ai_platform_responses", scores.aiVisibility ?? 0],
    ["SEO Presence", "gsc_queries / gsc_pages", scores.seoPresence ?? 0],
    ["Market Share", "market_share_reports", scores.shareOfAttention ?? 0],
    ["Risk Coverage", "blind_spot_reports", scores.riskExposure ?? 0],
    ["Opportunity", "gsc opportunityQueryCount", scores.opportunityScore ?? 0],
    ["Revenue Readiness", "Composite (SEO+AI+Authority)", scores.revenueReadiness ?? 0],
  ];
  scoreMap.filter(([, , s]) => s > 0).forEach(([label, , score]) => {
    const status = score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Needs Work";
    scoreRows.push([label, `${score}/100`, status]);
  });
  if (scoreRows.length > 1) {
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    tableRows(scoreRows, [70, 30, 60], margin, true, [235, 225, 255]);
  }

  // Score chart
  const scoreChartData = scoreMap.filter(([, , s]) => s > 0);
  if (scoreChartData.length > 0) {
    const chartImg = await createChartImage(
      "bar", scoreChartData.map(([, , s]) => s), scoreChartData.map(([l]) => l),
      "Intelligence Scores (0–100)", 560, 280
    );
    if (chartImg) {
      pageBreak(55);
      doc.addImage(chartImg, "PNG", margin, yPos, cW, 52);
      yPos += 56;
    }
  }

  // Data completeness
  const comp = intelligenceData?.dataCompleteness || {};
  subHead("Data Completeness");
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
  [
    ["AI Visibility", comp.aiVisibility],
    ["GSC Data",      comp.gscData],
    ["Market Share",  comp.marketShare],
    ["Blind Spots",   comp.blindSpots],
    ["Gap Analysis",  comp.gapAnalysis],
  ].forEach(([label, avail]) => {
    pageBreak(lh + 2);
    doc.setFillColor(avail ? 220 : 255, avail ? 252 : 235, avail ? 231 : 235);
    doc.roundedRect(margin, yPos - 2, cW, lh + 3, 1, 1, "F");
    doc.setTextColor(avail ? GREEN.r : RED.r, avail ? GREEN.g : RED.g, avail ? GREEN.b : RED.b);
    doc.text(avail ? "✓" : "✗", margin + 3, yPos + 2);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    doc.text(String(label), margin + 10, yPos + 2);
    yPos += lh + 4;
  });
  yPos += 4;

  // ── Section 2: AI Visibility ───────────────────────────────────────────────
  const aiD = reports.aiVisibility?.details;
  if (aiD) {
    doc.addPage(); header(); yPos = contentTop;
    secHead("2 · AI Visibility Analysis", 139, 92, 246);

    kvRow("Overall Mention Rate", `${aiD.mentionRate ?? 0}% (${aiD.mentionedCount ?? 0} / ${aiD.totalQueries ?? 0} queries)`);
    kvRow("AI Visibility Score", `${scores.aiVisibility ?? 0} / 100`);
    kvRow("Queries Not Mentioned", String(aiD.gapCount ?? 0));
    yPos += 4;

    if (aiD.platformBreakdown?.length) {
      subHead("Per-Platform Breakdown");
      tableRows(
        [["Platform", "Mentioned", "Total", "Mention Rate"],
         ...(aiD.platformBreakdown as any[]).map((p: any) => [p.platform, String(p.mentioned), String(p.total), `${p.rate}%`])],
        [55, 35, 30, 40], margin, true, [235, 225, 255]
      );
    }
  }

  // ── Section 3: SEO Performance ────────────────────────────────────────────
  const seoD = reports.seoAnalysis?.details;
  if (seoD) {
    doc.addPage(); header(); yPos = contentTop;
    secHead("3 · SEO & Organic Performance", 34, 197, 94);

    tableRows(
      [
        ["Metric", "Value"],
        ["Total Clicks", String((seoD.totalClicks ?? 0).toLocaleString())],
        ["Total Impressions", String((seoD.totalImpressions ?? 0).toLocaleString())],
        ["Avg. CTR", `${seoD.avgCTR ?? 0}%`],
        ["Avg. Position", String(seoD.avgPosition ?? "—")],
        ["Top-10 Queries", String(seoD.topRankingQueries ?? 0)],
        ["Opportunity Queries (pos>10, impr>50)", String(seoD.opportunityQueryCount ?? 0)],
        ["Unique Queries", String(seoD.totalQueries ?? 0)],
        ["Unique Pages", String(seoD.totalPages ?? 0)],
      ],
      [100, 60], margin, true, [220, 250, 235]
    );

    if (seoD.topPerformingQueries?.length) {
      subHead("Top Queries by Clicks");
      tableRows(
        [["Query", "Clicks", "Impressions", "CTR", "Pos"],
         ...(seoD.topPerformingQueries as any[]).slice(0, 20).map((q: any) => [
           q.query, String(q.clicks ?? 0), String((q.impressions ?? 0).toLocaleString()), `${q.ctr}%`, String(q.position)
         ])],
        [80, 22, 32, 20, 20], margin, true, [220, 250, 235]
      );
    }

    const oppD = reports.opportunityEngine?.details;
    if (oppD?.opportunityKeywords?.length) {
      subHead("Opportunity Queries (high impressions, weak position)");
      tableRows(
        [["Query", "Impressions", "Clicks", "CTR", "Pos"],
         ...(oppD.opportunityKeywords as any[]).slice(0, 15).map((q: any) => [
           q.query, String((q.impressions ?? 0).toLocaleString()), String(q.clicks ?? 0), q.ctr != null ? `${q.ctr}%` : "—", String(q.position)
         ])],
        [80, 32, 22, 20, 20], margin, true, [255, 248, 220]
      );
    }

    if (seoD.topPages?.length) {
      subHead("Top Pages by Clicks");
      tableRows(
        [["Page", "Clicks", "Impressions", "Pos"],
         ...(seoD.topPages as any[]).slice(0, 15).map((p: any) => [
           (p.page as string).replace(/^https?:\/\/[^/]+/, "") || p.page,
           String(p.clicks ?? 0), String((p.impressions ?? 0).toLocaleString()), String(p.position)
         ])],
        [100, 22, 32, 20], margin, true, [220, 250, 235]
      );
    }
  }

  // ── Section 4: Blind Spots ────────────────────────────────────────────────
  const riskD = reports.riskMatrix?.details;
  if (riskD && reports.riskMatrix?.available) {
    doc.addPage(); header(); yPos = contentTop;
    secHead("4 · Strategic Blind Spots", 239, 68, 68);

    tableRows(
      [
        ["Metric", "Value"],
        ["Total Blind Spots", String(riskD.totalBlindSpots ?? 0)],
        ["High Priority", String(riskD.highPriority ?? 0)],
        ["Medium Priority", String(riskD.mediumPriority ?? 0)],
        ["Low Priority", String(riskD.lowPriority ?? 0)],
        ["Avg. Blind Spot Score", String(riskD.avgBlindSpotScore ?? "—")],
        ["AI Blind Spot %", `${riskD.aiBlindSpotPct ?? 0}%`],
      ],
      [100, 60], margin, true, [255, 220, 220]
    );

    if (riskD.topBlindSpots?.length) {
      subHead("Top Blind Spots to Address");
      tableRows(
        [["Query", "Priority", "Score"],
         ...(riskD.topBlindSpots as any[]).map((b: any) => [b.query, b.priority, String((b.score ?? 0).toFixed(1))])],
        [110, 30, 24], margin, true, [255, 220, 220]
      );
    }
  }

  // ── Section 5: Gap Analysis ───────────────────────────────────────────────
  const gapD = reports.gapAnalysis?.details;
  if (gapD && reports.gapAnalysis?.available) {
    doc.addPage(); header(); yPos = contentTop;
    secHead("5 · AI vs Google Gap Analysis", 245, 158, 11);

    tableRows(
      [
        ["Band", "Count", "Description"],
        ["AI Risk", String(gapD.aiRisk ?? 0), "Google strong, AI weak — highest priority to fix"],
        ["Moderate Gap", String(gapD.moderateGap ?? 0), "Notable gap between channels"],
        ["Balanced", String(gapD.balanced ?? 0), "Performing similarly on both channels"],
        ["SEO Opportunity", String(gapD.seoOpportunity ?? 0), "AI strong, SEO weak"],
        ["SEO Failure", String(gapD.seoFailure ?? 0), "Weak on both channels"],
        ["Total Analyzed", String(gapD.totalQueries ?? 0), ""],
      ],
      [40, 28, 96], margin, true, [255, 245, 210]
    );

    if (gapD.topGaps?.length) {
      subHead("Top Gaps — Google Strong, AI Weak");
      tableRows(
        [["Query", "Band", "Google", "AI", "Gap"],
         ...(gapD.topGaps as any[]).map((g: any) => [
           g.query, g.band, String((g.googleScore ?? 0).toFixed(1)), String((g.aiScore ?? 0).toFixed(1)), String((g.gapScore ?? 0).toFixed(1))
         ])],
        [88, 28, 20, 16, 16], margin, true, [255, 245, 210]
      );
    }
  }

  // ── Section 6: Market Share ───────────────────────────────────────────────
  const mktD = reports.shareOfAttention?.details;
  if (mktD && reports.shareOfAttention?.available) {
    doc.addPage(); header(); yPos = contentTop;
    secHead("6 · Market Share of Attention", 99, 102, 241);

    tableRows(
      [
        ["Metric", "Value"],
        ["Market Share Score", `${mktD.marketShareScore}%`],
        ["AI Mention Share", `${mktD.aiMentionShare}%`],
        ["Weighted AI Share", `${mktD.weightedAIShare}%`],
        ["Organic Share", `${mktD.organicShare}%`],
        ["Total AI Queries", String(mktD.totalAIQueries ?? 0)],
        ["Total AI Mentions", String(mktD.totalAIMentions ?? 0)],
        ["AI Recommendation Share", `${mktD.aiRecommendationShare ?? 0}%`],
      ],
      [100, 60], margin, true, [230, 230, 255]
    );

    if (Array.isArray(mktD.engineBreakdown) && mktD.engineBreakdown.length) {
      subHead("Per AI Engine Breakdown");
      tableRows(
        [["Engine", "Mentions", "Total Queries", "Mention Share"],
         ...(mktD.engineBreakdown as any[]).map((e: any) => [
           e.label || e.engine, String(e.mentions ?? 0), String(e.totalQueries ?? 0), `${(e.mentionSharePct ?? 0).toFixed(1)}%`
         ])],
        [60, 30, 40, 40], margin, true, [230, 230, 255]
      );
    }
  }

  // ── Section 7: 12-Month Plan ───────────────────────────────────────────────
  if (annualPlan) {
    doc.addPage(); header(); yPos = contentTop;
    secHead("7 · 12-Month Strategic Plan", 16, 185, 129);

    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    kvRow("Current Position", annualPlan.currentPosition || "—");
    kvRow("12-Month Objective", annualPlan.twelveMonthObjective || "—");
    kvRow("Strategic Gap", annualPlan.strategicGap || "—");
    if (annualPlan.coreFocusAreas?.length) {
      kvRow("Core Focus Areas", annualPlan.coreFocusAreas.join(" · "));
    }
    yPos += 4;

    const QCOLORS: Record<string, [number, number, number]> = {
      Q1: [59, 130, 246],
      Q2: [34, 197, 94],
      Q3: [245, 158, 11],
      Q4: [139, 92, 246],
    };

    (annualPlan.quarters || []).forEach((q: any) => {
      const [r, g, b] = QCOLORS[q.quarter] || [100, 100, 100];

      // Quarter header — size dynamically to fit theme text
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      const themeLines = doc.splitTextToSize(`${q.quarter}: ${q.theme}`, cW - 8) as string[];
      const qHeadH = Math.max(11, themeLines.length * 7 + 5);
      yPos += 6;
      pageBreak(qHeadH + 4);
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, yPos, cW, qHeadH, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      themeLines.forEach((line, li) => {
        doc.text(line, margin + 4, yPos + 7 + li * 7);
      });
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      yPos += qHeadH + 4;

      if (q.description) {
        doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        wrap(q.description, margin + 2, cW - 4);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        yPos += 3;
      }

      if (q.items?.length) {
        const hR = Math.min(r + 30, 255), hG = Math.min(g + 30, 255), hB = Math.min(b + 30, 255);
        tableRows(
          [["#", "Action Item", "Category", "Channel", "Priority"],
           ...(q.items as any[]).map((item: any, i: number) => [
             String(i + 1), item.title, item.category || "—",
             (item.channel || "—").replace(/_/g, " "), item.priority || "—",
           ])],
          [10, 80, 40, 26, 18], margin, true, [hR, hG, hB]
        );

        // Item descriptions — each line properly wrapped
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        (q.items as any[]).forEach((item: any, i: number) => {
          if (item.description) {
            wrap(`${i + 1}. ${item.description}`, margin + 4, cW - 6, 4.5);
            yPos += 1.5;
          }
        });
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      }
      yPos += 6;
    });
  }

  // ── Section 8: Action Plans ───────────────────────────────────────────────
  if (actionPlans.length > 0) {
    doc.addPage(); header(); yPos = contentTop;
    secHead(`8 · Action Plans (${actionPlans.length})`, 107, 33, 168);

    actionPlans.forEach((plan, pi) => {
      // Plan title — dynamic height for long titles
      doc.setFontSize(9.5); doc.setFont("helvetica", "bold");
      const planTitleLines = doc.splitTextToSize(`${pi + 1}. ${plan.title}`, cW - 6) as string[];
      const planH = Math.max(10, planTitleLines.length * 7 + 4);
      yPos += 6;
      pageBreak(planH + 4);
      doc.setFillColor(245, 240, 255);
      doc.roundedRect(margin, yPos, cW, planH, 1.5, 1.5, "F");
      doc.setTextColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
      planTitleLines.forEach((line, li) => {
        doc.text(line, margin + 3, yPos + 6 + li * 7);
      });
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      yPos += planH + 4;

      doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
      wrap(`Objective: ${plan.objective}`, margin + 2, cW - 4, 4.5);
      yPos += 1.5;
      wrap(`Timeline: ${plan.timeline}  |  Priority: ${plan.priority}  |  Category: ${plan.category}`, margin + 2, cW - 4, 4.5);
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      yPos += 3;

      if (plan.steps?.length) {
        tableRows(
          [["#", "Step", "Priority", "Done"],
           ...(plan.steps as ActionStep[]).map((s, si) => [
             String(si + 1), s.step, s.priority, s.completed ? "✓" : "—",
           ])],
          [10, 115, 22, 17], margin, true, [235, 225, 255]
        );
      }
      yPos += 4;
    });
  }

  // ── Section 9: Business Development ───────────────────────────────────────
  if (businessDevMarkets.length > 0) {
    businessDevMarkets.forEach((m: any, mi: number) => {
      doc.addPage(); header(); yPos = contentTop;
      secHead(`9 · Business Development — ${m.country}`, 99, 102, 241);

      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
      doc.text(`Market: ${m.region || "Nationwide"}  |  Language: ${m.language_name}`, margin + 2, yPos);
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      yPos += 6;

      const strat = m.strategy;
      if (!strat) {
        doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.text("Strategy not yet generated", margin + 2, yPos);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        return;
      }

      // Summary & key metrics
      subHead("Strategic Summary");
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      wrap(strat.summary || "—", margin + 2, cW - 4, 4.5);
      yPos += 2;
      doc.setFont("helvetica", "bold"); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
      doc.text(`Priority: ${strat.priority || "—"}  |  Est. Reach: ${strat.estimatedReach || "—"}  |  Time to Market: ${strat.timeToMarket || "—"}`, margin + 2, yPos);
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      yPos += 6;

      if (strat.marketSizeEstimate) {
        subHead("Market Size Estimate");
        wrap(strat.marketSizeEstimate, margin + 2, cW - 4, 4.5);
        yPos += 2;
      }

      // Opportunities
      if (strat.opportunities?.length) {
        subHead("Opportunities");
        strat.opportunities.forEach((opp: string, oi: number) => {
          wrap(`${oi + 1}. ${opp}`, margin + 4, cW - 6, 4);
          yPos += 1;
        });
        yPos += 2;
      }

      // Key Channels
      if (strat.keyChannels?.length) {
        subHead("Key Channels");
        strat.keyChannels.forEach((ch: string) => {
          wrap(`• ${ch}`, margin + 4, cW - 6, 4);
          yPos += 1;
        });
        yPos += 2;
      }

      // Content Approach
      if (strat.contentApproach) {
        subHead("Content Approach");
        wrap(strat.contentApproach, margin + 2, cW - 4, 4.5);
        yPos += 2;
      }

      // Local SEO Tactics
      if (strat.localSEOTactics?.length) {
        subHead("Local SEO Tactics");
        strat.localSEOTactics.forEach((t: string) => {
          wrap(`• ${t}`, margin + 4, cW - 6, 4);
          yPos += 1;
        });
        yPos += 2;
      }

      // AI Visibility Tactics
      if (strat.aiVisibilityTactics?.length) {
        subHead("AI Visibility Tactics");
        strat.aiVisibilityTactics.forEach((t: string) => {
          wrap(`• ${t}`, margin + 4, cW - 6, 4);
          yPos += 1;
        });
        yPos += 2;
      }

      // Keyword Clusters
      if (strat.keywordClusters?.length) {
        subHead("Keyword Clusters");
        strat.keywordClusters.forEach((kc: any) => {
          pageBreak(14);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
          doc.text(`${kc.cluster} (${kc.intent || "—"})`, margin + 2, yPos);
          doc.setFont("helvetica", "normal");
          yPos += 5;
          const kwText = (kc.keywords || []).slice(0, 8).join(", ");
          wrap(kwText, margin + 4, cW - 6, 4);
          yPos += 2;
        });
        yPos += 2;
      }

      // Content Ideas
      if (strat.contentIdeas?.length) {
        subHead("Content Ideas");
        strat.contentIdeas.forEach((ci: any, ciIdx: number) => {
          pageBreak(12);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7);
          doc.text(`${ciIdx + 1}. [${ci.format || "—"}] ${ci.topic || "—"}`, margin + 2, yPos);
          doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
          doc.text(`Platform: ${ci.platform || "—"}${ci.angle ? `  |  ${ci.angle}` : ""}`, margin + 4, yPos + 4);
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          yPos += 8;
        });
        yPos += 2;
      }

      // Language Considerations
      if (strat.languageConsiderations) {
        subHead("Language Considerations");
        wrap(strat.languageConsiderations, margin + 2, cW - 4, 4.5);
        yPos += 2;
      }

      // Competitive Insights
      if (strat.competitiveInsights) {
        subHead("Competitive Insights");
        wrap(strat.competitiveInsights, margin + 2, cW - 4, 4.5);
        yPos += 2;
      }

      // KPI Targets
      if (strat.kpiTargets?.length) {
        subHead("KPI Targets");
        tableRows(
          [["Metric", "Target", "Timeframe"], ...(strat.kpiTargets as any[]).map((k: any) => [k.metric || "—", k.target || "—", k.timeframe || "—"])],
          [90, 45, 39], margin, true, [235, 225, 255]
        );
      }
    });
  }

  // ── Patch all footers ─────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    footer(i, totalPages);
  }

  const safeName = (project.name || "Brand").replace(/[^a-z0-9]/gi, "-").slice(0, 30);
  doc.save(`georepute-client-file-${safeName}.pdf`);
}

export async function exportPlanToPDF(plan: ActionPlan): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm for A4
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm for A4
  const margin = 25;                                    // 25mm on each side
  const rightEdge = pageWidth - margin;                 // hard right boundary
  const contentWidth = rightEdge - margin;              // 160mm usable width
  const lineHeight = 5;

  // Letterhead: same as AI Visibility reports
  const HEADER_HEIGHT = 18;
  const FOOTER_HEIGHT = 14;
  const contentTop = margin + HEADER_HEIGHT;
  const contentBottom = pageHeight - FOOTER_HEIGHT;

  const geoReputeLogoData = await loadGeoReputeLogo();

  const addPageHeader = () => {
    doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
    doc.rect(0, 0, pageWidth, 14, "F");
    if (geoReputeLogoData) {
      try {
        doc.addImage(geoReputeLogoData, "PNG", margin, 2.5, 9, 9);
      } catch {
        /* ignore */
      }
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("GEORepute.ai", geoReputeLogoData ? margin + 11 : margin, 8.5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("AI Visibility Intelligence Platform", pageWidth - margin, 8.5, { align: "right" });
    doc.setDrawColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
    doc.setLineWidth(0.5);
    doc.line(0, 14, pageWidth, 14);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  };

  const addPageFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10;
    doc.setDrawColor(GRAY_400.r, GRAY_400.g, GRAY_400.b);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    doc.text("Confidential - Generated by GEORepute.ai", margin, footerY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: "center" });
    doc.text(
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      pageWidth - margin,
      footerY,
      { align: "right" }
    );
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  };

  const checkPageBreak = (required: number) => {
    if (yPos + required > contentBottom) {
      doc.addPage();
      addPageHeader();
      yPos = contentTop;
    }
  };

  /**
   * Print text, split into lines that fit within maxWidth.
   * Each line starts at x (left margin) and cannot exceed rightEdge.
   * Handles page breaks automatically.
   */
  const printWrapped = (
    text: string,
    x: number,
    maxWidth: number,
    lh: number = lineHeight
  ) => {
    // Clamp maxWidth so text never bleeds past the right margin
    const safeWidth = Math.min(maxWidth, rightEdge - x);
    const lines: string[] = doc.splitTextToSize(text || "—", safeWidth);
    lines.forEach((line: string) => {
      checkPageBreak(lh);
      // maxWidth in doc.text acts as a hard clip — double protection
      doc.text(line, x, yPos, { maxWidth: safeWidth });
      yPos += lh;
    });
  };

  addPageHeader();
  let yPos = contentTop;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  printWrapped(plan.title, margin, contentWidth, 7);
  yPos += 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
  const metaParts: string[] = [
    `Generated: ${format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}`,
    plan.projectName && `Project: ${plan.projectName}`,
    plan.domain && `Domain: ${plan.domain}`,
  ].filter(Boolean) as string[];
  printWrapped(metaParts.join("  |  "), margin, contentWidth, 4.5);
  yPos += 4;

  const completed = plan.steps.filter((s) => s.completed).length;
  const total = plan.steps.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Executive Summary
  checkPageBreak(14);
  doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
  doc.roundedRect(margin, yPos - 1, contentWidth, 8, 1.5, 1.5, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Executive Summary", margin + 4, yPos + 5);
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  yPos += 11;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  checkPageBreak(lineHeight);
  doc.text("Objective", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  printWrapped(plan.objective || "—", margin, contentWidth);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  printWrapped(
    `Timeline: ${plan.timeline}  |  Category: ${plan.category}  |  Priority: ${plan.priority}`,
    margin,
    contentWidth,
    5
  );
  checkPageBreak(lineHeight);
  doc.text(`Progress: ${completed}/${total} steps (${completionRate}%)`, margin, yPos);
  yPos += 8;

  // Strategic Reasoning
  if (plan.reasoning) {
    checkPageBreak(14);
    doc.setFillColor(AMBER.r, AMBER.g, AMBER.b);
    doc.roundedRect(margin, yPos - 1, contentWidth, 8, 1.5, 1.5, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Strategic Reasoning", margin + 4, yPos + 5);
    doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
    yPos += 11;

    doc.setFont("helvetica", "normal");
    printWrapped(plan.reasoning, margin, contentWidth);
    yPos += 4;
  }

  if (plan.expectedOutcome) {
    doc.setFont("helvetica", "bold");
    checkPageBreak(lineHeight);
    doc.text("Expected Outcome", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    printWrapped(plan.expectedOutcome, margin, contentWidth);
    yPos += 8;
  }

  // Charts
  const priorityData = [
    { name: "High", value: plan.steps.filter((s) => s.priority === "high").length },
    { name: "Medium", value: plan.steps.filter((s) => s.priority === "medium").length },
    { name: "Low", value: plan.steps.filter((s) => s.priority === "low").length },
  ].filter((d) => d.value > 0);

  if (priorityData.length > 0) {
    checkPageBreak(65);
    const chartImage = await createChartImage(
      "pie",
      priorityData,
      priorityData.map((d) => d.name),
      "Step Priority Distribution",
      500,
      300
    );
    if (chartImage) {
      doc.addImage(chartImage, "PNG", margin, yPos, contentWidth, 55);
      yPos += 60;
    }
  }

  const channelMap: Record<string, number> = {};
  plan.steps.forEach((s) => {
    const key = s.channel || s.platform || "General";
    channelMap[key] = (channelMap[key] || 0) + 1;
  });
  const channelEntries = Object.entries(channelMap);
  if (channelEntries.length > 0) {
    const channelData = channelEntries.map(([name, value]) => ({ name, value }));
    const channelLabels = channelData.map((d) => d.name.replace(/_/g, " "));
    checkPageBreak(65);
    const chartImage = await createChartImage(
      "bar",
      channelData.map((d) => d.value),
      channelLabels,
      "Steps by Channel / Platform",
      500,
      300
    );
    if (chartImage) {
      doc.addImage(chartImage, "PNG", margin, yPos, contentWidth, 55);
      yPos += 60;
    }
  }

  // Action Steps
  checkPageBreak(14);
  doc.setFillColor(GREEN.r, GREEN.g, GREEN.b);
  doc.roundedRect(margin, yPos - 1, contentWidth, 8, 1.5, 1.5, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`Action Steps (${completed}/${total} completed)`, margin + 4, yPos + 5);
  doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
  yPos += 11;

  const stepContentWidth = contentWidth - 4;
  plan.steps.forEach((step, i) => {
    checkPageBreak(12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(step.completed ? GREEN.r : GRAY_700.r, step.completed ? GREEN.g : GRAY_700.g, step.completed ? GREEN.b : GRAY_700.b);
    const stepTitle = `${i + 1}. ${step.step}`;
    const titleLines = doc.splitTextToSize(stepTitle, stepContentWidth);
    titleLines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      doc.text(line, margin + 4, yPos);
      yPos += lineHeight;
    });
    yPos += 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
    printWrapped(step.description || "", margin + 4, stepContentWidth, 4);
    printWrapped(
      `Priority: ${step.priority}  |  Impact: ${step.estimatedImpact}`,
      margin + 4,
      stepContentWidth,
      4.5
    );
    yPos += 3;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(i, totalPages);
  }

  doc.save(`business-plan-${plan.title.replace(/[^a-z0-9]/gi, "-").slice(0, 40)}.pdf`);
}

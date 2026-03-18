import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 360;

function buildChartConfig(
  chartType: "bar" | "line" | "pie" | "doughnut",
  labels: string[],
  datasets: { label: string; data: number[] }[],
  rtl: boolean = false
) {
  const colors = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  ];
  const labelsFinal = rtl ? [...labels].reverse() : labels;
  const datasetsReversed = rtl
    ? datasets.map((ds) => ({ ...ds, data: [...(ds.data ?? [])].reverse() }))
    : datasets;
  const datasetsFormatted =
    chartType === "pie" || chartType === "doughnut"
      ? [
          {
            data: datasetsReversed[0]?.data ?? [],
            backgroundColor: labelsFinal.map((_, i) => colors[i % colors.length]),
            borderColor: "#fff",
            borderWidth: 1,
          },
        ]
      : datasetsReversed.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: colors[i % colors.length],
          borderColor: colors[i % colors.length],
          borderWidth: 1,
          fill: chartType === "line",
        }));

  return {
    type: chartType,
    data: {
      labels: labelsFinal,
      datasets: datasetsFormatted,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: rtl ? "right" : "top" },
      },
      scales:
        chartType === "bar" || chartType === "line"
          ? {
              y: { beginAtZero: true },
              x: rtl ? { reverse: true } : undefined,
            }
          : undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      chartType,
      labels,
      datasets,
      language,
    } = body as {
      chartType?: "bar" | "line" | "pie" | "doughnut";
      labels?: string[];
      datasets?: { label: string; data: number[] }[];
      language?: string;
    };
    const rtl = language === "he" || language === "ar";

    if (
      !chartType ||
      !Array.isArray(labels) ||
      !Array.isArray(datasets) ||
      datasets.length === 0
    ) {
      return NextResponse.json(
        { error: "chartType, labels, and datasets (non-empty) are required" },
        { status: 400 }
      );
    }

    const chartConfig = buildChartConfig(chartType, labels, datasets, rtl);
    const quickchartBody = {
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      format: "png",
      backgroundColor: "white",
      chart: chartConfig,
    };

    const qcRes = await fetch("https://quickchart.io/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickchartBody),
    });

    if (!qcRes.ok) {
      const errText = await qcRes.text();
      console.error("QuickChart error:", qcRes.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: "Chart image generation failed", details: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const imageBuffer = Buffer.from(await qcRes.arrayBuffer());
    const fileName = `${user.id}/blog-chart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("platform-content-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Chart upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload chart image" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("platform-content-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("chart-image error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

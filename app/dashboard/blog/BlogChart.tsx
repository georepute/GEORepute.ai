"use client";

import { useEffect, useRef } from "react";

type ChartType = "bar" | "line" | "pie" | "doughnut";

interface BlogChartProps {
  chartType: ChartType;
  labels: string[];
  datasets: { label: string; data: number[] }[];
  heading?: string;
  caption?: string;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
];

export function BlogChart({ chartType, labels, datasets, heading, caption }: BlogChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;

    import("chart.js/auto").then(({ default: Chart }) => {
      if (!canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const isPie = chartType === "pie" || chartType === "doughnut";
      const datasetsFormatted = isPie
        ? [{
            data: datasets[0]?.data ?? [],
            backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
            borderColor: "#fff",
            borderWidth: 1,
          }]
        : datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: COLORS[i % COLORS.length],
            borderColor: COLORS[i % COLORS.length],
            borderWidth: 1,
            fill: chartType === "line",
          }));

      chartRef.current = new Chart(canvasRef.current, {
        type: chartType,
        data: { labels, datasets: datasetsFormatted },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 16 / 9,
          plugins: { legend: { position: "top" } },
          scales: (chartType === "bar" || chartType === "line")
            ? { y: { beginAtZero: true } }
            : undefined,
        },
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartType, labels, datasets]);

  return (
    <figure className="my-6">
      {heading && (
        <figcaption className="text-lg font-semibold text-gray-900 mb-2">
          {heading}
        </figcaption>
      )}
      <div className="relative w-full" style={{ maxWidth: 640, height: 360 }}>
        <canvas ref={canvasRef} />
      </div>
      {caption && (
        <figcaption className="text-sm text-gray-500 mt-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

"use client";

import type { StoryStage } from "@/types/stories";

interface StageSummaryPreviewProps {
  stage: StoryStage;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPreviewContent(stage: StoryStage): { label: string; value: string; sub?: string } {
  const firstSubstep = stage.substeps[0];
  if (!firstSubstep) return { label: stage.label, value: "No data" };

  const data = firstSubstep.data;

  switch (stage.slug) {
    case "estimate": {
      const total = (data.total as number) || 0;
      const status = (data.status as string) || "";
      return {
        label: "Total Estimate",
        value: formatCurrency(total),
        sub: status ? status.charAt(0).toUpperCase() + status.slice(1) : undefined,
      };
    }
    case "crew": {
      const count = (data.totalCrew as number) || (data.crewCount as number) || 0;
      const summary = (data.summary as string) || "";
      return {
        label: "Crew Assigned",
        value: `${count}`,
        sub: summary || `${count} member${count !== 1 ? "s" : ""}`,
      };
    }
    case "daily_logs": {
      const count = stage.substeps.length;
      const latestDate = (data.date as string) || "";
      return {
        label: "Daily Logs",
        value: `${count}`,
        sub: latestDate ? `Latest: ${new Date(latestDate).toLocaleDateString()}` : `${count} entr${count !== 1 ? "ies" : "y"}`,
      };
    }
    case "completion": {
      if (firstSubstep.type === "photo_grid") {
        const photos = (data.photos as unknown[]) || [];
        return {
          label: "Project Photos",
          value: `${photos.length}`,
          sub: `${photos.length} photo${photos.length !== 1 ? "s" : ""}`,
        };
      }
      const margin = (data.profitMargin as number) || 0;
      return {
        label: "Completion",
        value: `${margin.toFixed(1)}%`,
        sub: "Profit margin",
      };
    }
    case "invoicing": {
      const total = (data.totalInvoiced as number) || 0;
      const paidPct = (data.paidPercentage as number) || 0;
      return {
        label: "Invoiced",
        value: formatCurrency(total),
        sub: `${paidPct.toFixed(0)}% collected`,
      };
    }
    default:
      return { label: stage.label, value: `${stage.substeps.length} items` };
  }
}

export function StageSummaryPreview({ stage }: StageSummaryPreviewProps) {
  const preview = getPreviewContent(stage);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">
        {preview.label}
      </p>
      <p className="text-white text-2xl font-bold tracking-tight">
        {preview.value}
      </p>
      {preview.sub && (
        <p className="text-white/60 text-xs mt-1">{preview.sub}</p>
      )}
    </div>
  );
}

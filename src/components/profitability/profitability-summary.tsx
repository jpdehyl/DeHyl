"use client";

import { DollarSign, TrendingDown, TrendingUp, Percent } from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import type { ProfitabilitySummary } from "@/types";

interface ProfitabilitySummaryCardsProps {
  summary: ProfitabilitySummary;
}

export function ProfitabilitySummaryCards({ summary }: ProfitabilitySummaryCardsProps) {
  const profitVariant = summary.totalProfit >= 0 ? "success" : "danger";
  const marginVariant =
    summary.avgProfitMargin >= 30
      ? "success"
      : summary.avgProfitMargin >= 20
      ? "warning"
      : "danger";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Revenue"
        value={summary.totalRevenue}
        icon={DollarSign}
        format="currency"
        variant="default"
        subtitle="All invoiced amounts"
      />
      <KPICard
        title="Total Costs"
        value={summary.totalCosts}
        icon={TrendingDown}
        format="currency"
        variant="warning"
        subtitle="All bill amounts"
      />
      <KPICard
        title="Gross Profit"
        value={summary.totalProfit}
        icon={TrendingUp}
        format="currency"
        variant={profitVariant}
        subtitle="Revenue minus costs"
      />
      <MarginCard
        title="Avg Profit Margin"
        value={summary.avgProfitMargin}
        variant={marginVariant}
        bestProject={summary.mostProfitableProject}
        worstProject={summary.leastProfitableProject}
      />
    </div>
  );
}

interface MarginCardProps {
  title: string;
  value: number;
  variant: "success" | "warning" | "danger";
  bestProject: string;
  worstProject: string;
}

function MarginCard({ title, value, variant, bestProject, worstProject }: MarginCardProps) {
  const variantStyles = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  const iconBgStyles = {
    success: "bg-success/10",
    warning: "bg-warning/10",
    danger: "bg-destructive/10",
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}%</p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              Best: <span className="text-success font-mono">{bestProject}</span>
            </p>
            <p>
              Worst: <span className="text-destructive font-mono">{worstProject}</span>
            </p>
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBgStyles[variant]}`}>
          <Percent className={`h-6 w-6 ${variantStyles[variant]}`} />
        </div>
      </div>
    </div>
  );
}

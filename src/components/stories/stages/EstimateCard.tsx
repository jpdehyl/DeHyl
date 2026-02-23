"use client";

import { motion } from "framer-motion";
import type { StorySubstep, StoryStage } from "@/types/stories";
import { cn, formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "../widgets/AnimatedCounter";
import { MiniBarChart } from "../widgets/MiniBarChart";
import { StatusPill } from "../widgets/StatusPill";

interface EstimateCardProps {
  substep: StorySubstep;
  stage: StoryStage;
}

export function EstimateCard({ substep }: EstimateCardProps) {
  if (substep.type === "metric") {
    return <EstimateMetricView substep={substep} />;
  }

  if (substep.type === "chart") {
    return <EstimateChartView substep={substep} />;
  }

  // Fallback for unknown substep types
  return (
    <div className="flex items-center justify-center h-full text-white/60">
      <p className="text-sm">{substep.title}</p>
    </div>
  );
}

// -----------------------------------------------
// Metric view: total amount, status, estimate name
// -----------------------------------------------
function EstimateMetricView({ substep }: { substep: StorySubstep }) {
  const {
    totalAmount,
    status,
    name,
  } = substep.data as {
    totalAmount: number;
    status: string;
    name: string;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* Estimate name */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Estimate
        </p>
        {name && (
          <h2 className="text-lg font-semibold text-white/90 mt-1 px-4 line-clamp-2">
            {name}
          </h2>
        )}
      </motion.div>

      {/* Big animated total */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
        className="text-center"
      >
        <div className="text-5xl font-black text-white leading-none">
          <AnimatedCounter
            value={totalAmount ?? 0}
            formatter={formatCurrency}
          />
        </div>
      </motion.div>

      {/* Status pill */}
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <StatusPill status={status} />
        </motion.div>
      )}
    </div>
  );
}

// -----------------------------------------------
// Chart view: category breakdown bar chart
// -----------------------------------------------
function EstimateChartView({ substep }: { substep: StorySubstep }) {
  const {
    categoryTotals,
    lineItemCount,
  } = substep.data as {
    categoryTotals: Record<string, number>;
    lineItemCount: number;
  };

  const categories = (categoryTotals ?? {}) as Record<string, number>;
  const entries = Object.entries(categories).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, val]) => sum + val, 0);

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto pb-4 scrollbar-none">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Cost Breakdown
        </p>
        {lineItemCount != null && (
          <p className="text-white/40 text-xs mt-1">
            {lineItemCount} line items
          </p>
        )}
      </motion.div>

      {/* Total */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="text-center"
      >
        <p className="text-3xl font-bold text-white">
          {formatCurrency(total)}
        </p>
      </motion.div>

      {/* Mini bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <MiniBarChart data={categories} total={total} />
      </motion.div>

      {/* Category list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="space-y-2"
      >
        {entries.map(([category, amount], i) => {
          const percentage = total > 0 ? (amount / total) * 100 : 0;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.15 + i * 0.04 }}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: getBarColor(i),
                  }}
                />
                <span className="text-sm text-white/80 truncate">
                  {category}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-xs text-white/40">
                  {percentage.toFixed(0)}%
                </span>
                <span className="text-sm font-medium text-white/90">
                  {formatCurrency(amount)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// Consistent color palette for chart bars
function getBarColor(index: number): string {
  const colors = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#e11d48", // rose
  ];
  return colors[index % colors.length];
}

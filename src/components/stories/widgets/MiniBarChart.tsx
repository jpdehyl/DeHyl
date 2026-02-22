"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarData[] | Record<string, number>;
  total?: number;
  className?: string;
}

const BAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1",
];

export function MiniBarChart({ data, total, className }: MiniBarChartProps) {
  // Normalize to BarData[]
  const items: BarData[] = Array.isArray(data)
    ? data
    : Object.entries(data).map(([label, value], i) => ({
        label,
        value,
        color: BAR_COLORS[i % BAR_COLORS.length],
      }));

  const maxValue = total ?? Math.max(...items.map((d) => d.value), 1);

  return (
    <div className={cn("flex flex-col gap-2.5 w-full", className)}>
      {items.map((item, index) => {
        const widthPercent = (item.value / maxValue) * 100;

        return (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <span className="text-white/70 text-xs font-medium w-20 shrink-0 truncate text-right capitalize">
              {item.label}
            </span>

            <div className="flex-1 h-5 rounded-full bg-white/10 overflow-hidden relative">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: item.color || BAR_COLORS[index % BAR_COLORS.length],
                }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              />
            </div>

            <motion.span
              className="text-white/90 text-xs font-semibold tabular-nums w-16 shrink-0 text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
            >
              {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(item.value)}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}

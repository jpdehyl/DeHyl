import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  suffix?: string;
  icon?: ReactNode;
  formatter?: (value: number) => string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  sublabel,
  suffix,
  icon,
  formatter,
  className,
}: MetricCardProps) {
  const displayValue =
    formatter && typeof value === "number"
      ? formatter(value)
      : suffix
      ? `${value} ${suffix}`
      : value;

  return (
    <div
      className={cn(
        "rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm",
        "px-4 py-3 flex items-start gap-3",
        className
      )}
    >
      {icon && (
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-white/80 shrink-0 mt-0.5 text-lg">
          {icon}
        </div>
      )}

      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/50 leading-tight">
          {label}
        </span>
        <span className="text-xl font-bold text-white leading-tight mt-0.5 tabular-nums truncate">
          {displayValue}
        </span>
        {sublabel && (
          <span className="text-xs text-white/40 leading-tight mt-0.5 truncate">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

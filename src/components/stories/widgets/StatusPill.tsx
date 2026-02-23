import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  // Green statuses
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  closed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",

  // Red statuses
  overdue: "bg-red-500/20 text-red-300 border-red-500/30",
  expired: "bg-red-500/20 text-red-300 border-red-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",

  // Amber statuses
  draft: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  review: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  open: "bg-amber-500/20 text-amber-300 border-amber-500/30",

  // Blue statuses
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  processing: "bg-blue-500/20 text-blue-300 border-blue-500/30",

  // Purple statuses
  scheduled: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  planned: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const DEFAULT_COLOR = "bg-white/10 text-white/70 border-white/20";

export function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
  const colorClasses = STATUS_COLORS[normalized] || DEFAULT_COLOR;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-xs font-semibold border",
        colorClasses,
        className
      )}
    >
      {status}
    </span>
  );
}

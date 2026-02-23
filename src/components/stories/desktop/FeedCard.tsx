"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingDown,
  Receipt,
  Clock,
  FileText,
  Camera,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Gavel,
  Users,
  Inbox,
  BookOpen,
  CircleDot,
} from "lucide-react";
import type { FeedCard as FeedCardType, FeedPriority, FeedCardType as CardType } from "@/types/stories";

interface FeedCardProps {
  card: FeedCardType;
}

const PRIORITY_STYLES: Record<FeedPriority, { border: string; badge: string; badgeLabel: string }> = {
  critical: {
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    badgeLabel: "Urgent",
  },
  high: {
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    badgeLabel: "Attention",
  },
  medium: {
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    badgeLabel: "Update",
  },
  info: {
    border: "border-l-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
    badgeLabel: "Info",
  },
};

const CARD_ICONS: Partial<Record<CardType, React.ComponentType<{ className?: string }>>> = {
  overdue_invoice: AlertTriangle,
  negative_profit: TrendingDown,
  bill_due_soon: Receipt,
  aging_receivable: Clock,
  stalled_project: Clock,
  missing_estimate: FileText,
  unassigned_invoice: Inbox,
  daily_log: BookOpen,
  new_photos: Camera,
  cost_entry: DollarSign,
  safety_checklist: ShieldCheck,
  project_progress: BarChart3,
  upcoming_bid: Gavel,
  crew_change: Users,
  bid_update: Gavel,
  invoice_activity: Receipt,
  match_suggestion: CircleDot,
};

function getRelativeTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function FeedCard({ card }: FeedCardProps) {
  const router = useRouter();
  const style = PRIORITY_STYLES[card.priority];
  const Icon = CARD_ICONS[card.type];

  return (
    <Card
      className={cn(
        "border-l-4 cursor-pointer transition-all duration-150 hover:shadow-md hover:bg-accent/50",
        style.border
      )}
      onClick={() => router.push(card.actionUrl)}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        {Icon && (
          <div className="shrink-0 mt-0.5">
            <Icon
              className={cn(
                "h-5 w-5",
                card.priority === "critical" && "text-red-500",
                card.priority === "high" && "text-amber-500",
                card.priority === "medium" && "text-blue-500",
                card.priority === "info" && "text-slate-400"
              )}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm leading-tight truncate">{card.title}</h4>
            <Badge className={cn("text-[10px] shrink-0 px-1.5 py-0 font-normal", style.badge)} variant="secondary">
              {style.badgeLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {card.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {card.projectCode && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {card.projectCode}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {getRelativeTimestamp(card.timestamp)}
            </span>
            <span className="text-[10px] text-primary font-medium ml-auto">
              {card.actionLabel} &rarr;
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

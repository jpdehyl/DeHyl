"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign } from "lucide-react";
import type { UpcomingProject } from "@/types/stories";

interface UpcomingProjectCardProps {
  project: UpcomingProject;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400";
    case "submitted":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getDueDateLabel(dueDate: string | null): { label: string; urgent: boolean } {
  if (!dueDate) return { label: "No deadline", urgent: false };
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, urgent: true };
  if (diffDays === 0) return { label: "Due today", urgent: true };
  if (diffDays <= 3) return { label: `Due in ${diffDays}d`, urgent: true };
  if (diffDays <= 7) return { label: `Due in ${diffDays}d`, urgent: false };
  return {
    label: due.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    urgent: false,
  };
}

export function UpcomingProjectCard({ project }: UpcomingProjectCardProps) {
  const { label: dueLabel, urgent } = getDueDateLabel(project.dueDate);

  return (
    <Card
      className={cn(
        "border-dashed border-2 p-4 min-w-[220px] shrink-0 transition-all hover:border-primary/50 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge className={cn("text-[10px]", getStatusColor(project.status))} variant="secondary">
          {project.status}
        </Badge>
        {project.clientCode && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {project.clientCode}
          </span>
        )}
      </div>

      <h4 className="font-semibold text-sm truncate mb-2">{project.name}</h4>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className={cn("h-3 w-3 shrink-0", urgent && "text-red-500")} />
          <span className={cn(urgent && "text-red-500 font-medium")}>{dueLabel}</span>
        </div>

        {project.estimatedValue && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3 shrink-0" />
            <span>Est: ${project.estimatedValue.toLocaleString()}</span>
          </div>
        )}

        {project.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

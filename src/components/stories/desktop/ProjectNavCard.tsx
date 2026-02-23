"use client";

import { cn } from "@/lib/utils";
import type { ProjectStorySummary } from "@/types/stories";

interface ProjectNavCardProps {
  project: ProjectStorySummary;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

// Map stage names to progress percentage
const STAGE_PROGRESS: Record<string, number> = {
  "Genesis": 10,
  "Estimate": 15,
  "Assembly": 25,
  "Crew": 30,
  "Pre-Planning": 35,
  "In Progress": 50,
  "Daily Logs": 60,
  "Execution": 65,
  "Completion": 85,
  "Invoicing": 95,
  "Settlement": 100,
  "Completed": 100,
  "Closed": 100,
};

function getProgress(stageName: string, status: string): number {
  if (status === "closed") return 100;
  return STAGE_PROGRESS[stageName] || 50;
}

function getProgressColor(progress: number): string {
  if (progress === 100) return "bg-emerald-500";
  if (progress >= 75) return "bg-blue-500";
  if (progress >= 50) return "bg-amber-500";
  return "bg-slate-400";
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function ProjectNavCard({
  project,
  isSelected,
  onSelect,
  compact = false,
}: ProjectNavCardProps) {
  const progress = getProgress(project.currentStageName, project.status);
  const progressColor = getProgressColor(progress);

  if (compact) {
    // Compact version for completed projects
    return (
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg transition-all",
          "hover:bg-accent",
          isSelected && "bg-accent ring-1 ring-primary"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {project.projectCode}
          </span>
          <span className="text-sm truncate flex-1">{project.projectName}</span>
          <span className="text-[10px] text-muted-foreground">
            {project.clientCode}
          </span>
        </div>
      </button>
    );
  }

  // Full card for active projects
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:border-primary/50 hover:shadow-sm",
        isSelected
          ? "border-primary bg-accent shadow-sm"
          : "border-border bg-card"
      )}
    >
      {/* Header: Code + Client */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono font-medium">{project.projectCode}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {project.clientCode}
        </span>
      </div>

      {/* Project name */}
      <p className="text-sm font-medium truncate mb-2">{project.projectName}</p>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", progressColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer: Stage + Date */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {project.status === "active" && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          {project.currentStageName}
        </span>
        <span>{formatDate(project.lastUpdated)}</span>
      </div>
    </button>
  );
}

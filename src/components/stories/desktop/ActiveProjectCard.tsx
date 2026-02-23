"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, Clock } from "lucide-react";
import type { ProjectStorySummary } from "@/types/stories";

interface ActiveProjectCardProps {
  project: ProjectStorySummary;
  isSelected: boolean;
  onSelect: () => void;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(date).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function ActiveProjectCard({ project, isSelected, onSelect }: ActiveProjectCardProps) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-all duration-200 overflow-hidden group",
        "hover:shadow-lg hover:scale-[1.02]",
        isSelected
          ? "ring-2 ring-primary shadow-lg"
          : "hover:ring-1 hover:ring-primary/50"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.projectName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Folder className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          </div>
        )}
        {/* Project code overlay */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 text-xs font-mono font-medium bg-black/60 text-white rounded">
            {project.projectCode}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate mb-1 group-hover:text-primary transition-colors">
          {project.projectName}
        </h3>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            {project.clientCode}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {project.clientName}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {project.currentStageName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getRelativeTime(project.lastUpdated)}
          </span>
        </div>
      </div>
    </Card>
  );
}

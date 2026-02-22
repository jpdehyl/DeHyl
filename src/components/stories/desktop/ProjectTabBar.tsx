"use client";

import { cn } from "@/lib/utils";
import type { ProjectStorySummary } from "@/types/stories";

interface ProjectTabBarProps {
  projects: ProjectStorySummary[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

function getProjectDotColor(clientCode: string): string {
  const colors: Record<string, string> = {
    CD: "bg-blue-500",
    ADR: "bg-emerald-500",
    "R&S": "bg-amber-500",
  };
  return colors[clientCode] || "bg-purple-500";
}

export function ProjectTabBar({
  projects,
  currentProjectId,
  onSelectProject,
}: ProjectTabBarProps) {
  if (projects.length === 0) return null;

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide rounded-lg bg-muted p-1">
      {projects.map((project) => {
        const isActive = project.projectId === currentProjectId;
        const dotColor = getProjectDotColor(project.clientCode);

        return (
          <button
            key={project.projectId}
            onClick={() => onSelectProject(project.projectId)}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
            <span>{project.projectCode || project.clientCode}</span>
            <span className="text-xs text-muted-foreground hidden xl:inline truncate max-w-[120px]">
              {project.projectName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

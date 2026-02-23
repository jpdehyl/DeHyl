"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { ProjectStorySummary } from "@/types/stories";

interface StoryBubblesProps {
  projects: ProjectStorySummary[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

function getProjectInitials(code: string, name: string): string {
  if (code) return code.slice(-3);
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getProjectColor(clientCode: string): string {
  const colors: Record<string, string> = {
    CD: "from-blue-500 to-blue-700",
    ADR: "from-emerald-500 to-emerald-700",
    "R&S": "from-amber-500 to-amber-700",
  };
  return colors[clientCode] || "from-purple-500 to-purple-700";
}

export function StoryBubbles({
  projects,
  currentProjectId,
  onSelectProject,
}: StoryBubblesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (projects.length === 0) return null;

  return (
    <div className="w-full bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div
        ref={scrollRef}
        className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {projects.map((project) => {
          const isActive = project.projectId === currentProjectId;
          const initials = getProjectInitials(project.projectCode, project.projectName);
          const gradientColor = getProjectColor(project.clientCode);

          return (
            <button
              key={project.projectId}
              onClick={() => onSelectProject(project.projectId)}
              className="flex flex-col items-center gap-1.5 shrink-0"
              style={{ scrollSnapAlign: "center" }}
              data-no-tap
            >
              {/* Avatar ring */}
              <div
                className={cn(
                  "rounded-full p-[2.5px] transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-br from-primary to-primary/70 scale-110"
                    : "bg-gradient-to-br from-muted-foreground/30 to-muted-foreground/10"
                )}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br",
                    gradientColor,
                    "ring-2 ring-background"
                  )}
                >
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.projectName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </div>
              {/* Label */}
              <span
                className={cn(
                  "text-[10px] max-w-[60px] truncate",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {project.projectCode || project.clientCode}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

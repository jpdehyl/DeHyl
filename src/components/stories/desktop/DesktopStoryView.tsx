"use client";

import { useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { NarrativeStoryView } from "./NarrativeStoryView";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { ProjectStorySummary } from "@/types/stories";

interface DesktopStoryViewProps {
  projects: ProjectStorySummary[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

export function DesktopStoryView({
  projects,
  currentProjectId,
  onSelectProject,
}: DesktopStoryViewProps) {
  const router = useRouter();
  const { stories, isLoading, feedCards, feedLoading } = useStoryStore();

  const story = currentProjectId ? stories.get(currentProjectId) : undefined;

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects]
  );
  const closedProjects = useMemo(
    () => projects.filter((p) => p.status === "closed"),
    [projects]
  );

  const urgentItems = useMemo(
    () => feedCards.filter((c) => c.priority === "critical" || c.priority === "high"),
    [feedCards]
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            Stories
          </h1>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The life of each project, told chapter by chapter.
        </p>
      </header>

      {urgentItems.length > 0 && !feedLoading && (
        <div className="mb-10 border-l-2 border-amber-400 pl-4 py-1">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
            Needs attention
          </p>
          <div className="space-y-1.5">
            {urgentItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.actionUrl)}
                className="block text-left w-full group"
              >
                <p className="text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                  {item.title}
                  {item.projectCode && (
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {item.projectCode}
                    </span>
                  )}
                </p>
              </button>
            ))}
            {urgentItems.length > 4 && (
              <p className="text-xs text-muted-foreground">
                +{urgentItems.length - 4} more
              </p>
            )}
          </div>
        </div>
      )}

      <nav className="mb-10">
        {activeProjects.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Active Projects
            </p>
            <div className="flex flex-wrap gap-2">
              {activeProjects.map((p) => (
                <button
                  key={p.projectId}
                  onClick={() => onSelectProject(p.projectId)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    currentProjectId === p.projectId
                      ? "bg-foreground text-background font-medium"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {p.projectCode}
                </button>
              ))}
            </div>
          </div>
        )}
        {closedProjects.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Completed
            </p>
            <div className="flex flex-wrap gap-2">
              {closedProjects.map((p) => (
                <button
                  key={p.projectId}
                  onClick={() => onSelectProject(p.projectId)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    currentProjectId === p.projectId
                      ? "bg-foreground text-background font-medium"
                      : "bg-muted/50 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {p.projectCode}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t pt-10">
        {isLoading && !story ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          </div>
        ) : story ? (
          <NarrativeStoryView story={story} />
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">
              Select a project above to read its story.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

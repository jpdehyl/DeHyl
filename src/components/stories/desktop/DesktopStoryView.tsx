"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { NarrativeStoryView } from "./NarrativeStoryView";
import { ActiveProjectCard } from "./ActiveProjectCard";
import { CompletedProjectsList } from "./CompletedProjectsList";
import { ArrowLeft, Loader2, FolderOpen } from "lucide-react";
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
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <header className="mb-8">
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

      {/* Needs Attention */}
      {urgentItems.length > 0 && !feedLoading && (
        <div className="mb-8 border-l-2 border-amber-400 pl-4 py-1">
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

      {/* Active Projects - Featured Cards */}
      {activeProjects.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Active Projects
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {activeProjects.map((project) => (
              <ActiveProjectCard
                key={project.projectId}
                project={project}
                isSelected={currentProjectId === project.projectId}
                onSelect={() => onSelectProject(project.projectId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* No active projects message */}
      {activeProjects.length === 0 && projects.length > 0 && (
        <div className="mb-8 p-6 border border-dashed rounded-lg text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No active projects right now
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Select a completed project below to view its story
          </p>
        </div>
      )}

      {/* Completed Projects - Compact List */}
      <CompletedProjectsList
        projects={closedProjects}
        selectedProjectId={currentProjectId}
        onSelectProject={onSelectProject}
      />

      {/* Selected Project Story */}
      <div className="border-t mt-10 pt-10">
        {isLoading && !story ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          </div>
        ) : story ? (
          <NarrativeStoryView story={story} />
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              {projects.length > 0
                ? "Select a project above to read its story."
                : "No projects yet. Projects will appear here once they have data."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { StoryViewer } from "./StoryViewer";
import { ProjectNavCard } from "./ProjectNavCard";
import { Search, X, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
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
  const { stories, isLoading } = useStoryStore();
  const [search, setSearch] = useState("");
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const story = currentProjectId ? stories.get(currentProjectId) : undefined;

  // Split and filter projects
  const { activeProjects, completedProjects } = useMemo(() => {
    const searchLower = search.toLowerCase();

    const filtered = projects.filter((p) => {
      if (!search) return true;
      return (
        p.projectCode.toLowerCase().includes(searchLower) ||
        p.projectName.toLowerCase().includes(searchLower) ||
        p.clientName.toLowerCase().includes(searchLower) ||
        p.clientCode.toLowerCase().includes(searchLower)
      );
    });

    return {
      activeProjects: filtered.filter((p) => p.status === "active"),
      completedProjects: filtered.filter((p) => p.status === "closed"),
    };
  }, [projects, search]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left: Story Content (main focus) */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Minimal header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
                Stories
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                The visual journey of each project
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </header>

          {/* Story content */}
          {story ? (
            <StoryViewer story={story} />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading story...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-2">
                  Select a project to read its story
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Every project has a beginning, execution, and end
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right: Project Navigation Sidebar */}
      <aside className="w-72 border-l bg-muted/30 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active
              </h3>
              <div className="space-y-2">
                {activeProjects.map((project) => (
                  <ProjectNavCard
                    key={project.projectId}
                    project={project}
                    isSelected={currentProjectId === project.projectId}
                    onSelect={() => onSelectProject(project.projectId)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Projects - Collapsible */}
          {completedProjects.length > 0 && (
            <section>
              <button
                onClick={() => setCompletedExpanded(!completedExpanded)}
                className="flex items-center gap-2 w-full text-left group mb-3"
              >
                {completedExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Completed
                </h3>
                <span className="text-xs text-muted-foreground/70">
                  ({completedProjects.length})
                </span>
              </button>

              {completedExpanded && (
                <div className="space-y-2">
                  {completedProjects.map((project) => (
                    <ProjectNavCard
                      key={project.projectId}
                      project={project}
                      isSelected={currentProjectId === project.projectId}
                      onSelect={() => onSelectProject(project.projectId)}
                      compact
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* No results */}
          {activeProjects.length === 0 && completedProjects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {search ? "No projects match your search" : "No projects yet"}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, X, ArrowLeft, Folder, Loader2 } from "lucide-react";
import type { ProjectStorySummary, StorySummariesResponse } from "@/types/stories";

export default function StoriesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectStorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/stories");
        if (res.ok) {
          const data: StorySummariesResponse = await res.json();
          setProjects(data.projects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const searchLower = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.projectCode.toLowerCase().includes(searchLower) ||
        p.projectName.toLowerCase().includes(searchLower) ||
        p.clientName.toLowerCase().includes(searchLower) ||
        p.clientCode.toLowerCase().includes(searchLower)
    );
  }, [projects, search]);

  const activeProjects = filteredProjects.filter((p) => p.status === "active");
  const closedProjects = filteredProjects.filter((p) => p.status === "closed");

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Stories</h1>
              <p className="text-muted-foreground mt-1">
                Choose a project to read its story
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Projects Grid */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Active Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.projectId}
                  project={project}
                  onClick={() => handleProjectClick(project.projectId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed Projects */}
        {closedProjects.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Completed Projects ({closedProjects.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedProjects.map((project) => (
                <ProjectCard
                  key={project.projectId}
                  project={project}
                  onClick={() => handleProjectClick(project.projectId)}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <Folder className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {search ? "No projects match your search" : "No projects yet"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectStorySummary;
  onClick: () => void;
  compact?: boolean;
}

function ProjectCard({ project, onClick, compact }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-card transition-all",
        "hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]",
        compact ? "p-4" : "overflow-hidden"
      )}
    >
      {!compact && (
        <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.projectName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Folder className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-mono font-medium bg-black/60 text-white rounded">
              {project.projectCode}
            </span>
          </div>
          {project.status === "active" && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500 text-white rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Active
              </span>
            </div>
          )}
        </div>
      )}

      <div className={cn(compact ? "" : "p-4")}>
        {compact && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              {project.projectCode}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
              {project.clientCode}
            </span>
          </div>
        )}
        <h3 className={cn("font-semibold truncate", compact ? "text-sm" : "mb-1")}>
          {project.projectName}
        </h3>
        {!compact && (
          <p className="text-sm text-muted-foreground truncate">
            {project.clientName}
          </p>
        )}
      </div>
    </button>
  );
}

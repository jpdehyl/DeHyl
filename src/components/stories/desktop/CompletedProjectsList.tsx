"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import type { ProjectStorySummary } from "@/types/stories";

interface CompletedProjectsListProps {
  projects: ProjectStorySummary[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function CompletedProjectsList({
  projects,
  selectedProjectId,
  onSelectProject,
}: CompletedProjectsListProps) {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Get unique client codes
  const clientCodes = useMemo(() => {
    const codes = new Set(projects.map((p) => p.clientCode));
    return Array.from(codes).sort();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          p.projectCode.toLowerCase().includes(searchLower) ||
          p.projectName.toLowerCase().includes(searchLower) ||
          p.clientName.toLowerCase().includes(searchLower) ||
          p.clientCode.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Client filter
      if (clientFilter && p.clientCode !== clientFilter) {
        return false;
      }

      return true;
    });
  }, [projects, search, clientFilter]);

  if (projects.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Completed
        </p>
        <span className="text-xs text-muted-foreground">
          ({projects.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Search and filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search completed..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Client filters */}
            <div className="flex gap-1 flex-wrap">
              <Badge
                variant={clientFilter === null ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-2 py-0.5 transition-colors hover:bg-accent"
                onClick={() => setClientFilter(null)}
              >
                All
              </Badge>
              {clientCodes.map((code) => (
                <Badge
                  key={code}
                  variant={clientFilter === code ? "default" : "outline"}
                  className="cursor-pointer text-[10px] px-2 py-0.5 transition-colors hover:bg-accent"
                  onClick={() => setClientFilter(code)}
                >
                  {code}
                </Badge>
              ))}
            </div>
          </div>

          {/* Project list */}
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="max-h-[280px] overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No projects match your search
                </div>
              ) : (
                filteredProjects.map((project, index) => (
                  <button
                    key={project.projectId}
                    onClick={() => onSelectProject(project.projectId)}
                    className={cn(
                      "w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors",
                      "hover:bg-accent/50",
                      index !== filteredProjects.length - 1 && "border-b",
                      selectedProjectId === project.projectId &&
                        "bg-accent"
                    )}
                  >
                    {/* Project code */}
                    <span className="text-xs font-mono font-medium text-muted-foreground w-16 shrink-0">
                      {project.projectCode}
                    </span>

                    {/* Project name */}
                    <span className="text-sm truncate flex-1 min-w-0">
                      {project.projectName}
                    </span>

                    {/* Client badge */}
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {project.clientCode}
                    </Badge>

                    {/* Date */}
                    <span className="text-[11px] text-muted-foreground shrink-0 w-14 text-right">
                      {formatDate(project.lastUpdated)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Results count */}
          {search || clientFilter ? (
            <p className="text-[10px] text-muted-foreground mt-2">
              Showing {filteredProjects.length} of {projects.length} projects
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

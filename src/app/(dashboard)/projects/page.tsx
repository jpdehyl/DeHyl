"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ProjectsTable, ProjectsFilters, ProjectsSummary } from "@/components/projects";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectWithTotals } from "@/types";

function ProjectsContent() {
  const searchParams = useSearchParams();

  // Get initial filter from URL params
  const initialFilter = searchParams.get("filter") || "all";

  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [client, setClient] = useState("all");
  const [filter, setFilter] = useState(initialFilter);

  // Fetch projects from API
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await fetch("/api/projects");
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  // Get unique clients
  const clients = useMemo(() => {
    const uniqueClients = new Set(projects.map((p) => p.clientCode));
    return Array.from(uniqueClients).sort();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          project.code.toLowerCase().includes(searchLower) ||
          project.clientCode.toLowerCase().includes(searchLower) ||
          project.clientName.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (status !== "all" && project.status !== status) {
        return false;
      }

      // Client filter
      if (client !== "all" && project.clientCode !== client) {
        return false;
      }

      // Special filters (missing-estimate, missing-pbs, has-issues)
      switch (filter) {
        case "missing-estimate":
          if (project.hasEstimate) return false;
          break;
        case "missing-pbs":
          if (project.hasPBS) return false;
          break;
        case "has-issues":
          // Show projects with either missing estimate or missing PBS
          if (project.hasEstimate && project.hasPBS) return false;
          break;
      }

      return true;
    });
  }, [projects, search, status, client, filter]);

  if (loading) {
    return (
      <div>
        <Header title="Projects" />
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Projects" />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-sm text-destructive">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Make sure Google Drive is connected in Settings, then sync your projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Projects" />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <ProjectsSummary projects={filteredProjects} />

        <ProjectsFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          client={client}
          onClientChange={setClient}
          clients={clients}
          filter={filter}
          onFilterChange={setFilter}
        />

        <ProjectsTable projects={filteredProjects} />
      </div>
    </div>
  );
}

function ProjectsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <ProjectsContent />
    </Suspense>
  );
}

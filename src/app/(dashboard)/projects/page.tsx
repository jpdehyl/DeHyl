"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, ChevronRight, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { ProjectWithTotals } from "@/types";

function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await fetch("/api/projects");
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const activeProjects = useMemo(() => projects.filter(p => p.status === "active"), [projects]);
  const closedProjects = useMemo(() => projects.filter(p => p.status === "closed"), [projects]);

  const displayProjects = useMemo(() => {
    const base = showClosed ? projects : activeProjects;
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }, [projects, activeProjects, showClosed, search]);

  const totals = useMemo(() => {
    return activeProjects.reduce(
      (acc, p) => ({
        invoiced: acc.invoiced + p.totals.invoiced,
        costs: acc.costs + p.totals.costs,
        profit: acc.profit + p.totals.profit,
        estimated: acc.estimated + (p.estimateAmount ?? 0),
      }),
      { invoiced: 0, costs: 0, profit: 0, estimated: 0 }
    );
  }, [activeProjects]);

  const margin = totals.invoiced > 0 ? (totals.profit / totals.invoiced) * 100 : 0;
  const missingEstimate = activeProjects.filter(p => !p.hasEstimate).length;
  const maxInvoiced = useMemo(() => Math.max(...displayProjects.map(p => p.totals.invoiced), 1), [displayProjects]);

  if (loading) {
    return (
      <div>
        <Header title="Projects" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 space-y-8">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-4 mt-12">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Projects" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Projects" />

      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-24">

        {/* Headline */}
        <div className="mb-2">
          <p className={cn(
            "font-serif text-5xl font-semibold tracking-tight tabular-nums leading-none",
            totals.profit >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(totals.profit)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            portfolio profit &middot; {margin.toFixed(0)}% margin
          </p>
        </div>

        {/* Prose summary */}
        <p className="text-sm leading-relaxed text-muted-foreground mt-4 mb-12 max-w-lg">
          {activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""} with {formatCurrency(totals.invoiced)} invoiced against {formatCurrency(totals.costs)} in costs.
          {missingEstimate > 0 && ` ${missingEstimate} project${missingEstimate !== 1 ? "s" : ""} missing estimates.`}
          {closedProjects.length > 0 && ` ${closedProjects.length} closed.`}
        </p>

        {/* Minimal controls */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm border-muted/50"
            />
          </div>
          <button
            onClick={() => setShowClosed(!showClosed)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full transition-colors",
              showClosed
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {showClosed ? "All" : "Active"}
          </button>
        </div>

        {/* Project cards */}
        <div className="space-y-1">
          {displayProjects.map((project) => {
            const invoicedPct = maxInvoiced > 0 ? (project.totals.invoiced / maxInvoiced) * 100 : 0;
            const projectMargin = project.totals.invoiced > 0
              ? (project.totals.profit / project.totals.invoiced) * 100
              : 0;
            const hasIssues = !project.hasEstimate || !project.hasPBS;

            return (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group cursor-pointer py-4 border-b border-muted/30 last:border-0 hover:bg-muted/20 -mx-3 px-3 rounded-sm transition-colors"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left: project info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium">
                        {project.description || project.clientName}
                      </span>
                      {hasIssues && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      )}
                      {project.status === "closed" && (
                        <span className="text-xs text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">closed</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {project.code} &middot; {project.clientCode}
                      {project.estimateAmount ? ` &middot; Est. ${formatCurrency(project.estimateAmount)}` : ""}
                    </p>
                  </div>

                  {/* Right: financials */}
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "font-serif text-lg font-semibold tabular-nums tracking-tight",
                      project.totals.profit >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(project.totals.profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.totals.invoiced > 0
                        ? `${projectMargin.toFixed(0)}% margin`
                        : "no invoices"
                      }
                    </p>
                  </div>
                </div>

                {/* Visual: invoiced bar */}
                {project.totals.invoiced > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          project.totals.profit >= 0
                            ? "bg-emerald-400/60"
                            : "bg-red-400/60"
                        )}
                        style={{ width: `${Math.min(invoicedPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground/60 tabular-nums w-20 text-right">
                      {formatCurrency(project.totals.invoiced)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {displayProjects.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">No projects found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div>
        <Header title="Projects" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
          <Skeleton className="h-16 w-64" />
        </div>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}

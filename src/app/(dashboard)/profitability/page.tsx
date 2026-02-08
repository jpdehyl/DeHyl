"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/header";
import {
  ProfitabilitySummaryCards,
  ProfitabilityTable,
  ProfitByClientChart,
  EstimateAccuracyChart,
  ProfitabilityFilters,
} from "@/components/profitability";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type {
  ProjectProfitability,
  ProfitabilitySummary,
  ClientProfitability,
} from "@/types";

interface ProfitabilityData {
  projects: ProjectProfitability[];
  summary: ProfitabilitySummary;
  byClient: ClientProfitability[];
}

function ProfitabilityContent() {
  const { sidebarOpen } = useAppStore();

  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch("/api/analytics/profitability");

        if (!response.ok) {
          throw new Error("Failed to fetch profitability data");
        }

        const profitabilityData = await response.json();
        setData(profitabilityData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profitability data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get unique clients for filter dropdown
  const clients = useMemo(() => {
    if (!data) return [];
    const clientMap = new Map<string, string>();
    data.projects.forEach((p) => {
      if (!clientMap.has(p.clientCode)) {
        clientMap.set(p.clientCode, p.clientName);
      }
    });
    return Array.from(clientMap.entries()).map(([code, name]) => ({ code, name }));
  }, [data]);

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    if (!data) return [];

    return data.projects.filter((project) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !project.code.toLowerCase().includes(searchLower) &&
          !project.description.toLowerCase().includes(searchLower) &&
          !project.clientName.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      // Client filter
      if (clientFilter !== "all" && project.clientCode !== clientFilter) {
        return false;
      }

      return true;
    });
  }, [data, search, statusFilter, clientFilter]);

  // Recalculate summary for filtered projects
  const filteredSummary = useMemo((): ProfitabilitySummary => {
    if (filteredProjects.length === 0) {
      return {
        totalRevenue: 0,
        totalCosts: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
        mostProfitableProject: "N/A",
        leastProfitableProject: "N/A",
      };
    }

    const totalRevenue = filteredProjects.reduce((sum, p) => sum + p.totalInvoiced, 0);
    const totalCosts = filteredProjects.reduce((sum, p) => sum + p.totalCosts, 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgProfitMargin =
      totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

    const projectsWithRevenue = filteredProjects.filter((p) => p.totalInvoiced > 0);
    const mostProfitable = projectsWithRevenue.reduce(
      (max, p) => (p.profitMarginPct > max.profitMarginPct ? p : max),
      { profitMarginPct: -Infinity, code: "N/A" }
    );
    const leastProfitable = projectsWithRevenue.reduce(
      (min, p) => (p.profitMarginPct < min.profitMarginPct ? p : min),
      { profitMarginPct: Infinity, code: "N/A" }
    );

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      avgProfitMargin,
      mostProfitableProject: mostProfitable.code,
      leastProfitableProject: leastProfitable.code,
    };
  }, [filteredProjects]);

  // Filter client data based on client filter
  const filteredClientData = useMemo(() => {
    if (!data) return [];
    if (clientFilter === "all") return data.byClient;
    return data.byClient.filter((c) => c.clientCode === clientFilter);
  }, [data, clientFilter]);

  if (loading) {
    return (
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "md:pl-64" : "md:pl-16"
        )}
      >
        <Header title="Profitability" description="Analyze project and client profitability" />
        <div className="p-4 md:p-6 space-y-6">
          {/* Summary cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          {/* Charts skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[400px] rounded-lg" />
            <Skeleton className="h-[400px] rounded-lg" />
          </div>
          {/* Table skeleton */}
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "md:pl-64" : "md:pl-16"
        )}
      >
        <Header title="Profitability" description="Analyze project and client profitability" />
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "transition-all duration-300",
        sidebarOpen ? "md:pl-64" : "md:pl-16"
      )}
    >
      <Header title="Profitability" description="Analyze project and client profitability" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary Cards */}
        <ProfitabilitySummaryCards summary={filteredSummary} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfitByClientChart data={filteredClientData} />
          <EstimateAccuracyChart projects={filteredProjects} />
        </div>

        {/* Project Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>Project Profitability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfitabilityFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              clientFilter={clientFilter}
              onClientFilterChange={setClientFilter}
              clients={clients}
            />
            <ProfitabilityTable projects={filteredProjects} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfitabilityLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function ProfitabilityPage() {
  return (
    <Suspense fallback={<ProfitabilityLoading />}>
      <ProfitabilityContent />
    </Suspense>
  );
}

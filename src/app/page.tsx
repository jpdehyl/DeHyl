"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import {
  KPIGrid,
  AlertsPanel,
  ActivityFeed,
  QuickActions,
  RevenueTrendChart,
  EstimateVsActualChart,
  BidConversionChart,
  generateRevenueTrendData,
} from "@/components/dashboard";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DashboardData, ProjectWithTotals, Bid } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { sidebarOpen } = useAppStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate revenue trend data
  const revenueTrendData = useMemo(() => generateRevenueTrendData(), []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [dashboardRes, projectsRes, bidsRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/projects"),
          fetch("/api/bids"),
        ]);

        if (!dashboardRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        if (!projectsRes.ok) {
          throw new Error("Failed to fetch projects");
        }

        const dashboard = await dashboardRes.json();
        const projectsData = await projectsRes.json();
        const bidsData = bidsRes.ok ? await bidsRes.json() : { bids: [] };

        setDashboardData(dashboard);
        setProjects(projectsData.projects || []);
        setBids(bidsData.bids || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={cn("transition-all duration-300")}>
        <Header
          title="Dashboard"
          description="Financial overview for DeHyl Constructors"
        />
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("transition-all duration-300")}>
        <Header
          title="Dashboard"
          description="Financial overview for DeHyl Constructors"
        />
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
              Make sure QuickBooks and Google Drive are connected in Settings, then sync your data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { kpis, alerts, recentActivity } = dashboardData || {
    kpis: {
      totalReceivables: 0,
      totalPayables: 0,
      netPosition: 0,
      activeProjects: 0,
      overdueInvoices: 0,
      overdueAmount: 0,
      billsDueThisWeek: 0,
      billsDueAmount: 0,
    },
    alerts: [],
    recentActivity: [],
  };

  return (
    <div className={cn(
      "transition-all duration-300",
      sidebarOpen ? "md:ml-0" : "md:ml-0"
    )}>
      <Header
        title="Dashboard"
        description="Financial overview for DeHyl Constructors"
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* KPI Cards */}
        <KPIGrid kpis={kpis} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueTrendChart data={revenueTrendData} />
          <EstimateVsActualChart projects={projects} />
        </div>

        {/* Bid Conversion Chart */}
        <BidConversionChart bids={bids} />

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Alerts - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <AlertsPanel alerts={alerts} />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={recentActivity} />
      </div>
    </div>
  );
}

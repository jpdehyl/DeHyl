"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import {
  AlertsPanel,
  ActivityFeed,
  QuickActions,
  RevenueTrendChart,
  EstimateVsActualChart,
  BidConversionChart,
  ClientPerformance,
  PresetSelector,
  AIGeneratorModal,
} from "@/components/dashboard";
import type { RevenueMonthData, RevenueTotals } from "@/components/dashboard";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DashboardData, ProjectWithTotals, Bid } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JsonRenderer, type Dashboard } from "@/lib/json-render/renderer";
import {
  type PresetKey,
  createExecutiveDashboard,
  createCollectionsDashboard,
  createProjectManagerDashboard,
  createMobileDashboard,
} from "@/lib/json-render/presets";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDaysOverdue, getDaysUntilDue } from "@/lib/utils";

interface RevenueData {
  months: RevenueMonthData[];
  totals: RevenueTotals;
  message?: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  client_name: string;
  balance: number;
  due_date: string;
}

export default function DashboardPage() {
  const { sidebarOpen } = useAppStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPreset, setCurrentPreset] = useState<PresetKey>("executive");
  const [customDashboard, setCustomDashboard] = useState<Dashboard | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setRevenueLoading(true);

        const [dashboardRes, projectsRes, bidsRes, revenueRes, receivablesRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/projects"),
          fetch("/api/bids"),
          fetch("/api/analytics/revenue"),
          fetch("/api/receivables"),
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
        const revenue = revenueRes.ok ? await revenueRes.json() : { months: [], totals: { totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0 } };
        const receivables = receivablesRes.ok ? await receivablesRes.json() : { invoices: [] };

        setDashboardData(dashboard);
        setProjects(projectsData.projects || []);
        setBids(bidsData.bids || []);
        setRevenueData(revenue);
        setInvoices(receivables.invoices || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
        setRevenueLoading(false);
      }
    }

    fetchData();
  }, []);

  const handlePresetChange = useCallback((preset: PresetKey) => {
    setCurrentPreset(preset);
    setCustomDashboard(null); // Clear custom dashboard when switching presets
  }, []);

  const handleAIGenerate = useCallback((dashboard: Dashboard) => {
    setCustomDashboard(dashboard);
  }, []);

  const handleClearCustom = useCallback(() => {
    setCustomDashboard(null);
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

  // Calculate aging for collections view
  const aging = {
    current: 0,
    days31_60: 0,
    days61_90: 0,
    over90: 0,
  };

  invoices.forEach((inv) => {
    const daysOverdue = getDaysOverdue(inv.due_date);
    const balance = Number(inv.balance);

    if (daysOverdue <= 0) {
      aging.current += balance;
    } else if (daysOverdue <= 30) {
      aging.current += balance;
    } else if (daysOverdue <= 60) {
      aging.days31_60 += balance;
    } else if (daysOverdue <= 90) {
      aging.days61_90 += balance;
    } else {
      aging.over90 += balance;
    }
  });

  // Overdue invoices for collections view
  const overdueInvoicesList = invoices
    .filter((inv) => getDaysOverdue(inv.due_date) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5)
    .map((inv) => ({
      number: inv.invoice_number || "-",
      client: inv.client_name,
      amount: Number(inv.balance),
      dueDate: inv.due_date,
      status: "Overdue",
    }));

  // Due soon invoices
  const dueSoonInvoices = invoices.filter((inv) => {
    const days = getDaysUntilDue(inv.due_date);
    return days >= 0 && days <= 7;
  });
  const dueSoonAmount = dueSoonInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

  // Project stats for project manager view
  const activeProjectsList = projects.filter((p) => p.status === "active");
  const totalEstimated = projects.reduce((sum, p) => sum + (p.estimateAmount || 0), 0);
  const totalInvoiced = projects.reduce((sum, p) => sum + (p.totals?.invoiced || 0), 0);
  const missingEstimates = projects.filter((p) => p.status === "active" && !p.estimateAmount).length;

  // Generate dashboard JSON based on preset (or mobile if on small screen)
  let presetDashboard: Dashboard;

  // Use mobile-optimized layout on small screens
  if (isMobile) {
    presetDashboard = createMobileDashboard({
      totalReceivables: kpis.totalReceivables,
      overdueAmount: kpis.overdueAmount,
      overdueCount: kpis.overdueInvoices,
      billsDueAmount: kpis.billsDueAmount,
      billsDueCount: kpis.billsDueThisWeek,
      activeProjects: kpis.activeProjects,
    });
  } else {
    switch (currentPreset) {
      case "executive":
        presetDashboard = createExecutiveDashboard({
          totalReceivables: kpis.totalReceivables,
          totalPayables: kpis.totalPayables,
          netPosition: kpis.netPosition,
          activeProjects: kpis.activeProjects,
          overdueInvoices: kpis.overdueInvoices,
          billsDueThisWeek: kpis.billsDueThisWeek,
        });
        break;
      case "collections":
        presetDashboard = createCollectionsDashboard({
          totalReceivables: kpis.totalReceivables,
          overdueAmount: kpis.overdueAmount,
          overdueCount: kpis.overdueInvoices,
          dueSoonAmount,
          dueSoonCount: dueSoonInvoices.length,
          aging,
          topInvoices: overdueInvoicesList,
        });
        break;
      case "project-manager":
        presetDashboard = createProjectManagerDashboard({
          activeProjects: kpis.activeProjects,
          totalEstimated,
          totalInvoiced,
          missingEstimates,
          recentProjects: activeProjectsList.slice(0, 5).map((p) => ({
            code: p.code,
            client: p.clientName || p.clientCode || "-",
            status: p.status,
            invoiced: p.totals?.invoiced || 0,
          })),
        });
        break;
      default:
        presetDashboard = createExecutiveDashboard({
          totalReceivables: kpis.totalReceivables,
          totalPayables: kpis.totalPayables,
          netPosition: kpis.netPosition,
          activeProjects: kpis.activeProjects,
          overdueInvoices: kpis.overdueInvoices,
          billsDueThisWeek: kpis.billsDueThisWeek,
        });
    }
  }

  return (
    <div className={cn(
      "transition-all duration-300",
      sidebarOpen ? "md:ml-0" : "md:ml-0"
    )}>
      <Header
        title="Dashboard"
        description={isMobile ? "Quick view" : (customDashboard ? "AI Generated View" : "Financial overview for DeHyl Constructors")}
        action={!isMobile ? (
          <div className="flex items-center gap-2">
            {customDashboard && (
              <Button variant="outline" size="sm" onClick={handleClearCustom}>
                Back to Presets
              </Button>
            )}
            {!customDashboard && <PresetSelector onPresetChange={handlePresetChange} />}
            <AIGeneratorModal onApply={handleAIGenerate} />
          </div>
        ) : undefined}
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* Dynamic Dashboard based on preset or AI-generated */}
        <JsonRenderer dashboard={customDashboard || presetDashboard} />

        {/* Show charts only for non-executive views on desktop */}
        {!isMobile && currentPreset !== "executive" && (
          <>
            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueTrendChart
                data={revenueData?.months || []}
                totals={revenueData?.totals}
                loading={revenueLoading}
                emptyMessage={revenueData?.message}
              />
              <EstimateVsActualChart projects={projects} />
            </div>

            {/* Bid Conversion Chart */}
            <BidConversionChart bids={bids} />
          </>
        )}

        {/* Client Performance - show for project manager on desktop */}
        {!isMobile && currentPreset === "project-manager" && <ClientPerformance />}

        {/* Main content grid - show for collections and project-manager on desktop */}
        {!isMobile && currentPreset !== "executive" && (
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
        )}

        {/* Activity Feed - show for all except executive on desktop */}
        {!isMobile && currentPreset !== "executive" && (
          <ActivityFeed activities={recentActivity} />
        )}
      </div>
    </div>
  );
}

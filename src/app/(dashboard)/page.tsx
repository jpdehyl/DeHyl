"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { cn, formatCurrency, getDaysOverdue, getRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { DashboardData, ProjectWithTotals } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  FolderOpen,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface InvoiceData {
  id: string;
  invoice_number: string;
  client_name: string;
  balance: number;
  due_date: string;
}

interface ReceivablesResponse {
  invoices: InvoiceData[];
  totals: { outstanding: number; overdue: number; dueThisWeek: number };
  lastSyncedAt: string | null;
}

export default function DashboardPage() {
  const { sidebarOpen } = useAppStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [dashboardRes, projectsRes, receivablesRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/projects"),
          fetch("/api/receivables"),
        ]);

        if (!dashboardRes.ok) throw new Error("Failed to fetch dashboard data");

        const dashboard = await dashboardRes.json();
        const projectsData = projectsRes.ok ? await projectsRes.json() : { projects: [] };
        const receivables: ReceivablesResponse = receivablesRes.ok
          ? await receivablesRes.json()
          : { invoices: [], totals: { outstanding: 0, overdue: 0, dueThisWeek: 0 }, lastSyncedAt: null };

        setDashboardData(dashboard);
        setProjects(projectsData.projects || []);
        setInvoices(receivables.invoices || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="transition-all duration-300">
        <Header title="Dashboard" description="Financial overview" />
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="transition-all duration-300">
        <Header title="Dashboard" description="Financial overview" />
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
              Make sure QuickBooks is connected in Settings, then sync your data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { kpis, lastSyncedAt } = dashboardData || {
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
    lastSyncedAt: null,
  };

  // QB disconnected check: >48 hours since last sync
  const isQBStale = (() => {
    if (!lastSyncedAt) return true;
    const syncDate = new Date(lastSyncedAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 48;
  })();

  const daysSinceSync = (() => {
    if (!lastSyncedAt) return null;
    const syncDate = new Date(lastSyncedAt);
    const now = new Date();
    return Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Overdue invoices sorted by amount desc
  const overdueInvoices = invoices
    .filter((inv) => getDaysOverdue(inv.due_date) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance));

  // Active projects with financials
  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className={cn("transition-all duration-300")}>
      <Header title="Dashboard" description="Financial overview for DeHyl Constructors" />

      <div className="p-4 md:p-6 space-y-6">
        {/* QB Disconnected Banner */}
        {isQBStale && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {lastSyncedAt
                  ? `⚠️ QuickBooks data is ${daysSinceSync} day${daysSinceSync !== 1 ? "s" : ""} old.`
                  : "⚠️ QuickBooks has never been synced."}
              </p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Reconnect in Settings to get fresh data.
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Receivables
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalReceivables)}</div>
              {kpis.overdueInvoices > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  {kpis.overdueInvoices} overdue ({formatCurrency(kpis.overdueAmount)})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Payables
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalPayables)}</div>
              {kpis.billsDueThisWeek > 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  {kpis.billsDueThisWeek} due this week ({formatCurrency(kpis.billsDueAmount)})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Position
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                kpis.netPosition >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(kpis.netPosition)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receivables − Payables
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Projects
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.activeProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projects.filter((p) => p.status === "closed").length} closed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Invoices Table */}
        {overdueInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Overdue Invoices
                <Badge variant="destructive" className="ml-2">{overdueInvoices.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.slice(0, 10).map((inv) => {
                    const days = getDaysOverdue(inv.due_date);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.invoice_number || "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {inv.client_name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(inv.balance))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={days > 60 ? "destructive" : days > 30 ? "default" : "secondary"}>
                            {days}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {overdueInvoices.length > 10 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  + {overdueInvoices.length - 10} more overdue invoices →{" "}
                  <a href="/receivables" className="underline hover:text-foreground">
                    View all
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-500" />
                Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeProjects.slice(0, 9).map((proj) => (
                  <a
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className="block rounded-lg border p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold">{proj.code}</span>
                      {proj.totals.outstanding > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(proj.totals.outstanding)} owing
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {proj.clientName || proj.clientCode}
                    </p>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>Invoiced: {formatCurrency(proj.totals.invoiced)}</span>
                    </div>
                  </a>
                ))}
              </div>
              {activeProjects.length > 9 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  + {activeProjects.length - 9} more →{" "}
                  <a href="/projects" className="underline hover:text-foreground">
                    View all
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sync Status Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Clock className="h-3 w-3" />
          <span>
            {lastSyncedAt
              ? `Last synced ${getRelativeTime(lastSyncedAt)}`
              : "Never synced — connect QuickBooks in Settings"}
          </span>
        </div>
      </div>
    </div>
  );
}

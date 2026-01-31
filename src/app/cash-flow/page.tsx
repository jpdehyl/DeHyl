"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import type { CashFlowResponse, CashFlowPeriod } from "@/app/api/cash-flow/route";

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("/api/cash-flow");
        if (!res.ok) throw new Error("Failed to fetch cash flow data");
        const cashFlowData = await res.json();
        setData(cashFlowData);
      } catch (err) {
        console.error("Error fetching cash flow:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="transition-all duration-300">
        <Header
          title="Cash Flow"
          description="Track your incoming and outgoing cash"
        />
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="transition-all duration-300">
        <Header
          title="Cash Flow"
          description="Track your incoming and outgoing cash"
        />
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-red-800 dark:text-red-200">{error || "No data available"}</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
              Make sure QuickBooks is connected and synced in Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { projection, totals, weeklyPeriods, monthlyPeriods } = data;
  const periods = view === "weekly" ? weeklyPeriods : monthlyPeriods;

  // Prepare chart data
  const chartData = periods.slice(0, view === "weekly" ? 8 : 6).map((period) => ({
    name: view === "weekly" 
      ? period.label.replace(/Week \d+: /, "")
      : period.label.substring(0, 3),
    inflows: period.inflows,
    outflows: period.outflows,
    net: period.net,
  }));

  return (
    <div className="transition-all duration-300">
      <Header
        title="Cash Flow"
        description="Projected cash inflows and outflows based on receivables and payables"
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Net Position */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                totals.netCashFlow >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(totals.netCashFlow)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total receivables minus payables
              </p>
            </CardContent>
          </Card>

          {/* 30-Day Projection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">30-Day Net</CardTitle>
              {projection.days30.net >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                projection.days30.net >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(projection.days30.net)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-600">+{formatCurrency(projection.days30.inflows)}</span>
                <span>/</span>
                <span className="text-red-600">-{formatCurrency(projection.days30.outflows)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 60-Day Projection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">60-Day Net</CardTitle>
              {projection.days60.net >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                projection.days60.net >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(projection.days60.net)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-600">+{formatCurrency(projection.days60.inflows)}</span>
                <span>/</span>
                <span className="text-red-600">-{formatCurrency(projection.days60.outflows)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 90-Day Projection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">90-Day Net</CardTitle>
              {projection.days90.net >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                projection.days90.net >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(projection.days90.net)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-600">+{formatCurrency(projection.days90.inflows)}</span>
                <span>/</span>
                <span className="text-red-600">-{formatCurrency(projection.days90.outflows)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cash Flow Projection</CardTitle>
                <CardDescription>
                  Expected inflows and outflows by {view === "weekly" ? "week" : "month"}
                </CardDescription>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as "weekly" | "monthly")}>
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <Bar 
                    dataKey="inflows" 
                    name="Inflows" 
                    fill="hsl(142, 76%, 36%)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="outflows" 
                    name="Outflows" 
                    fill="hsl(0, 84%, 60%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Period Details */}
        <Card>
          <CardHeader>
            <CardTitle>Period Details</CardTitle>
            <CardDescription>
              Breakdown of expected cash movements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {periods.slice(0, view === "weekly" ? 8 : 6).map((period, idx) => (
                  <PeriodCard key={idx} period={period} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PeriodCard({ period }: { period: CashFlowPeriod }) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = period.inflowItems.length > 0 || period.outflowItems.length > 0;

  return (
    <div 
      className={cn(
        "rounded-lg border p-4 transition-colors",
        hasItems && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={() => hasItems && setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{period.label}</p>
            <p className="text-sm text-muted-foreground">
              {period.inflowItems.length} inflows • {period.outflowItems.length} outflows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="flex items-center gap-1 text-green-600">
              <ArrowUpIcon className="h-3 w-3" />
              <span className="text-sm font-medium">{formatCurrency(period.inflows)}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <ArrowDownIcon className="h-3 w-3" />
              <span className="text-sm font-medium">{formatCurrency(period.outflows)}</span>
            </div>
          </div>
          <div className="min-w-[100px]">
            <Badge
              variant={period.net >= 0 ? "default" : "destructive"}
              className={cn(
                "text-sm",
                period.net >= 0 && "bg-green-600 hover:bg-green-700"
              )}
            >
              {period.net >= 0 ? "+" : ""}{formatCurrency(period.net)}
            </Badge>
          </div>
          {hasItems && (
            <ArrowRight className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )} />
          )}
        </div>
      </div>

      {expanded && hasItems && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Inflows */}
          {period.inflowItems.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-green-600">Expected Inflows</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {period.inflowItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.clientName}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Outflows */}
          {period.outflowItems.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-red-600">Expected Outflows</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {period.outflowItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.vendorName}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface RevenueMonthData {
  month: string;
  label: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

export interface RevenueTotals {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface RevenueTrendChartProps {
  data: RevenueMonthData[];
  totals?: RevenueTotals;
  loading?: boolean;
  emptyMessage?: string;
}

export function RevenueTrendChart({
  data,
  totals,
  loading,
  emptyMessage
}: RevenueTrendChartProps) {
  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly invoiced vs collected over time</CardDescription>
          </div>
          {totals && hasData && (
            <div className="flex gap-4 text-sm">
              <div className="text-right">
                <div className="text-muted-foreground">Total Invoiced</div>
                <div className="font-semibold text-primary">
                  {formatCurrency(totals.totalInvoiced)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">Collected</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.totalCollected)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">Outstanding</div>
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(totals.totalOutstanding)}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-muted-foreground">Loading revenue data...</div>
            </div>
          ) : !hasData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>{emptyMessage || "No invoice data yet. Sync QuickBooks to see revenue trends."}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="outstandingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="outstanding"
                  name="Outstanding"
                  fill="url(#outstandingGradient)"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="invoiced"
                  name="Invoiced"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mock data generator for the last 12 months
export function generateRevenueTrendData() {
  const months = [
    "Feb", "Mar", "Apr", "May", "Jun", "Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"
  ];

  return months.map((month) => {
    const baseInvoiced = 35000 + Math.random() * 30000;
    const basePaid = baseInvoiced * (0.7 + Math.random() * 0.25);
    return {
      month,
      invoiced: Math.round(baseInvoiced),
      paid: Math.round(basePaid),
    };
  });
}

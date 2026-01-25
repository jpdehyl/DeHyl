"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { ClientProfitability } from "@/types";

interface ProfitByClientChartProps {
  data: ClientProfitability[];
}

export function ProfitByClientChart({ data }: ProfitByClientChartProps) {
  // Transform and sort data by profit
  const chartData = data
    .filter((client) => client.totalRevenue > 0)
    .map((client) => ({
      name: client.clientCode,
      fullName: client.clientName,
      profit: client.totalProfit,
      revenue: client.totalRevenue,
      margin: client.avgMargin,
      projects: client.projectCount,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10); // Limit to top 10 clients

  const getBarColor = (margin: number) => {
    if (margin < 0) return "hsl(var(--destructive))";
    if (margin < 20) return "hsl(var(--destructive))";
    if (margin < 30) return "hsl(var(--warning))";
    return "hsl(var(--success))";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit by Client</CardTitle>
        <CardDescription>
          Total profit by client, colored by profit margin (green &gt;30%, yellow 20-30%, red &lt;20%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No client data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  width={50}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "profit") return [formatCurrency(value as number), "Profit"];
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="font-medium">{data.fullName}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            Profit: <span className="font-medium">{formatCurrency(data.profit)}</span>
                          </p>
                          <p>
                            Revenue: <span className="font-medium">{formatCurrency(data.revenue)}</span>
                          </p>
                          <p>
                            Margin: <span className="font-medium">{data.margin}%</span>
                          </p>
                          <p>
                            Projects: <span className="font-medium">{data.projects}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="profit" name="profit" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.margin)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-success" />
            <span className="text-muted-foreground">&gt;30% margin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-warning" />
            <span className="text-muted-foreground">20-30% margin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">&lt;20% margin</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

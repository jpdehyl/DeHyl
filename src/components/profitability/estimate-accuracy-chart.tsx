"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { ProjectProfitability } from "@/types";

interface EstimateAccuracyChartProps {
  projects: ProjectProfitability[];
}

export function EstimateAccuracyChart({ projects }: EstimateAccuracyChartProps) {
  // Filter to projects with both estimate and invoiced amounts
  const chartData = projects
    .filter((p) => p.estimateAmount && p.estimateAmount > 0 && p.totalInvoiced > 0)
    .map((p) => {
      const variance = p.totalInvoiced - (p.estimateAmount || 0);
      const variancePercent = ((variance / (p.estimateAmount || 1)) * 100).toFixed(1);
      return {
        code: p.code,
        description: p.description,
        estimate: p.estimateAmount || 0,
        actual: p.totalInvoiced,
        variance,
        variancePercent: parseFloat(variancePercent),
        isOver: variance > 0,
      };
    });

  // Calculate summary stats
  const overEstimates = chartData.filter((p) => p.variance < 0).length;
  const underEstimates = chartData.filter((p) => p.variance > 0).length;
  const onTarget = chartData.filter((p) => Math.abs(p.variancePercent) <= 10).length;

  // Find max value for axis
  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.estimate, d.actual)),
    1
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate vs Actual Revenue</CardTitle>
        <CardDescription>
          Compare estimated project values to actual invoiced amounts. Points above the line billed more than estimated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No projects with estimates and revenue found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  dataKey="estimate"
                  name="Estimate"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  domain={[0, maxValue * 1.1]}
                  label={{
                    value: "Estimate",
                    position: "bottom",
                    offset: 0,
                    fontSize: 12,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="actual"
                  name="Actual"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  domain={[0, maxValue * 1.1]}
                  label={{
                    value: "Actual",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <ZAxis range={[60, 200]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="font-mono font-medium">{data.code}</p>
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {data.description}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            Estimate: <span className="font-medium">{formatCurrency(data.estimate)}</span>
                          </p>
                          <p>
                            Actual: <span className="font-medium">{formatCurrency(data.actual)}</span>
                          </p>
                          <p
                            className={
                              data.variance >= 0 ? "text-success" : "text-warning"
                            }
                          >
                            {data.variance >= 0 ? "+" : ""}
                            {data.variancePercent}% ({formatCurrency(data.variance)})
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                {/* Perfect accuracy line */}
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: maxValue * 1.1, y: maxValue * 1.1 },
                  ]}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
                <Scatter data={chartData} fill="hsl(var(--primary))">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isOver ? "hsl(var(--success))" : "hsl(var(--warning))"}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Summary stats */}
        {chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-2xl font-bold text-success">{underEstimates}</p>
              <p className="text-muted-foreground">Over estimate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{onTarget}</p>
              <p className="text-muted-foreground">On target (+-10%)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{overEstimates}</p>
              <p className="text-muted-foreground">Under estimate</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

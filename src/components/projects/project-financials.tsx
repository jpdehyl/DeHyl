"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency } from "@/lib/utils";
import type { ProjectWithTotals } from "@/types";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProjectFinancialsProps {
  project: ProjectWithTotals;
}

export function ProjectFinancials({ project }: ProjectFinancialsProps) {
  const { estimateAmount, totals } = project;
  const { invoiced, paid, outstanding, costs, profit } = totals;

  const invoicedPercent = estimateAmount
    ? Math.min((invoiced / estimateAmount) * 100, 100)
    : 0;
  const paidPercent = invoiced ? (paid / invoiced) * 100 : 0;
  const profitMargin = invoiced ? (profit / invoiced) * 100 : 0;
  const costPercent =
    invoiced > 0 ? Math.min((costs / invoiced) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      {/* Profit/Loss Summary Bar */}
      <Card className={cn(
        "border-l-4",
        profit > 0 ? "border-l-green-500" : profit < 0 ? "border-l-red-500" : "border-l-gray-400"
      )}>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center md:gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(paid)}
              </p>
            </div>
            <Minus className="h-5 w-5 text-muted-foreground hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Costs</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(costs)}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {profit >= 0 ? "Profit" : "Loss"}
              </p>
              <div className="flex items-center gap-1">
                {profit > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : profit < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : null}
                <p className={cn(
                  "text-xl font-bold",
                  profit > 0 ? "text-green-600 dark:text-green-400" : profit < 0 ? "text-red-600 dark:text-red-400" : ""
                )}>
                  {formatCurrency(Math.abs(profit))}
                </p>
              </div>
              {invoiced > 0 && (
                <p className={cn(
                  "text-xs font-medium",
                  profitMargin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {profitMargin.toFixed(1)}% margin
                </p>
              )}
            </div>
          </div>

          {/* Stacked bar: costs vs profit */}
          {invoiced > 0 && (
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="bg-red-500/80 transition-all"
                style={{ width: `${costPercent}%` }}
              />
              <div
                className={cn(
                  "transition-all",
                  profit >= 0 ? "bg-green-500/80" : "bg-red-500/60"
                )}
                style={{ width: `${Math.max(100 - costPercent, 0)}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Estimate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimateAmount ? formatCurrency(estimateAmount) : "Not set"}
            </div>
            {estimateAmount && (
              <>
                <Progress value={invoicedPercent} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {invoicedPercent.toFixed(0)}% invoiced
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoiced)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(paid)} collected
            </p>
            {outstanding > 0 && (
              <p className="text-xs text-warning mt-1">
                {formatCurrency(outstanding)} outstanding
              </p>
            )}
            <Progress value={paidPercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(costs)}
            </div>
            <p className="text-xs text-muted-foreground">
              QB bills + manual costs
            </p>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                profit >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {formatCurrency(profit)}
            </div>
            {invoiced > 0 && (
              <p className="text-xs text-muted-foreground">
                {profitMargin.toFixed(1)}% margin
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

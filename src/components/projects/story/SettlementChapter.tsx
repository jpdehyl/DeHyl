"use client";

import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProjectWithTotals, Invoice, Bill } from "@/types";

interface SettlementChapterProps {
  project: ProjectWithTotals;
  invoices: Invoice[];
  bills: Bill[];
}

export function SettlementChapter({
  project,
  invoices,
  bills,
}: SettlementChapterProps) {
  const { totals } = project;
  const revenue = totals.invoiced;
  const collected = totals.paid;
  const outstanding = totals.outstanding;
  const costs = totals.costs;
  const profit = totals.profit;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const isProfitable = profit >= 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border p-8">
        <div className="relative z-10">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
            Chapter 5
          </p>
          <h3 className="text-3xl font-bold mb-4">Settlement</h3>
          <p className="text-muted-foreground max-w-lg">
            The business outcome. Revenue, costs, and the bottom line.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green-500/10 blur-2xl" />
      </div>

      {/* Financial Hero - Big Numbers */}
      <div className="p-8 rounded-2xl border bg-card">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {/* Revenue */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Revenue
            </p>
            <p className="text-4xl md:text-5xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(revenue)}
            </p>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />
          <span className="text-2xl text-muted-foreground md:hidden">−</span>

          {/* Costs */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Costs
            </p>
            <p className="text-4xl md:text-5xl font-bold">
              {formatCurrency(costs)}
            </p>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />
          <span className="text-2xl text-muted-foreground md:hidden">=</span>

          {/* Profit/Loss */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {isProfitable ? "Profit" : "Loss"}
            </p>
            <p
              className={cn(
                "text-4xl md:text-5xl font-bold",
                isProfitable
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isProfitable ? "" : "-"}
              {formatCurrency(Math.abs(profit))}
            </p>
          </div>
        </div>

        {/* Margin Bar */}
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Margin</span>
            <span
              className={cn(
                "font-bold",
                margin >= 20
                  ? "text-emerald-600"
                  : margin >= 0
                  ? "text-amber-600"
                  : "text-red-600"
              )}
            >
              {margin.toFixed(1)}%
            </span>
          </div>
          <div className="h-4 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                margin >= 20
                  ? "bg-emerald-500"
                  : margin >= 0
                  ? "bg-amber-500"
                  : "bg-red-500"
              )}
              style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Collection Status */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Collected</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(collected)}
          </p>
        </div>

        <div
          className={cn(
            "p-6 rounded-xl border",
            outstanding > 0
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
              : "bg-card"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 mb-2",
              outstanding > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">Outstanding</span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              outstanding > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {formatCurrency(outstanding)}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Receipt className="h-5 w-5" />
            <span className="text-sm font-medium">Invoices</span>
          </div>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </div>
      </div>

      {/* Invoice List */}
      {invoices.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <p className="text-sm font-medium">Invoices</p>
          </div>
          <div className="divide-y">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(invoice.issueDate).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {formatCurrency(invoice.amount)}
                  </span>
                  {invoice.status === "paid" && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Paid
                    </span>
                  )}
                  {invoice.status === "sent" && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                  {invoice.status === "overdue" && (
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 dark:bg-red-950 px-2 py-1 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bills Summary */}
      {bills.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <p className="text-sm font-medium">
              Bills & Costs ({bills.length})
            </p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-bold">{formatCurrency(costs)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Total project costs from {bills.length} bill
              {bills.length !== 1 ? "s" : ""} and expenses
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {invoices.length === 0 && bills.length === 0 && (
        <div className="text-center py-16 px-8 rounded-xl border border-dashed">
          <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-2">
            No financial data yet
          </p>
          <p className="text-sm text-muted-foreground/70">
            Invoices and costs will appear here when added.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { ProjectStory, StoryStage } from "@/types/stories";

interface ChapterSettlementProps {
  story: ProjectStory;
  stages: StoryStage[];
}

interface InvoiceData {
  number: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
}

export function ChapterSettlement({ story, stages }: ChapterSettlementProps) {
  const invoicingStage = stages.find((s) => s.slug === "invoicing");
  const paymentStage = stages.find((s) => s.slug === "payment");
  const hasData = invoicingStage?.hasData || paymentStage?.hasData;

  // Extract financial data
  const financialData = useMemo(() => {
    const invoiceSubstep = invoicingStage?.substeps.find((s) => s.type === "metric");
    const data = invoiceSubstep?.data as {
      revenue?: number;
      costs?: number;
      profit?: number;
      margin?: number;
      invoices?: InvoiceData[];
    } | null;

    return {
      revenue: data?.revenue || 0,
      costs: data?.costs || 0,
      profit: data?.profit || 0,
      margin: data?.margin || 0,
      invoices: data?.invoices || [],
    };
  }, [invoicingStage]);

  const { revenue, costs, profit, margin, invoices } = financialData;
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

      {/* Financial Summary - Big Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {revenue > 0 ? `$${revenue.toLocaleString()}` : "—"}
          </p>
        </div>

        {/* Costs */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Receipt className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Costs</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {costs > 0 ? `$${costs.toLocaleString()}` : "—"}
          </p>
        </div>

        {/* Profit */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider">Profit</span>
          </div>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              isProfitable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {profit !== 0 ? `$${Math.abs(profit).toLocaleString()}` : "—"}
            {profit < 0 && profit !== 0 && (
              <span className="text-lg ml-1">loss</span>
            )}
          </p>
        </div>

        {/* Margin */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Margin</span>
          </div>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              margin >= 20
                ? "text-emerald-600 dark:text-emerald-400"
                : margin >= 10
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {margin > 0 ? `${margin.toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Visual Profit Bar */}
      {revenue > 0 && (
        <div className="p-6 rounded-xl bg-card border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Revenue Breakdown
          </p>
          <div className="h-8 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${Math.max(margin, 5)}%` }}
            >
              {margin >= 15 && "Profit"}
            </div>
            <div
              className="h-full bg-slate-400 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${Math.min(100 - margin, 95)}%` }}
            >
              Costs
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Profit: ${profit.toLocaleString()} ({margin.toFixed(1)}%)</span>
            <span>Costs: ${costs.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {invoices.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <p className="text-sm font-medium">Invoices</p>
          </div>
          <div className="divide-y">
            {invoices.map((invoice, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{invoice.number}</p>
                    <p className="text-xs text-muted-foreground">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    ${invoice.amount.toLocaleString()}
                  </span>
                  {invoice.status === "paid" && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid
                    </span>
                  )}
                  {invoice.status === "pending" && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3.5 w-3.5" />
                      Pending
                    </span>
                  )}
                  {invoice.status === "overdue" && (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasData && revenue === 0 && (
        <div className="text-center py-12 px-8 rounded-xl border border-dashed">
          <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No financial data yet for this project.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Invoices and payment information will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

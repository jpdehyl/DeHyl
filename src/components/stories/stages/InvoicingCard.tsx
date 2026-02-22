"use client";

import { motion } from "framer-motion";
import type { StorySubstep, StoryStage } from "@/types/stories";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { AnimatedCounter } from "../widgets/AnimatedCounter";
import { StatusPill } from "../widgets/StatusPill";
import { MetricCard } from "../widgets/MetricCard";

interface InvoicingCardProps {
  substep: StorySubstep;
  stage: StoryStage;
}

export function InvoicingCard({ substep }: InvoicingCardProps) {
  const data = substep.data as Record<string, unknown>;

  // Summary substep
  if (data.totalInvoiced !== undefined) {
    return <InvoicingSummaryView substep={substep} />;
  }

  // Individual invoice substep
  if (data.invoiceNumber !== undefined) {
    return <InvoiceDetailView substep={substep} />;
  }

  return (
    <div className="flex items-center justify-center h-full text-white/60">
      <p className="text-sm">{substep.title}</p>
    </div>
  );
}

function InvoicingSummaryView({ substep }: { substep: StorySubstep }) {
  const {
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    invoiceCount,
    overdueCount,
    paidPercentage,
  } = substep.data as {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
    overdueCount: number;
    paidPercentage: number;
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Invoicing
        </p>
        <p className="text-white/40 text-xs mt-1">
          {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"}
        </p>
      </motion.div>

      {/* Big total */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
        className="text-center"
      >
        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
          Total Invoiced
        </p>
        <div className="text-5xl font-black text-white leading-none">
          <AnimatedCounter value={totalInvoiced} formatter={formatCurrency} />
        </div>
      </motion.div>

      {/* Progress bar: paid % */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="px-2"
      >
        <div className="flex justify-between text-xs mb-2">
          <span className="text-white/50">Collected</span>
          <span className="text-white/70 font-medium">{paidPercentage}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${paidPercentage}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              paidPercentage >= 100
                ? "bg-emerald-500"
                : paidPercentage >= 50
                ? "bg-blue-500"
                : "bg-amber-500"
            )}
          />
        </div>
      </motion.div>

      {/* Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        <MetricCard
          label="Paid"
          value={totalPaid}
          formatter={formatCurrency}
          icon="✅"
        />
        <MetricCard
          label="Outstanding"
          value={totalOutstanding}
          formatter={formatCurrency}
          icon="⏳"
        />
      </motion.div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-center gap-3"
        >
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-red-300">
              {overdueCount} overdue {overdueCount === 1 ? "invoice" : "invoices"}
            </p>
            <p className="text-xs text-red-400/60 mt-0.5">
              Requires follow-up
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InvoiceDetailView({ substep }: { substep: StorySubstep }) {
  const {
    invoiceNumber,
    clientName,
    amount,
    balance,
    status,
    issueDate,
    dueDate,
  } = substep.data as {
    invoiceNumber: string;
    clientName: string;
    amount: number;
    balance: number;
    status: string;
    issueDate: string;
    dueDate: string;
  };

  const isPaid = status === "paid";
  const paidAmount = amount - balance;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      {/* Invoice header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Invoice
        </p>
        <h2 className="text-2xl font-bold text-white mt-1">
          #{invoiceNumber}
        </h2>
        <p className="text-white/40 text-sm mt-1">{clientName}</p>
      </motion.div>

      {/* Amount */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
        className="text-center"
      >
        <div className="text-4xl font-black text-white leading-none">
          <AnimatedCounter value={amount} formatter={formatCurrency} />
        </div>
      </motion.div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <StatusPill status={status} />
      </motion.div>

      {/* Details card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
      >
        <div className="flex justify-between">
          <span className="text-xs text-white/40">Issued</span>
          <span className="text-xs text-white/70">{formatDate(issueDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-white/40">Due</span>
          <span className="text-xs text-white/70">{formatDate(dueDate)}</span>
        </div>
        {!isPaid && (
          <>
            <div className="border-t border-white/5 pt-3 flex justify-between">
              <span className="text-xs text-white/40">Paid</span>
              <span className="text-xs text-emerald-400 font-medium">
                {formatCurrency(paidAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-white/40">Balance</span>
              <span className="text-xs text-amber-400 font-medium">
                {formatCurrency(balance)}
              </span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

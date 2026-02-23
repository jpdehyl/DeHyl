"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, ChevronUp, Lightbulb, Check, X, Link as LinkIcon, Unlink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectSelectorDialog } from "@/components/shared/project-selector-dialog";
import { InvoiceDetailDrawer } from "@/components/invoices/invoice-detail-drawer";
import { getDaysOverdue, getDaysUntilDue, formatCurrency, formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import type { InvoiceWithSuggestions, ProjectWithTotals, Invoice } from "@/types";

interface ClientGroup {
  clientName: string;
  totalBalance: number;
  overdueBalance: number;
  maxDaysOverdue: number;
  invoices: InvoiceWithSuggestions[];
}

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

function ReceivablesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialFilter = searchParams.get("filter") || "all";

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [invoices, setInvoices] = useState<InvoiceWithSuggestions[]>([]);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithSuggestions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Invoice detail drawer state
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [receivablesRes, projectsRes] = await Promise.all([
          fetch("/api/receivables"),
          fetch("/api/projects"),
        ]);
        if (!receivablesRes.ok) throw new Error("Failed to fetch receivables");
        if (!projectsRes.ok) throw new Error("Failed to fetch projects");

        const receivablesData = await receivablesRes.json();
        const projectsData = await projectsRes.json();

        const invoicesWithSuggestions: InvoiceWithSuggestions[] = (receivablesData.invoices || []).map(
          (inv: InvoiceWithSuggestions) => ({ ...inv, matchSuggestions: inv.matchSuggestions || [] })
        );

        setInvoices(invoicesWithSuggestions);
        setProjects(projectsData.projects || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load receivables");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAssign = useCallback(async (invoiceId: string, projectId: string | null) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) throw new Error("Failed to assign invoice");

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, projectId, matchConfidence: projectId ? "high" : null, matchSuggestions: projectId ? [] : inv.matchSuggestions }
            : inv
        )
      );
    } catch (error) {
      console.error("Failed to assign invoice:", error);
    }
  }, []);

  const handleDialogAssign = async (projectId: string | null) => {
    if (selectedInvoice) {
      await handleAssign(selectedInvoice.id, projectId);
    }
    setDialogOpen(false);
    setSelectedInvoice(null);
  };

  const openInvoiceClick = useCallback((inv: InvoiceWithSuggestions) => {
    setDrawerInvoiceId(inv.id);
    setDrawerOpen(true);
  }, []);

  const openAssignFromDrawer = useCallback((invoice: Invoice) => {
    // Find the full InvoiceWithSuggestions from our state
    const fullInv = invoices.find(i => i.id === invoice.id);
    if (fullInv) {
      setSelectedInvoice(fullInv);
    } else {
      setSelectedInvoice({ ...invoice, matchSuggestions: [] } as InvoiceWithSuggestions);
    }
    setDialogOpen(true);
  }, [invoices]);

  const openInvoices = useMemo(() =>
    invoices.filter(inv => inv.balance > 0),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    let result = openInvoices;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        (inv.memo?.toLowerCase().includes(q) ?? false)
      );
    }

    switch (filter) {
      case "overdue":
        result = result.filter(inv => getDaysOverdue(inv.dueDate) > 0);
        break;
      case "due-soon":
        result = result.filter(inv => { const d = getDaysUntilDue(inv.dueDate); return d >= 0 && d <= 7; });
        break;
      case "unassigned":
        result = result.filter(inv => inv.projectId === null);
        break;
    }

    return result;
  }, [openInvoices, search, filter]);

  const totals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return openInvoices.reduce(
      (acc, inv) => {
        acc.total += inv.balance;
        const daysOver = getDaysOverdue(inv.dueDate);
        if (daysOver > 0) { acc.overdue += inv.balance; acc.overdueCount++; }
        return acc;
      },
      { total: 0, overdue: 0, overdueCount: 0 }
    );
  }, [openInvoices]);

  // Aging buckets computation
  const agingBuckets = useMemo((): AgingBucket[] => {
    const buckets = {
      current: { label: "Current", amount: 0, count: 0, color: "bg-emerald-400/70" },
      "1-30": { label: "1-30 days", amount: 0, count: 0, color: "bg-amber-400/70" },
      "31-60": { label: "31-60 days", amount: 0, count: 0, color: "bg-orange-400/70" },
      "61-90": { label: "61-90 days", amount: 0, count: 0, color: "bg-red-400/70" },
      "90+": { label: "90+ days", amount: 0, count: 0, color: "bg-red-600/70" },
    };

    openInvoices.forEach(inv => {
      const daysOver = getDaysOverdue(inv.dueDate);
      if (daysOver <= 0) { buckets.current.amount += inv.balance; buckets.current.count++; }
      else if (daysOver <= 30) { buckets["1-30"].amount += inv.balance; buckets["1-30"].count++; }
      else if (daysOver <= 60) { buckets["31-60"].amount += inv.balance; buckets["31-60"].count++; }
      else if (daysOver <= 90) { buckets["61-90"].amount += inv.balance; buckets["61-90"].count++; }
      else { buckets["90+"].amount += inv.balance; buckets["90+"].count++; }
    });

    return Object.values(buckets);
  }, [openInvoices]);

  const maxBucketAmount = useMemo(() => Math.max(...agingBuckets.map(b => b.amount), 1), [agingBuckets]);
  const totalAgingAmount = useMemo(() => agingBuckets.reduce((sum, b) => sum + b.amount, 0), [agingBuckets]);

  const clientGroups = useMemo(() => {
    const groups = new Map<string, ClientGroup>();
    filteredInvoices.forEach(inv => {
      const name = inv.clientName;
      if (!groups.has(name)) {
        groups.set(name, { clientName: name, totalBalance: 0, overdueBalance: 0, maxDaysOverdue: 0, invoices: [] });
      }
      const g = groups.get(name)!;
      g.totalBalance += inv.balance;
      const daysOver = getDaysOverdue(inv.dueDate);
      if (daysOver > 0) { g.overdueBalance += daysOver > 0 ? inv.balance : 0; g.maxDaysOverdue = Math.max(g.maxDaysOverdue, daysOver); }
      g.invoices.push(inv);
    });
    return Array.from(groups.values()).sort((a, b) => b.totalBalance - a.totalBalance);
  }, [filteredInvoices]);

  const maxGroupBalance = useMemo(() => Math.max(...clientGroups.map(g => g.totalBalance), 1), [clientGroups]);

  if (loading) {
    return (
      <div>
        <Header title="Invoices" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 space-y-8">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-4 mt-12">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Invoices" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Invoices" />

      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-24">

        {/* Headline */}
        <div className="mb-2">
          <p className="font-serif text-5xl font-semibold tracking-tight tabular-nums leading-none text-foreground">
            {formatCurrency(totals.total)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            outstanding across {openInvoices.length} invoice{openInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Prose */}
        <p className="text-sm leading-relaxed text-muted-foreground mt-4 mb-8 max-w-lg">
          {totals.overdueCount > 0
            ? `${formatCurrency(totals.overdue)} is overdue across ${totals.overdueCount} invoice${totals.overdueCount !== 1 ? "s" : ""}. ${clientGroups.filter(g => g.maxDaysOverdue > 60).length > 0 ? `${clientGroups.filter(g => g.maxDaysOverdue > 60).length} client${clientGroups.filter(g => g.maxDaysOverdue > 60).length !== 1 ? "s" : ""} 60+ days overdue.` : ""}`
            : "All invoices are current. No overdue balances."
          }
        </p>

        {/* Aging Buckets Chart */}
        {openInvoices.length > 0 && (
          <div className="mb-12">
            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden bg-muted/20 mb-3">
              {agingBuckets.map((bucket) => {
                const pct = totalAgingAmount > 0 ? (bucket.amount / totalAgingAmount) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={bucket.label}
                    className={cn("h-full transition-all", bucket.color)}
                    style={{ width: `${pct}%` }}
                    title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {agingBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("h-2 w-2 rounded-full", bucket.color)} />
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(bucket.amount)}
                  </span>
                  {bucket.count > 0 && (
                    <span className="text-muted-foreground/50">({bucket.count})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue callout */}
        {totals.overdue > 0 && (
          <div className="pl-5 border-l-2 border-red-300 dark:border-red-800 py-2 mb-10">
            <p className="font-medium text-red-700 dark:text-red-400">
              {formatCurrency(totals.overdue)} overdue
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totals.overdueCount} invoice{totals.overdueCount !== 1 ? "s" : ""} past due date
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm border-muted/50"
            />
          </div>
          {["all", "overdue", "due-soon", "unassigned"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-colors",
                filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All" : f === "overdue" ? "Overdue" : f === "due-soon" ? "Due soon" : "Unassigned"}
            </button>
          ))}
        </div>

        {/* Client groups */}
        <div className="space-y-1">
          {clientGroups.map((group) => {
            const isExpanded = expandedClient === group.clientName;
            const barPct = (group.totalBalance / maxGroupBalance) * 100;
            const overduePct = group.totalBalance > 0 ? (group.overdueBalance / group.totalBalance) * 100 : 0;

            return (
              <div key={group.clientName} className="border-b border-muted/30 last:border-0">
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : group.clientName)}
                  className="w-full py-4 -mx-3 px-3 hover:bg-muted/20 rounded-sm transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{group.clientName}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {group.invoices.length} invoice{group.invoices.length !== 1 ? "s" : ""}
                        {group.maxDaysOverdue > 0 && (
                          <span className="text-red-600 dark:text-red-400"> &middot; {group.maxDaysOverdue}d overdue</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-serif text-lg font-semibold tabular-nums tracking-tight">
                        {formatCurrency(group.totalBalance)}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Bar with overdue portion */}
                  <div className="mt-3 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${barPct}%` }}>
                      {overduePct > 0 && (
                        <div className="h-full bg-red-400/60" style={{ width: `${overduePct}%` }} />
                      )}
                      <div className="h-full bg-emerald-400/60 flex-1" />
                    </div>
                  </div>
                </button>

                {/* Expanded invoices */}
                {isExpanded && (
                  <div className="pb-4 px-3 -mx-3">
                    <div className="ml-4 border-l border-muted/40 pl-4 space-y-1">
                      {group.invoices
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .map(inv => {
                          const daysOver = getDaysOverdue(inv.dueDate);
                          const project = projects.find(p => p.id === inv.projectId);

                          return (
                            <div key={inv.id} className="flex items-center justify-between py-2 text-sm gap-4 group/row hover:bg-muted/10 -mx-2 px-2 rounded-sm transition-colors">
                              <div className="min-w-0 flex-1">
                                {/* Invoice number - clickable to open drawer */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openInvoiceClick(inv); }}
                                  className="text-foreground font-medium hover:underline hover:text-primary transition-colors"
                                >
                                  {inv.invoiceNumber}
                                </button>
                                <span className="text-muted-foreground ml-2">
                                  due {formatDate(inv.dueDate)}
                                  {daysOver > 0 && (
                                    <span className="text-red-600 dark:text-red-400 ml-1">({daysOver}d overdue)</span>
                                  )}
                                </span>

                                {/* Assigned project - clickable to reassign */}
                                {project && (
                                  <span className="ml-2 inline-flex items-center gap-1">
                                    <span className="text-muted-foreground">&middot;</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoice(inv);
                                        setDialogOpen(true);
                                      }}
                                      className="text-muted-foreground hover:text-primary hover:underline transition-colors inline-flex items-center gap-0.5"
                                      title="Click to reassign or unassign"
                                    >
                                      {project.code}
                                    </button>
                                    {/* Quick unassign button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssign(inv.id, null);
                                      }}
                                      className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-0.5"
                                      title="Unassign from project"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                )}

                                {/* Match suggestion */}
                                {!project && inv.matchSuggestions.length > 0 && (
                                  <span className="text-amber-600 ml-2 inline-flex items-center gap-0.5">
                                    <Lightbulb className="h-3 w-3" />
                                    {inv.matchSuggestions[0].projectCode}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAssign(inv.id, inv.matchSuggestions[0].projectId); }}
                                      className="ml-1 text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                  </span>
                                )}

                                {/* Unassigned - assign button */}
                                {!project && inv.matchSuggestions.length === 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setDialogOpen(true); }}
                                    className="text-muted-foreground hover:text-foreground ml-2 inline-flex items-center gap-0.5"
                                  >
                                    <LinkIcon className="h-3 w-3" /> assign
                                  </button>
                                )}
                              </div>
                              <span className={cn(
                                "tabular-nums font-medium shrink-0",
                                daysOver > 0 && "text-red-600 dark:text-red-400"
                              )}>
                                {formatCurrency(inv.balance)}
                              </span>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {clientGroups.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">No outstanding invoices</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice detail drawer */}
      <InvoiceDetailDrawer
        invoiceId={drawerInvoiceId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projects={projects}
        onAssign={handleAssign}
        onOpenAssignDialog={openAssignFromDrawer}
      />

      {/* Project assignment dialog */}
      <ProjectSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        currentProjectId={selectedInvoice?.projectId ?? null}
        suggestions={selectedInvoice?.matchSuggestions ?? []}
        onSelect={handleDialogAssign}
        title="Assign Invoice to Project"
        description={
          selectedInvoice
            ? `Link invoice ${selectedInvoice.invoiceNumber} (${formatCurrency(selectedInvoice.amount)}) to a project.`
            : "Select a project."
        }
      />
    </div>
  );
}

export default function ReceivablesPage() {
  return (
    <Suspense fallback={
      <div>
        <Header title="Invoices" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
          <Skeleton className="h-16 w-64" />
        </div>
      </div>
    }>
      <ReceivablesContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { InvoicesTable, InvoicesSummary, InvoicesFilters } from "@/components/invoices";
import { useAppStore } from "@/lib/store";
import { cn, getDaysOverdue, getDaysUntilDue } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceWithSuggestions, ProjectWithTotals } from "@/types";

function ReceivablesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sidebarOpen } = useAppStore();

  const initialFilter = searchParams.get("filter") || "all";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [invoices, setInvoices] = useState<InvoiceWithSuggestions[]>([]);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from APIs
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [receivablesRes, projectsRes] = await Promise.all([
          fetch("/api/receivables"),
          fetch("/api/projects"),
        ]);

        if (!receivablesRes.ok) {
          throw new Error("Failed to fetch receivables");
        }
        if (!projectsRes.ok) {
          throw new Error("Failed to fetch projects");
        }

        const receivablesData = await receivablesRes.json();
        const projectsData = await projectsRes.json();

        // Transform invoices to InvoiceWithSuggestions format
        const invoicesWithSuggestions: InvoiceWithSuggestions[] = (receivablesData.invoices || []).map(
          (inv: InvoiceWithSuggestions) => ({
            ...inv,
            matchSuggestions: inv.matchSuggestions || [],
          })
        );

        setInvoices(invoicesWithSuggestions);
        setProjects(projectsData.projects || []);
      } catch (err) {
        console.error("Error fetching receivables:", err);
        setError(err instanceof Error ? err.message : "Failed to load receivables");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle invoice assignment
  const handleAssign = useCallback(async (invoiceId: string, projectId: string | null) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign invoice");
      }

      // Update local state optimistically
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                projectId,
                matchConfidence: projectId ? "high" : null,
                matchSuggestions: projectId ? [] : inv.matchSuggestions,
              }
            : inv
        )
      );

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error("Failed to assign invoice:", error);
    }
  }, [router]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Only show open invoices (balance > 0)
      if (invoice.balance === 0) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.clientName.toLowerCase().includes(searchLower) ||
          (invoice.memo?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      const daysOverdue = getDaysOverdue(invoice.dueDate);
      const daysUntil = getDaysUntilDue(invoice.dueDate);

      switch (filter) {
        case "overdue":
          if (daysOverdue <= 0) return false;
          break;
        case "due-soon":
          if (daysUntil < 0 || daysUntil > 7) return false;
          break;
        case "unassigned":
          if (invoice.projectId !== null) return false;
          break;
      }

      return true;
    });
  }, [invoices, search, filter]);

  if (loading) {
    return (
      <div className={cn("transition-all duration-300")}>
        <Header
          title="Receivables"
          description="Invoices owed to DeHyl"
        />
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("transition-all duration-300")}>
        <Header
          title="Receivables"
          description="Invoices owed to DeHyl"
        />
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

  return (
    <div
      className={cn(
        "transition-all duration-300",
        sidebarOpen ? "md:ml-0" : "md:ml-0"
      )}
    >
      <Header
        title="Receivables"
        description="Invoices owed to DeHyl"
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary */}
        <InvoicesSummary invoices={filteredInvoices} />

        {/* Filters */}
        <InvoicesFilters
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
        />

        {/* Table */}
        <InvoicesTable
          invoices={filteredInvoices}
          projects={projects}
          onAssign={handleAssign}
        />
      </div>
    </div>
  );
}

function ReceivablesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function ReceivablesPage() {
  return (
    <Suspense fallback={<ReceivablesLoading />}>
      <ReceivablesContent />
    </Suspense>
  );
}

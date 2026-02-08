"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BillsTable, BillsSummary, BillsFilters } from "@/components/bills";
import { useAppStore } from "@/lib/store";
import { cn, getDaysOverdue, getDaysUntilDue } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bill, ProjectWithTotals } from "@/types";

function PayablesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sidebarOpen } = useAppStore();

  const initialFilter = searchParams.get("filter") || "all";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [bills, setBills] = useState<Bill[]>([]);
  const [projects, setProjects] = useState<ProjectWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from APIs
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [payablesRes, projectsRes] = await Promise.all([
          fetch("/api/payables"),
          fetch("/api/projects"),
        ]);

        if (!payablesRes.ok) {
          throw new Error("Failed to fetch payables");
        }
        if (!projectsRes.ok) {
          throw new Error("Failed to fetch projects");
        }

        const payablesData = await payablesRes.json();
        const projectsData = await projectsRes.json();

        setBills(payablesData.bills || []);
        setProjects(projectsData.projects || []);
      } catch (err) {
        console.error("Error fetching payables:", err);
        setError(err instanceof Error ? err.message : "Failed to load payables");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle bill assignment
  const handleAssign = useCallback(async (billId: string, projectId: string | null) => {
    try {
      const response = await fetch(`/api/bills/${billId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign bill");
      }

      // Update local state optimistically
      setBills((prev) =>
        prev.map((bill) =>
          bill.id === billId
            ? { ...bill, projectId }
            : bill
        )
      );

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error("Failed to assign bill:", error);
    }
  }, [router]);

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // Only show open bills (balance > 0)
      if (bill.balance === 0) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          bill.vendorName.toLowerCase().includes(searchLower) ||
          (bill.memo?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      const daysOverdue = getDaysOverdue(bill.dueDate);
      const daysUntil = getDaysUntilDue(bill.dueDate);

      switch (filter) {
        case "overdue":
          if (daysOverdue <= 0) return false;
          break;
        case "due-soon":
          if (daysUntil < 0 || daysUntil > 7) return false;
          break;
        case "unassigned":
          if (bill.projectId !== null) return false;
          break;
      }

      return true;
    });
  }, [bills, search, filter]);

  if (loading) {
    return (
      <div className={cn("transition-all duration-300")}>
        <Header title="Payables" description="Bills DeHyl owes" />
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
        <Header title="Payables" description="Bills DeHyl owes" />
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
      <Header title="Payables" description="Bills DeHyl owes" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary */}
        <BillsSummary bills={filteredBills} />

        {/* Filters */}
        <BillsFilters
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
        />

        {/* Table */}
        <BillsTable
          bills={filteredBills}
          projects={projects}
          onAssign={handleAssign}
        />
      </div>
    </div>
  );
}

function PayablesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function PayablesPage() {
  return (
    <Suspense fallback={<PayablesLoading />}>
      <PayablesContent />
    </Suspense>
  );
}

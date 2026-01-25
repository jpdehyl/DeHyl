"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BidsTable, BidsFilters, BidsSummary, NewBidDialog } from "@/components/bids";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Bid } from "@/types";

export default function BidsPage() {
  const { sidebarOpen } = useAppStore();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBidDialogOpen, setNewBidDialogOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [client, setClient] = useState("all");

  // Fetch bids from API
  const fetchBids = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bids");
      if (!response.ok) {
        throw new Error("Failed to fetch bids");
      }
      const data = await response.json();
      setBids(data.bids || []);
    } catch (err) {
      console.error("Error fetching bids:", err);
      setError(err instanceof Error ? err.message : "Failed to load bids");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // Handle new bid created
  const handleBidCreated = useCallback((bid: Bid) => {
    setBids((prev) => [bid, ...prev]);
  }, []);

  // Get unique clients
  const clients = useMemo(() => {
    const uniqueClients = new Set(
      bids.filter((b) => b.clientCode).map((b) => b.clientCode!)
    );
    return Array.from(uniqueClients).sort();
  }, [bids]);

  // Filter bids
  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          bid.name.toLowerCase().includes(searchLower) ||
          (bid.clientCode?.toLowerCase().includes(searchLower) ?? false) ||
          (bid.clientName?.toLowerCase().includes(searchLower) ?? false) ||
          (bid.description?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (status !== "all" && bid.status !== status) {
        return false;
      }

      // Client filter
      if (client !== "all" && bid.clientCode !== client) {
        return false;
      }

      return true;
    });
  }, [bids, search, status, client]);

  if (loading) {
    return (
      <div className={cn("transition-all duration-300")}>
        <Header
          title="Bids"
          description="Track bid submissions and conversion rates"
        />
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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
          title="Bids"
          description="Track bid submissions and conversion rates"
        />
        <div className="p-4 md:p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
              Make sure Google Drive is connected in Settings, then sync your bids.
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
        title="Bids"
        description="Track bid submissions and conversion rates"
        action={
          <Button size="sm" className="gap-2" onClick={() => setNewBidDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Bid
          </Button>
        }
      />

      {/* New Bid Dialog */}
      <NewBidDialog
        open={newBidDialogOpen}
        onOpenChange={setNewBidDialogOpen}
        onBidCreated={handleBidCreated}
        clients={clients}
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary */}
        <BidsSummary bids={filteredBids} />

        {/* Filters */}
        <BidsFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          client={client}
          onClientChange={setClient}
          clients={clients}
        />

        {/* Table */}
        <BidsTable bids={filteredBids} />
      </div>
    </div>
  );
}

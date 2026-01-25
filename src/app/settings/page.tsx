"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, FolderSync, Gavel } from "lucide-react";
import { Header } from "@/components/layout/header";
import { ConnectionCard, ClientMappings } from "@/components/settings";
import { mockClientMappings } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectionStatus {
  quickbooks: {
    connected: boolean;
    companyName?: string;
    lastSyncedAt?: string;
  };
  googleDrive: {
    connected: boolean;
    email?: string;
    lastSyncedAt?: string;
  };
}

export default function SettingsPage() {
  const { sidebarOpen, connections, setConnections } = useAppStore();
  const [isSyncingQB, setIsSyncingQB] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isSyncingBids, setIsSyncingBids] = useState(false);
  const [bidsLastSyncedAt, setBidsLastSyncedAt] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Fetch connection status from API
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data: ConnectionStatus = await res.json();
        setConnections({
          quickbooks: {
            connected: data.quickbooks.connected,
            companyName: data.quickbooks.companyName,
            lastSyncedAt: data.quickbooks.lastSyncedAt
              ? new Date(data.quickbooks.lastSyncedAt)
              : undefined,
          },
          googleDrive: {
            connected: data.googleDrive.connected,
            email: data.googleDrive.email,
            lastSyncedAt: data.googleDrive.lastSyncedAt
              ? new Date(data.googleDrive.lastSyncedAt)
              : undefined,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    }
  }, [setConnections]);

  // Fetch bids last sync time
  const fetchBidsLastSync = useCallback(async () => {
    try {
      const res = await fetch("/api/bids");
      if (res.ok) {
        const data = await res.json();
        if (data.lastSyncedAt) {
          setBidsLastSyncedAt(new Date(data.lastSyncedAt));
        }
      }
    } catch (error) {
      console.error("Failed to fetch bids sync status:", error);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    fetchBidsLastSync();
  }, [fetchConnections, fetchBidsLastSync]);

  const handleConnectQuickBooks = () => {
    window.location.href = "/api/auth/quickbooks";
  };

  const handleDisconnectQuickBooks = async () => {
    // TODO: Implement token deletion endpoint
    setConnections({
      ...connections,
      quickbooks: {
        connected: false,
        companyName: undefined,
        lastSyncedAt: undefined,
      },
    });
  };

  const handleSyncQuickBooks = async () => {
    setIsSyncingQB(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync/quickbooks", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.invoices_synced} invoices and ${data.bills_synced} bills`);
        await fetchConnections();
      } else {
        setSyncMessage(data.error || "Sync failed");
      }
    } catch (error) {
      setSyncMessage("Sync failed - network error");
    }
    setIsSyncingQB(false);
  };

  const handleConnectGoogleDrive = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnectGoogleDrive = async () => {
    // TODO: Implement token deletion endpoint
    setConnections({
      ...connections,
      googleDrive: {
        connected: false,
        email: undefined,
        lastSyncedAt: undefined,
      },
    });
  };

  const handleSyncGoogleDrive = async () => {
    setIsSyncingDrive(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync/projects", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.projects_synced} projects`);
        await fetchConnections();
      } else {
        setSyncMessage(data.error || "Sync failed");
      }
    } catch (error) {
      setSyncMessage("Sync failed - network error");
    }
    setIsSyncingDrive(false);
  };

  const handleSyncBids = async () => {
    setIsSyncingBids(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync/bids", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.bids_synced} bids`);
        await fetchBidsLastSync();
      } else {
        setSyncMessage(data.error || "Bids sync failed");
      }
    } catch (error) {
      setSyncMessage("Bids sync failed - network error");
    }
    setIsSyncingBids(false);
  };

  return (
    <div
      className={cn(
        "transition-all duration-300",
        sidebarOpen ? "md:ml-0" : "md:ml-0"
      )}
    >
      <Header title="Settings" description="Manage connections and configuration" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Sync Message */}
        {syncMessage && (
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm">{syncMessage}</p>
          </div>
        )}
        {/* Connections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Connections</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ConnectionCard
              title="QuickBooks"
              description="Sync invoices and bills from QuickBooks Online"
              icon={<FileSpreadsheet className="h-6 w-6" />}
              connected={connections.quickbooks.connected}
              details={
                connections.quickbooks.connected
                  ? {
                      label: "Company",
                      value: connections.quickbooks.companyName || "Unknown",
                    }
                  : undefined
              }
              lastSyncedAt={connections.quickbooks.lastSyncedAt}
              onConnect={handleConnectQuickBooks}
              onDisconnect={handleDisconnectQuickBooks}
              onSync={handleSyncQuickBooks}
              isSyncing={isSyncingQB}
            />
            <ConnectionCard
              title="Google Drive"
              description="Sync project folders from Google Drive"
              icon={<FolderSync className="h-6 w-6" />}
              connected={connections.googleDrive.connected}
              details={
                connections.googleDrive.connected
                  ? {
                      label: "Connected as",
                      value: connections.googleDrive.email || "Unknown",
                    }
                  : undefined
              }
              lastSyncedAt={connections.googleDrive.lastSyncedAt}
              onConnect={handleConnectGoogleDrive}
              onDisconnect={handleDisconnectGoogleDrive}
              onSync={handleSyncGoogleDrive}
              isSyncing={isSyncingDrive}
            />
          </div>
        </div>

        {/* Sync Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Sync Actions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Gavel className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sync Bids</CardTitle>
                    <CardDescription>
                      Sync bids from Google Drive Bids folder
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {bidsLastSyncedAt ? (
                      <>Last synced: {bidsLastSyncedAt.toLocaleString()}</>
                    ) : (
                      <>Never synced</>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSyncBids}
                    disabled={isSyncingBids || !connections.googleDrive.connected}
                  >
                    {isSyncingBids ? "Syncing..." : "Sync Bids"}
                  </Button>
                </div>
                {!connections.googleDrive.connected && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Connect Google Drive first to sync bids
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Client Mappings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Client Code Mappings</h2>
          <ClientMappings mappings={mockClientMappings} />
        </div>
      </div>
    </div>
  );
}

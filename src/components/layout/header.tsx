"use client";

import { useEffect } from "react";
import { RefreshCw, Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { useAppStore } from "@/lib/store";
import { cn, getRelativeTime } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  const {
    isSyncing,
    lastSyncedAt,
    setSyncing,
    setLastSyncedAt,
    sidebarOpen,
    setMobileNavOpen,
  } = useAppStore();

  useEffect(() => {
    async function fetchSyncStatus() {
      try {
        const res = await fetch("/api/sync/status");
        if (res.ok) {
          const data = await res.json();
          if (data.lastSynced) {
            setLastSyncedAt(new Date(data.lastSynced));
          }
        }
      } catch {
      }
    }
    if (!lastSyncedAt) {
      fetchSyncStatus();
    }
  }, [lastSyncedAt, setLastSyncedAt]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/cron/sync", { method: "GET" });
      if (res.ok) {
        setLastSyncedAt(new Date());
      }
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header
      className={cn(
        "flex h-14 items-center gap-4 px-5 md:px-6 transition-all duration-300",
        sidebarOpen ? "md:pl-64" : "md:pl-16"
      )}
    >
      <button
        className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold font-serif tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>

      {action && <div className="hidden sm:block">{action}</div>}

      <div className="flex items-center gap-1.5">
        {lastSyncedAt && (
          <span className="hidden sm:inline text-xs text-muted-foreground/60">
            {getRelativeTime(lastSyncedAt)}
          </span>
        )}

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Sync data"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
        </button>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

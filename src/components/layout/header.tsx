"use client";

import { RefreshCw, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync - in production this would call the actual sync API
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLastSyncedAt(new Date());
    setSyncing(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 transition-all duration-300",
        sidebarOpen ? "md:pl-64" : "md:pl-16"
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Title */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Page-specific action */}
      {action && <div className="hidden sm:block">{action}</div>}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Last synced */}
        {lastSyncedAt && (
          <span className="hidden sm:inline text-xs text-muted-foreground">
            Synced {getRelativeTime(lastSyncedAt)}
          </span>
        )}

        {/* Sync button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw
            className={cn("h-4 w-4", isSyncing && "animate-spin")}
          />
          <span className="hidden sm:inline">
            {isSyncing ? "Syncing..." : "Sync"}
          </span>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}

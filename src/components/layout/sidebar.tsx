"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/store";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Bids",
    href: "/bids",
    icon: FileText,
  },
  {
    title: "Receivables",
    href: "/receivables",
    icon: Receipt,
  },
  {
    title: "Payables",
    href: "/payables",
    icon: CreditCard,
  },
  {
    title: "Profitability",
    href: "/profitability",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              "flex h-16 items-center border-b px-4",
              sidebarOpen ? "justify-between" : "justify-center"
            )}
          >
            {sidebarOpen && (
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  D
                </div>
                <span className="font-semibold text-lg">DeHyl</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebar}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="grid gap-1 px-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                if (!sidebarOpen) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors mx-auto",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="sr-only">{item.title}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          {sidebarOpen && (
            <div className="border-t p-4">
              <p className="text-xs text-muted-foreground">
                DeHyl Constructors Corp
              </p>
              <p className="text-xs text-muted-foreground">
                Burnaby, BC
              </p>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

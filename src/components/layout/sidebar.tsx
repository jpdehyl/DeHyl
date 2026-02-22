"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/" },
  { title: "Projects", href: "/projects" },
  { title: "Stories", href: "/stories" },
  { title: "Costs", href: "/expenses" },
  { title: "Invoices", href: "/receivables" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300",
        sidebarOpen ? "w-60 border-r border-sidebar-border" : "w-14"
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-14 items-center",
            sidebarOpen ? "justify-between px-5" : "justify-center"
          )}
        >
          {sidebarOpen && (
            <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-foreground">
              DeHyl
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className={cn("flex-1 py-4", sidebarOpen ? "px-3" : "px-1.5")}>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              if (!sidebarOpen) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex h-9 w-full items-center justify-center rounded-md text-xs font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={item.title}
                  >
                    {item.title.charAt(0)}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>

        {sidebarOpen && (
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground/60">
              DeHyl Constructors Corp
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

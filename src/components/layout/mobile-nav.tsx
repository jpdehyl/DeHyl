"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  CreditCard,
  Settings,
  X,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useAppStore();

  if (!mobileNavOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 md:hidden"
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r md:hidden animate-in slide-in-from-left">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={() => setMobileNavOpen(false)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                D
              </div>
              <span className="font-semibold text-lg">DeHyl</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="grid gap-1 px-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
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
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">
              DeHyl Constructors Corp
            </p>
            <p className="text-xs text-muted-foreground">Burnaby, BC</p>
          </div>
        </div>
      </div>
    </>
  );
}

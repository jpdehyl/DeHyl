"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <main
      className={cn(
        "min-h-screen transition-all duration-300",
        sidebarOpen ? "md:pl-60" : "md:pl-14"
      )}
    >
      {children}
    </main>
  );
}

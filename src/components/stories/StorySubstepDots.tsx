"use client";

import { cn } from "@/lib/utils";

interface StorySubstepDotsProps {
  total: number;
  current: number;
}

export function StorySubstepDots({ total, current }: StorySubstepDotsProps) {
  if (total <= 1) return null;

  return (
    <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center gap-1.5 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-200",
            i === current
              ? "w-6 h-1.5 bg-white"
              : "w-1.5 h-1.5 bg-white/40"
          )}
        />
      ))}
    </div>
  );
}

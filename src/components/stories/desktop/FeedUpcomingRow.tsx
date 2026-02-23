"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UpcomingProjectCard } from "./UpcomingProjectCard";
import type { UpcomingProject } from "@/types/stories";

interface FeedUpcomingRowProps {
  projects: UpcomingProject[];
}

export function FeedUpcomingRow({ projects }: FeedUpcomingRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (projects.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 260;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {/* Scroll buttons */}
      {projects.length > 3 && (
        <>
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background border shadow-sm hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
      >
        {projects.map((project) => (
          <UpcomingProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

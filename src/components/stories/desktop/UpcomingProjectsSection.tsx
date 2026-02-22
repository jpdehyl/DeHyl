"use client";

import { useStoryStore } from "@/lib/stores/story-store";
import { UpcomingProjectCard } from "./UpcomingProjectCard";
import { Loader2, Gavel } from "lucide-react";

export function UpcomingProjectsSection() {
  const { upcomingProjects, feedLoading } = useStoryStore();

  if (feedLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading bids...</span>
        </div>
      </div>
    );
  }

  if (upcomingProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Gavel className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">No upcoming bids</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Draft and submitted bids will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {upcomingProjects.map((project) => (
          <UpcomingProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useStoryStore } from "@/lib/stores/story-store";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StoryFilterBarProps {
  clientCodes: string[];
}

export function StoryFilterBar({ clientCodes }: StoryFilterBarProps) {
  const { storyFilters, setStoryFilter } = useStoryStore();

  const statusOptions = [
    { value: "all" as const, label: "All" },
    { value: "active" as const, label: "Active" },
    { value: "closed" as const, label: "Closed" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          value={storyFilters.search}
          onChange={(e) => setStoryFilter("search", e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {storyFilters.search && (
          <button
            onClick={() => setStoryFilter("search", "")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Status quick-filters */}
      <div className="flex gap-1">
        {statusOptions.map((opt) => (
          <Badge
            key={opt.value}
            variant={storyFilters.status === opt.value ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-xs transition-colors",
              storyFilters.status === opt.value
                ? ""
                : "hover:bg-accent"
            )}
            onClick={() => setStoryFilter("status", opt.value)}
          >
            {opt.label}
          </Badge>
        ))}
      </div>

      {/* Client code filter */}
      {clientCodes.length > 1 && (
        <div className="flex gap-1">
          <Badge
            variant={storyFilters.clientCode === null ? "default" : "outline"}
            className="cursor-pointer text-xs transition-colors hover:bg-accent"
            onClick={() => setStoryFilter("clientCode", null)}
          >
            All Clients
          </Badge>
          {clientCodes.map((code) => (
            <Badge
              key={code}
              variant={storyFilters.clientCode === code ? "default" : "outline"}
              className="cursor-pointer text-xs transition-colors hover:bg-accent"
              onClick={() => setStoryFilter("clientCode", code)}
            >
              {code}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

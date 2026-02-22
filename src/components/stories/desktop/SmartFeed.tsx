"use client";

import { useStoryStore } from "@/lib/stores/story-store";
import { FeedCard } from "./FeedCard";
import { FeedUpcomingRow } from "./FeedUpcomingRow";
import { Loader2, Sparkles, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import type { FeedCard as FeedCardData, FeedPriority } from "@/types/stories";

interface FeedSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cards: FeedCardData[];
  priorities: FeedPriority[];
}

function groupCardsBySections(cards: FeedCardData[]): FeedSection[] {
  const sections: FeedSection[] = [
    {
      id: "attention",
      title: "Needs Attention",
      icon: AlertTriangle,
      cards: cards.filter((c) => c.priority === "critical" || c.priority === "high"),
      priorities: ["critical", "high"],
    },
    {
      id: "updates",
      title: "Recent Updates",
      icon: Clock,
      cards: cards.filter((c) => c.priority === "medium"),
      priorities: ["medium"],
    },
    {
      id: "highlights",
      title: "Project Highlights",
      icon: BarChart3,
      cards: cards.filter((c) => c.priority === "info"),
      priorities: ["info"],
    },
  ];

  return sections.filter((s) => s.cards.length > 0);
}

export function SmartFeed() {
  const { feedCards, feedLoading, upcomingProjects } = useStoryStore();

  if (feedLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Building your feed...</span>
        </div>
      </div>
    );
  }

  if (feedCards.length === 0 && upcomingProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">All caught up!</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          No items need your attention right now.
        </p>
      </div>
    );
  }

  const sections = groupCardsBySections(feedCards);

  return (
    <div className="space-y-8 mt-6">
      {/* Feed sections */}
      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.id}>
            <div className="flex items-center gap-2 mb-3">
              <SectionIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {section.title}
              </h2>
              <span className="text-xs text-muted-foreground">
                ({section.cards.length})
              </span>
            </div>

            {/* Critical/High cards in 2-column grid, others in single column */}
            {section.id === "attention" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {section.cards.map((card) => (
                  <FeedCard key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {section.cards.slice(0, 8).map((card) => (
                  <FeedCard key={card.id} card={card} />
                ))}
                {section.cards.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{section.cards.length - 8} more items
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Upcoming bids section */}
      {upcomingProjects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Upcoming Bids
            </h2>
            <span className="text-xs text-muted-foreground">
              ({upcomingProjects.length})
            </span>
          </div>
          <FeedUpcomingRow projects={upcomingProjects} />
        </div>
      )}
    </div>
  );
}

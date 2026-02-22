"use client";

import type { ProjectStory } from "@/types/stories";
import { NarrativeStageSection } from "./NarrativeStageSection";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface NarrativeStoryViewProps {
  story: ProjectStory;
}

export function NarrativeStoryView({ story }: NarrativeStoryViewProps) {
  const formattedDate = new Date(story.lastUpdated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="prose-container">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <Badge
            variant={story.status === "active" ? "default" : "secondary"}
            className="text-xs font-normal"
          >
            {story.status === "active" ? "In Progress" : "Completed"}
          </Badge>
          <span className="text-xs text-muted-foreground">{story.clientCode}</span>
        </div>

        <h2 className="text-2xl font-serif font-bold text-foreground leading-tight mb-2">
          {story.projectName || story.projectCode}
        </h2>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{story.clientName}</span>
          <span className="text-muted-foreground/40">|</span>
          <span>{story.projectCode}</span>
          <span className="text-muted-foreground/40">|</span>
          <time dateTime={story.lastUpdated.toString()}>Updated {formattedDate}</time>
        </div>
      </header>

      <div className="space-y-0">
        {story.stages.map((stage, index) => (
          <NarrativeStageSection
            key={stage.slug}
            stage={stage}
            isLast={index === story.stages.length - 1}
            stageNumber={index + 1}
          />
        ))}
      </div>

      {story.stages.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            No data recorded yet for this project.
          </p>
        </div>
      )}
    </article>
  );
}

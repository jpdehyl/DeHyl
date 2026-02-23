"use client";

import { useStoryStore } from "@/lib/stores/story-store";
import { DesktopStageCard } from "./DesktopStageCard";
import type { ProjectStory, LifecycleStage } from "@/types/stories";

interface StageCardGridProps {
  story: ProjectStory;
  onScrollToHero: () => void;
}

export function StageCardGrid({ story, onScrollToHero }: StageCardGridProps) {
  const { expandedStageSlug, setExpandedStageSlug } = useStoryStore();

  const handleCardClick = (slug: LifecycleStage) => {
    setExpandedStageSlug(slug);
    // Scroll hero into view
    onScrollToHero();
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Lifecycle Stages
      </h2>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
        {story.stages.map((stage) => (
          <DesktopStageCard
            key={stage.slug}
            stage={stage}
            isExpanded={expandedStageSlug === stage.slug}
            onClick={() => handleCardClick(stage.slug)}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useStoryStore } from "@/lib/stores/story-store";
import { STAGE_GRADIENTS, getStageConfig } from "@/lib/stories/stage-config";
import { StoryCard } from "@/components/stories/StoryCard";
import { StageIcon } from "./StageIconResolver";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProjectStory } from "@/types/stories";

interface DesktopStoryHeroProps {
  story: ProjectStory;
}

export function DesktopStoryHero({ story }: DesktopStoryHeroProps) {
  const {
    currentStageIndex,
    currentSubstepIndex,
    expandedStageSlug,
    nextSubstep,
    prevSubstep,
  } = useStoryStore();

  const currentStage = story.stages[currentStageIndex] ?? null;

  // If a stage is expanded, use that; otherwise use the first stage
  const displayStage = expandedStageSlug
    ? story.stages.find((s) => s.slug === expandedStageSlug) ?? currentStage
    : currentStage;

  const displayStageIndex = displayStage
    ? story.stages.findIndex((s) => s.slug === displayStage.slug)
    : 0;

  const config = displayStage ? getStageConfig(displayStage.slug) : null;
  const gradient = displayStage
    ? STAGE_GRADIENTS[displayStage.slug] || "from-slate-900 to-slate-950"
    : "from-slate-900 to-slate-950";

  const totalSubsteps = displayStage?.substeps.length ?? 0;

  const handlePrevSubstep = useCallback(() => {
    prevSubstep();
  }, [prevSubstep]);

  const handleNextSubstep = useCallback(() => {
    nextSubstep();
  }, [nextSubstep]);

  if (!displayStage) {
    return (
      <Card className="mt-6 p-8 text-center text-muted-foreground">
        <p>Select a stage below to view details</p>
      </Card>
    );
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col xl:flex-row">
        {/* Left: Dark container with the stage card */}
        <div className="xl:w-[60%] relative">
          <div
            className={cn(
              "bg-gradient-to-b min-h-[450px] p-6 flex flex-col",
              gradient
            )}
          >
            {/* Stage content */}
            <div className="flex-1 overflow-y-auto">
              <StoryCard stage={displayStage} substepIndex={currentSubstepIndex} />
            </div>
          </div>
        </div>

        {/* Right: Light metadata panel */}
        <div className="xl:w-[40%] p-6 flex flex-col justify-between bg-card">
          {/* Project + stage info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {config && (
                <div className={cn("p-2 rounded-lg", config.color, "bg-opacity-10")}>
                  <StageIcon name={config.icon} className={cn("h-5 w-5", config.textColor)} />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{displayStage.label}</h3>
                {config && (
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{story.projectCode}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{story.clientName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={story.status === "active" ? "default" : "secondary"} className="text-xs">
                  {story.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stage</span>
                <span className="font-medium text-xs">
                  {displayStageIndex + 1} of {story.stages.length}
                </span>
              </div>
            </div>

            {/* Substep details */}
            {totalSubsteps > 1 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-1">
                  Substep {currentSubstepIndex + 1} of {totalSubsteps}
                </p>
                <p className="text-sm font-medium">
                  {displayStage.substeps[currentSubstepIndex]?.title || ""}
                </p>
              </div>
            )}
          </div>

          {/* Substep navigation */}
          {totalSubsteps > 1 && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevSubstep}
                  disabled={currentSubstepIndex === 0}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    currentSubstepIndex === 0
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {displayStage.substeps.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-200",
                        i === currentSubstepIndex
                          ? "w-6 h-1.5 bg-primary"
                          : "w-1.5 h-1.5 bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextSubstep}
                  disabled={currentSubstepIndex >= totalSubsteps - 1}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    currentSubstepIndex >= totalSubsteps - 1
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

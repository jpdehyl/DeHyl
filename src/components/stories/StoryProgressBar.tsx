"use client";

import { cn } from "@/lib/utils";

interface StoryProgressBarProps {
  totalStages: number;
  currentStageIndex: number;
  currentSubstepIndex: number;
  totalSubsteps: number;
}

export function StoryProgressBar({
  totalStages,
  currentStageIndex,
  currentSubstepIndex,
  totalSubsteps,
}: StoryProgressBarProps) {
  return (
    <div className="flex gap-1 px-2 pt-[env(safe-area-inset-top,8px)] pb-1">
      {Array.from({ length: totalStages }).map((_, i) => {
        const isCompleted = i < currentStageIndex;
        const isCurrent = i === currentStageIndex;
        const fillPercent = isCurrent && totalSubsteps > 0
          ? ((currentSubstepIndex + 1) / totalSubsteps) * 100
          : 0;

        return (
          <div
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full overflow-hidden",
              isCompleted ? "bg-white" : "bg-white/30"
            )}
          >
            {isCurrent && (
              <div
                className="h-full bg-white rounded-full transition-[width] duration-200 ease-out"
                style={{ width: `${fillPercent}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

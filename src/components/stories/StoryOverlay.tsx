"use client";

import { useRouter } from "next/navigation";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryStage } from "@/types/stories";

interface StoryOverlayProps {
  projectCode: string;
  projectName: string;
  clientName: string;
  currentStage: StoryStage | null;
  stageIndex: number;
  totalStages: number;
}

export function StoryOverlay({
  projectCode,
  projectName,
  clientName,
  currentStage,
  stageIndex,
  totalStages,
}: StoryOverlayProps) {
  const router = useRouter();

  return (
    <>
      {/* Top overlay - project info */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-start justify-between px-4 pt-[calc(env(safe-area-inset-top,8px)+16px)] pb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white/90 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                {projectCode}
              </span>
              <span className="text-white/70 text-xs truncate">
                {clientName}
              </span>
            </div>
            <h2 className="text-white text-sm font-medium mt-1 truncate drop-shadow-md">
              {projectName}
            </h2>
          </div>
          <button
            onClick={() => router.back()}
            className="pointer-events-auto ml-2 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/50 transition-colors"
            data-no-tap
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom overlay - stage info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none pb-[env(safe-area-inset-bottom,8px)]">
        <div className="px-4 pb-4">
          {currentStage && (
            <div className="flex items-end justify-between">
              <div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white",
                    currentStage.color
                  )}
                >
                  {currentStage.label}
                </div>
                <p className="text-white/50 text-[10px] mt-1 ml-1">
                  Stage {stageIndex + 1} of {totalStages}
                </p>
              </div>
              <div className="flex flex-col gap-1 pointer-events-auto">
                {stageIndex > 0 && (
                  <div className="p-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <ChevronUp className="h-3.5 w-3.5 text-white/60" />
                  </div>
                )}
                {stageIndex < totalStages - 1 && (
                  <div className="p-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <ChevronDown className="h-3.5 w-3.5 text-white/60" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

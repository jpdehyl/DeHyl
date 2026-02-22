"use client";

import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageIcon } from "./StageIconResolver";
import { StageSummaryPreview } from "./StageSummaryPreview";
import { STAGE_GRADIENTS } from "@/lib/stories/stage-config";
import { getStageConfig } from "@/lib/stories/stage-config";
import type { StoryStage } from "@/types/stories";

interface DesktopStageCardProps {
  stage: StoryStage;
  isExpanded: boolean;
  onClick: () => void;
}

export function DesktopStageCard({ stage, isExpanded, onClick }: DesktopStageCardProps) {
  const config = getStageConfig(stage.slug);
  const gradient = STAGE_GRADIENTS[stage.slug] || "from-slate-900 to-slate-950";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 overflow-hidden relative",
        "hover:shadow-lg hover:border-primary/50",
        isExpanded && "ring-2 ring-primary shadow-lg"
      )}
      onClick={onClick}
    >
      {/* Colored top bar */}
      <div className={cn("h-1 w-full", config.color)} />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-md", config.color, "bg-opacity-10")}>
            <StageIcon name={config.icon} className={cn("h-4 w-4", config.textColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-none">{stage.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Dark mini-preview */}
        <div
          className={cn(
            "rounded-lg overflow-hidden h-28 bg-gradient-to-b",
            gradient
          )}
        >
          <StageSummaryPreview stage={stage} />
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 flex items-center justify-between">
        <Badge variant="secondary" className="text-[10px]">
          {stage.substeps.length} substep{stage.substeps.length !== 1 ? "s" : ""}
        </Badge>
        {stage.isCurrent && (
          <Badge variant="default" className="text-[10px]">
            Current
          </Badge>
        )}
        {stage.completedAt && (
          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
            Completed
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

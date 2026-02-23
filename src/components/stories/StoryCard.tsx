"use client";

import type { StoryStage } from "@/types/stories";
import { DailyLogsCard } from "./stages/DailyLogsCard";
import { CrewAssignmentCard } from "./stages/CrewAssignmentCard";
import { EstimateCard } from "./stages/EstimateCard";
import { CompletionCard } from "./stages/CompletionCard";
import { InvoicingCard } from "./stages/InvoicingCard";

interface StoryCardProps {
  stage: StoryStage;
  substepIndex: number;
}

export function StoryCard({ stage, substepIndex }: StoryCardProps) {
  const substep = stage.substeps[substepIndex];
  if (!substep) return null;

  switch (stage.slug) {
    case "daily_logs":
      return <DailyLogsCard substep={substep} stage={stage} />;
    case "crew":
      return <CrewAssignmentCard substep={substep} stage={stage} />;
    case "estimate":
      return <EstimateCard substep={substep} stage={stage} />;
    case "completion":
      return <CompletionCard substep={substep} stage={stage} />;
    case "invoicing":
      return <InvoicingCard substep={substep} stage={stage} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-white/60">
          <div className="text-center">
            <p className="text-lg font-medium">{stage.label}</p>
            <p className="text-sm mt-1">Coming soon</p>
          </div>
        </div>
      );
  }
}

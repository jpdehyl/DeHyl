"use client";

import { useMemo } from "react";
import { FileText, MapPin, Calendar, DollarSign } from "lucide-react";
import type { ProjectStory, StoryStage } from "@/types/stories";

interface ChapterGenesisProps {
  story: ProjectStory;
  stages: StoryStage[];
}

export function ChapterGenesis({ story, stages }: ChapterGenesisProps) {
  // Extract data from stages
  const estimateStage = stages.find((s) => s.slug === "estimate");
  const hasEstimate = estimateStage?.hasData;

  // Get estimate data from substeps
  const estimateData = useMemo(() => {
    if (!estimateStage) return null;
    const metricSubstep = estimateStage.substeps.find((s) => s.type === "metric");
    return metricSubstep?.data as { total?: number; categories?: Array<{ name: string; amount: number }> } | null;
  }, [estimateStage]);

  const estimateTotal = estimateData?.total || 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border p-8">
        <div className="relative z-10">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
            Chapter 1
          </p>
          <h3 className="text-3xl font-bold mb-4">Genesis</h3>
          <p className="text-muted-foreground max-w-lg">
            How this project came to be. The scope, the estimate, and the commitment.
          </p>
        </div>

        {/* Decorative element */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Estimated Value */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Estimated Value</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {estimateTotal > 0 ? (
              `$${estimateTotal.toLocaleString()}`
            ) : (
              <span className="text-muted-foreground text-lg">Not set</span>
            )}
          </p>
        </div>

        {/* Client */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Client</span>
          </div>
          <p className="text-xl font-semibold truncate">{story.clientName}</p>
          <p className="text-sm text-muted-foreground">{story.clientCode}</p>
        </div>

        {/* Start Date */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Created</span>
          </div>
          <p className="text-xl font-semibold">
            {new Date(story.lastUpdated).toLocaleDateString("en-CA", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Estimate Breakdown */}
      {estimateData?.categories && estimateData.categories.length > 0 && (
        <div className="p-6 rounded-xl bg-card border">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Estimate Breakdown
          </h4>
          <div className="space-y-3">
            {estimateData.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{cat.name}</span>
                <span className="text-sm font-medium">
                  ${cat.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasEstimate && (
        <div className="text-center py-12 px-8 rounded-xl border border-dashed">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No estimate data yet for this project.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Estimate details will appear here once added.
          </p>
        </div>
      )}
    </div>
  );
}

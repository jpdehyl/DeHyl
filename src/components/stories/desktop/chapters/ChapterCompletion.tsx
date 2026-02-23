"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Image as ImageIcon, Clock, Users, Calendar } from "lucide-react";
import type { ProjectStory, StoryStage } from "@/types/stories";

interface ChapterCompletionProps {
  story: ProjectStory;
  stages: StoryStage[];
}

export function ChapterCompletion({ story, stages }: ChapterCompletionProps) {
  const completionStage = stages.find((s) => s.slug === "completion");
  const hasData = completionStage?.hasData;

  // Extract photos
  const photos = useMemo(() => {
    if (!completionStage) return [];
    const photoSubsteps = completionStage.substeps.filter(
      (s) => s.type === "photo" || s.type === "photo_grid"
    );
    return photoSubsteps.flatMap((s) => {
      const data = s.data as { url?: string; urls?: string[] };
      if (data.url) return [data.url];
      if (data.urls) return data.urls;
      return [];
    });
  }, [completionStage]);

  // Before/After slider state
  const [sliderPosition, setSliderPosition] = useState(50);

  // For demo, we'll show first two photos as before/after
  const beforePhoto = photos[0];
  const afterPhoto = photos[1];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent border p-8">
        <div className="relative z-10">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            Chapter 4
          </p>
          <h3 className="text-3xl font-bold mb-4">Completion</h3>
          <p className="text-muted-foreground max-w-lg">
            The finished product. Before and after. The transformation complete.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* Before/After Comparison */}
      {beforePhoto && afterPhoto && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <p className="text-sm font-medium text-center">Before & After</p>
          </div>
          <div
            className="relative aspect-video cursor-ew-resize"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = (x / rect.width) * 100;
              setSliderPosition(Math.min(Math.max(percentage, 0), 100));
            }}
          >
            {/* After (background) */}
            <img
              src={afterPhoto}
              alt="After"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Before (clipped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={beforePhoto}
                alt="Before"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ minWidth: "100%", maxWidth: "none" }}
              />
            </div>

            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
              style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-3 bg-slate-400 rounded-full" />
                  <div className="w-0.5 h-3 bg-slate-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 px-2 py-1 bg-black/50 text-white text-xs rounded">
              Before
            </div>
            <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 text-white text-xs rounded">
              After
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 2 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Final Photos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.slice(2).map((photo, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-muted overflow-hidden"
              >
                <img
                  src={photo}
                  alt={`Completion photo ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Stats */}
      {story.status === "closed" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
              Project Complete
            </p>
            <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">
              Successfully delivered
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border text-center">
            <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {new Date(story.lastUpdated).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Completed
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasData && photos.length === 0 && (
        <div className="text-center py-12 px-8 rounded-xl border border-dashed">
          <ImageIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No completion photos yet.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Final photos and before/after comparisons will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

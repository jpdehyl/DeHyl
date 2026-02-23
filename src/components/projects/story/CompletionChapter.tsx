"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Image as ImageIcon,
  Calendar,
  Loader2,
  Camera,
} from "lucide-react";
import type { ProjectWithTotals } from "@/types";

interface CompletionChapterProps {
  project: ProjectWithTotals;
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption: string | null;
  takenAt: string;
  category: string;
}

export function CompletionChapter({ project }: CompletionChapterProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const res = await fetch(`/api/projects/${project.id}/photos`);
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
        }
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPhotos();
  }, [project.id]);

  const beforePhotos = photos.filter((p) => p.category === "before");
  const afterPhotos = photos.filter((p) => p.category === "after");
  const progressPhotos = photos.filter(
    (p) => !["before", "after"].includes(p.category)
  );

  const beforePhoto = beforePhotos[0];
  const afterPhoto = afterPhotos[0];

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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Before/After Comparison */}
          {beforePhoto && afterPhoto && (
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <p className="text-sm font-medium text-center">
                  Before & After Comparison
                </p>
              </div>
              <div
                className="relative aspect-video cursor-ew-resize"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = (x / rect.width) * 100;
                  setSliderPosition(Math.min(Math.max(percentage, 5), 95));
                }}
              >
                {/* After (background) */}
                <img
                  src={afterPhoto.url}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Before (clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={beforePhoto.url}
                    alt="Before"
                    className="h-full object-cover"
                    style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: "none" }}
                  />
                </div>

                {/* Slider handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-4 bg-slate-400 rounded-full" />
                      <div className="w-0.5 h-4 bg-slate-400 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 text-white text-sm font-medium rounded-lg">
                  Before
                </div>
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 text-white text-sm font-medium rounded-lg">
                  After
                </div>
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Camera className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Project Photos
                </span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {photos.length}
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {photos.slice(0, 12).map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg bg-muted overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || "Project photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
              {photos.length > 12 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  +{photos.length - 12} more photos
                </p>
              )}
            </div>
          )}

          {/* Completion Status */}
          {project.status === "closed" && (
            <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                Project Complete
              </p>
              <p className="text-emerald-600/70 dark:text-emerald-400/70">
                Successfully delivered and closed
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(project.updatedAt).toLocaleDateString("en-CA", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {photos.length === 0 && (
            <div className="text-center py-16 px-8 rounded-xl border border-dashed">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">
                No photos yet
              </p>
              <p className="text-sm text-muted-foreground/70">
                Project photos will appear here when uploaded.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

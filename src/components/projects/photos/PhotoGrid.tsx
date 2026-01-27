"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProjectPhoto } from "@/types";

interface PhotoGridProps {
  photos: ProjectPhoto[];
  loading?: boolean;
  onPhotoClick: (index: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function PhotoGrid({
  photos,
  loading = false,
  onPhotoClick,
  onLoadMore,
  hasMore = false,
}: PhotoGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onLoadMore, hasMore, loading]);

  const handleImageLoad = useCallback((photoId: string) => {
    setLoadedImages((prev) => new Set(prev).add(photoId));
  }, []);

  // Group photos by date
  const photosByDate = photos.reduce(
    (acc, photo) => {
      const date = photo.photoDate
        ? new Date(photo.photoDate).toLocaleDateString("en-CA")
        : "Unknown Date";
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(photo);
      return acc;
    },
    {} as Record<string, ProjectPhoto[]>
  );

  const sortedDates = Object.keys(photosByDate).sort((a, b) => b.localeCompare(a));

  if (!loading && photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No photos yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload photos to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const datePhotos = photosByDate[date];
        const formattedDate = date !== "Unknown Date"
          ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : date;

        return (
          <div key={date}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {formattedDate}
              <span className="ml-2 text-xs">({datePhotos.length})</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {datePhotos.map((photo) => {
                const globalIndex = photos.findIndex((p) => p.id === photo.id);
                const isLoaded = loadedImages.has(photo.id);

                return (
                  <button
                    key={photo.id}
                    onClick={() => onPhotoClick(globalIndex)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden bg-muted",
                      "hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    )}
                  >
                    {!isLoaded && (
                      <Skeleton className="absolute inset-0" />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailUrl || `https://lh3.googleusercontent.com/d/${photo.driveFileId}=s200`}
                      alt={photo.filename}
                      className={cn(
                        "w-full h-full object-cover transition-opacity",
                        isLoaded ? "opacity-100" : "opacity-0"
                      )}
                      loading="lazy"
                      onLoad={() => handleImageLoad(photo.id)}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {/* Load more trigger */}
      {hasMore && <div ref={loadMoreRef} className="h-4" />}
    </div>
  );
}

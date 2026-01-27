"use client";

import { useState, useEffect, useCallback } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoUploader, PhotoGrid, PhotoLightbox, DateFilter } from "./photos";
import type { ProjectPhoto, PhotoListResponse } from "@/types";

interface ProjectPhotosProps {
  projectId: string;
}

export function ProjectPhotos({ projectId }: ProjectPhotosProps) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchPhotos = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPhotos([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const offset = reset ? 0 : photos.length;
      const params = new URLSearchParams({
        limit: "20",
        offset: offset.toString(),
      });
      if (selectedDate) {
        params.set("date", selectedDate);
      }

      const response = await fetch(`/api/photos/${projectId}?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }

      const data: PhotoListResponse = await response.json();

      setPhotos((prev) => reset ? data.photos : [...prev, ...data.photos]);
      setDates(data.dates);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId, selectedDate, photos.length]);

  // Initial fetch
  useEffect(() => {
    fetchPhotos(true);
  }, [projectId, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPhotos(false);
    }
  }, [loadingMore, hasMore, fetchPhotos]);

  const handleUploadComplete = useCallback(() => {
    fetchPhotos(true);
  }, [fetchPhotos]);

  const handleDateChange = (date: string | null) => {
    setSelectedDate(date);
    // fetchPhotos will be called by useEffect when selectedDate changes
  };

  const handlePhotoClick = (index: number) => {
    setLightboxIndex(index);
  };

  const handleLightboxClose = () => {
    setLightboxIndex(null);
  };

  const handleLightboxNavigate = (index: number) => {
    setLightboxIndex(index);
  };

  if (loading && photos.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">
            <ImageIcon className="inline-block mr-2 h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">
            <ImageIcon className="inline-block mr-2 h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchPhotos(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">
            <ImageIcon className="inline-block mr-2 h-5 w-5" />
            Photos
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {dates.length > 0 && (
              <DateFilter
                dates={dates}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
              />
            )}
            <PhotoUploader
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </CardHeader>
        <CardContent>
          <PhotoGrid
            photos={photos}
            loading={loadingMore}
            onPhotoClick={handlePhotoClick}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={handleLightboxClose}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </>
  );
}

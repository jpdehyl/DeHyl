"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ImageIcon,
  RefreshCw,
  ArrowLeft,
  Filter,
  Grid,
  LayoutGrid,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Loader2,
  Camera,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ProjectPhoto, PhotoListResponse, PhotoCategory } from "@/types";

interface PhotosPageProps {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  before: "Before",
  during: "During",
  after: "After",
  safety: "Safety",
  damage: "Damage",
  equipment: "Equipment",
  documentation: "Documentation",
  other: "Other",
};

const CATEGORY_COLORS: Record<PhotoCategory, string> = {
  before: "bg-blue-500",
  during: "bg-amber-500",
  after: "bg-green-500",
  safety: "bg-red-500",
  damage: "bg-orange-500",
  equipment: "bg-purple-500",
  documentation: "bg-gray-500",
  other: "bg-slate-500",
};

// File upload types
interface FilePreview {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export default function PhotosPage({ params }: PhotosPageProps) {
  const { id: projectId } = use(params);
  const { sidebarOpen } = useAppStore();

  // Project state
  const [projectCode, setProjectCode] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");

  // Photos state
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | null>(null);
  const [gridSize, setGridSize] = useState<"small" | "large">("small");

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>("other");
  const [uploadArea, setUploadArea] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  // Fetch project info
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.status === 404) {
          setError("not_found");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch project");
        const data = await res.json();
        setProjectCode(data.project.code);
        setProjectName(`${data.project.clientName} - ${data.project.description}`);
      } catch (err) {
        console.error(err);
      }
    }
    fetchProject();
  }, [projectId]);

  // Fetch photos
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
        limit: "24",
        offset: offset.toString(),
      });
      if (selectedDate) params.set("date", selectedDate);
      if (selectedCategory) params.set("category", selectedCategory);

      const response = await fetch(`/api/photos/storage/${projectId}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch photos");

      const data: PhotoListResponse = await response.json();

      setPhotos((prev) => reset ? data.photos : [...prev, ...data.photos]);
      setDates(data.dates);
      setCategories(data.categories);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId, selectedDate, selectedCategory, photos.length]);

  useEffect(() => {
    fetchPhotos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedDate, selectedCategory]);

  // Upload handlers
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 25MB`;
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles: FilePreview[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        status: error ? "error" : "pending",
        error: error || undefined,
      });
    }
    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    const validFiles = uploadFiles.filter((f) => f.status === "pending");
    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadFiles((prev) =>
      prev.map((f) => f.status === "pending" ? { ...f, status: "uploading" as const } : f)
    );

    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("category", uploadCategory);
      if (uploadArea) formData.append("area", uploadArea);
      if (uploadNotes) formData.append("notes", uploadNotes);
      validFiles.forEach((f) => formData.append("photos", f.file));

      const response = await fetch("/api/photos/storage/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      setUploadFiles((prev) =>
        prev.map((f) => {
          if (f.status !== "uploading") return f;
          const failed = result.failed?.find(
            (failed: { originalName: string }) => failed.originalName === f.file.name
          );
          if (failed) return { ...f, status: "error" as const, error: failed.error };
          return { ...f, status: "success" as const };
        })
      );

      if (result.uploaded?.length > 0) {
        fetchPhotos(true);
      }
    } catch (err) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading"
            ? { ...f, status: "error" as const, error: "Upload failed" }
            : f
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const closeUploadDialog = () => {
    uploadFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setUploadFiles([]);
    setUploadCategory("other");
    setUploadArea("");
    setUploadNotes("");
    setUploadOpen(false);
  };

  // Delete photo
  const deletePhoto = async (photo: ProjectPhoto) => {
    if (!confirm("Delete this photo?")) return;

    try {
      const res = await fetch(`/api/photos/storage/${projectId}?id=${photo.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        setTotal((prev) => prev - 1);
        if (lightboxIndex !== null) setLightboxIndex(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (error === "not_found") {
    notFound();
  }

  const pendingCount = uploadFiles.filter((f) => f.status === "pending").length;
  const successCount = uploadFiles.filter((f) => f.status === "success").length;

  return (
    <div className={cn("transition-all duration-300")}>
      <Header
        title={`Photos - ${projectCode}`}
        description={projectName}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Back link and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter */}
            {dates.length > 0 && (
              <Select
                value={selectedDate || "all"}
                onValueChange={(v) => setSelectedDate(v === "all" ? null : v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  {dates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Category filter */}
            <Select
              value={selectedCategory || "all"}
              onValueChange={(v) => setSelectedCategory(v === "all" ? null : v as PhotoCategory)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Grid size toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setGridSize(gridSize === "small" ? "large" : "small")}
            >
              {gridSize === "small" ? (
                <Grid className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>

            {/* Upload button */}
            <Dialog open={uploadOpen} onOpenChange={(open) => open ? setUploadOpen(true) : closeUploadDialog()}>
              <DialogTrigger asChild>
                <Button>
                  <Camera className="mr-2 h-4 w-4" />
                  Add Photos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Upload Photos</DialogTitle>
                  <DialogDescription>
                    Add photos to this project. They&apos;ll be stored securely.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Category and metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as PhotoCategory)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Area/Room (optional)</Label>
                      <Input
                        placeholder="e.g., Kitchen, Floor 2"
                        value={uploadArea}
                        onChange={(e) => setUploadArea(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Add any notes about these photos..."
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Drop zone */}
                  <div
                    onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById("file-input")?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                      "hover:border-primary hover:bg-primary/5",
                      uploading && "pointer-events-none opacity-50"
                    )}
                  >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop photos, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, GIF, WebP, HEIC up to 25MB
                    </p>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      disabled={uploading}
                    />
                  </div>

                  {/* File previews */}
                  {uploadFiles.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2">
                        {uploadFiles.map((file, index) => (
                          <div
                            key={`${file.file.name}-${index}`}
                            className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.preview}
                              alt={file.file.name}
                              className="w-full h-full object-cover"
                            />
                            <div
                              className={cn(
                                "absolute inset-0 flex items-center justify-center",
                                file.status === "uploading" && "bg-black/50",
                                file.status === "success" && "bg-green-500/30",
                                file.status === "error" && "bg-red-500/30"
                              )}
                            >
                              {file.status === "uploading" && (
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              )}
                              {file.status === "success" && (
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                              )}
                              {file.status === "error" && (
                                <AlertCircle className="h-6 w-6 text-red-500" />
                              )}
                            </div>
                            {(file.status === "pending" || file.status === "error") && !uploading && (
                              <button
                                onClick={(e) => { e.stopPropagation(); removeUploadFile(index); }}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={closeUploadDialog} disabled={uploading}>
                    {successCount > 0 ? "Done" : "Cancel"}
                  </Button>
                  {pendingCount > 0 && (
                    <Button onClick={handleUpload} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        `Upload ${pendingCount} Photo${pendingCount !== 1 ? "s" : ""}`
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{total} photo{total !== 1 ? "s" : ""}</span>
            {selectedDate && <Badge variant="secondary">{selectedDate}</Badge>}
            {selectedCategory && (
              <Badge className={cn(CATEGORY_COLORS[selectedCategory], "text-white")}>
                {CATEGORY_LABELS[selectedCategory]}
              </Badge>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className={cn(
            "grid gap-2",
            gridSize === "small"
              ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          )}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => fetchPhotos(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && photos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No photos yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload photos to document this project
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Camera className="mr-2 h-4 w-4" />
                Add Photos
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Photo grid */}
        {!loading && !error && photos.length > 0 && (
          <div className={cn(
            "grid gap-2",
            gridSize === "small"
              ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          )}>
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
                onClick={() => setLightboxIndex(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.storageUrl || photo.thumbnailUrl || ""}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Category badge */}
                <div className="absolute top-1 left-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    CATEGORY_COLORS[photo.category]
                  )} />
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchPhotos(false)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-4 p-2 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-4 p-2 text-white/70 hover:text-white"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[80vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex].storageUrl || photos[lightboxIndex].thumbnailUrl || ""}
              alt={photos[lightboxIndex].filename}
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>

          {/* Info bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between text-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn(CATEGORY_COLORS[photos[lightboxIndex].category], "text-white")}>
                    {CATEGORY_LABELS[photos[lightboxIndex].category]}
                  </Badge>
                  {photos[lightboxIndex].area && (
                    <Badge variant="outline" className="text-white border-white/50">
                      {photos[lightboxIndex].area}
                    </Badge>
                  )}
                </div>
                {photos[lightboxIndex].notes && (
                  <p className="text-sm text-white/80">{photos[lightboxIndex].notes}</p>
                )}
                <p className="text-xs text-white/60">
                  {photos[lightboxIndex].photoDate && new Date(photos[lightboxIndex].photoDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-white hover:bg-white/20"
                  onClick={() => {
                    const url = photos[lightboxIndex].storageUrl;
                    if (url) window.open(url, "_blank");
                  }}
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  onClick={() => deletePhoto(photos[lightboxIndex])}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

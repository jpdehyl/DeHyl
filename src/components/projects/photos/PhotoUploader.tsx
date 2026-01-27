"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  projectId: string;
  onUploadComplete: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export function PhotoUploader({ projectId, onUploadComplete }: PhotoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 25MB`;
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

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status === "pending");
    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("projectId", projectId);

      validFiles.forEach((f) => {
        formData.append("photos", f.file);
      });

      // Update all valid files to uploading status
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" ? { ...f, status: "uploading" as const } : f
        )
      );

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      // Update file statuses based on response
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status !== "uploading") return f;

          const failed = result.failed?.find(
            (failed: { originalName: string }) => failed.originalName === f.file.name
          );

          if (failed) {
            return { ...f, status: "error" as const, error: failed.error };
          }

          return { ...f, status: "success" as const };
        })
      );

      setUploadProgress(100);

      // Notify parent of completion
      if (result.uploaded?.length > 0) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Upload error:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading"
            ? { ...f, status: "error" as const, error: error instanceof Error ? error.message : "Upload failed" }
            : f
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up previews
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadProgress(0);
    setOpen(false);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Add Photos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
          <DialogDescription>
            Select photos to upload to this project. Photos will be organized by date in Google Drive.
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            "hover:border-primary hover:bg-primary/5",
            uploading && "pointer-events-none opacity-50"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag and drop photos here, or click to select
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, GIF, WebP, HEIC up to 25MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploading}
          />
        </div>

        {/* File Previews */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-1">
              {files.map((file, index) => (
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

                  {/* Status Overlay */}
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

                  {/* Remove Button (only for pending/error) */}
                  {(file.status === "pending" || file.status === "error") && !uploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {/* Size Warning */}
                  {file.file.size > WARN_FILE_SIZE && file.status === "pending" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-500/80 text-white text-xs px-1 py-0.5 text-center">
                      Large file
                    </div>
                  )}

                  {/* Error Message */}
                  {file.error && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-xs px-1 py-0.5 text-center truncate">
                      {file.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-xs text-muted-foreground text-center">
              Uploading photos...
            </p>
          </div>
        )}

        {/* Summary */}
        {files.length > 0 && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
            {successCount > 0 && <span className="text-green-600">{successCount} uploaded</span>}
            {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
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
  );
}

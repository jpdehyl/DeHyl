"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ImageIcon,
  RefreshCw,
  Filter,
  Grid,
  LayoutGrid,
  Camera,
  FolderOpen,
  Loader2,
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
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { PhotoCategory } from "@/types";

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

interface ProjectWithPhotos {
  id: string;
  code: string;
  clientName: string;
  description: string;
  photoCount: number;
  latestPhoto: string | null;
  latestPhotoDate: string | null;
}

export default function PhotosPage() {
  const { sidebarOpen } = useAppStore();
  const [projects, setProjects] = useState<ProjectWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectsWithPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all projects
      const projectsRes = await fetch("/api/projects");
      if (!projectsRes.ok) throw new Error("Failed to fetch projects");
      const projectsData = await projectsRes.json();

      // For each project, get photo count
      const projectsWithPhotos: ProjectWithPhotos[] = [];

      for (const project of projectsData.projects || []) {
        try {
          const photosRes = await fetch(`/api/photos/storage/${project.id}?limit=1`);
          if (photosRes.ok) {
            const photosData = await photosRes.json();
            if (photosData.total > 0) {
              projectsWithPhotos.push({
                id: project.id,
                code: project.code,
                clientName: project.clientName,
                description: project.description,
                photoCount: photosData.total,
                latestPhoto: photosData.photos[0]?.storageUrl || photosData.photos[0]?.thumbnailUrl || null,
                latestPhotoDate: photosData.photos[0]?.photoDate || null,
              });
            }
          }
        } catch {
          // Skip projects where photos fail to load
        }
      }

      // Sort by photo count (most photos first)
      projectsWithPhotos.sort((a, b) => b.photoCount - a.photoCount);

      setProjects(projectsWithPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjectsWithPhotos();
  }, [fetchProjectsWithPhotos]);

  const totalPhotos = projects.reduce((sum, p) => sum + p.photoCount, 0);

  return (
    <div className={cn("transition-all duration-300")}>
      <Header
        title="Photos"
        description="Project photo gallery"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{totalPhotos}</p>
                    <p className="text-xs text-muted-foreground">Total Photos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{projects.length}</p>
                    <p className="text-xs text-muted-foreground">Projects with Photos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="aspect-video rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchProjectsWithPhotos}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No photos yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Photos will appear here once you upload them to projects
              </p>
              <Link href="/projects">
                <Button>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Go to Projects
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Projects grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/photos`}
                className="block"
              >
                <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                  <CardContent className="p-0">
                    {/* Preview image */}
                    <div className="aspect-video bg-muted relative">
                      {project.latestPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.latestPhoto}
                          alt={`Latest photo from ${project.code}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      {/* Photo count badge */}
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                        <Camera className="mr-1 h-3 w-3" />
                        {project.photoCount}
                      </Badge>
                    </div>

                    {/* Project info */}
                    <div className="p-4">
                      <h3 className="font-semibold">{project.code}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.clientName} - {project.description}
                      </p>
                      {project.latestPhotoDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Latest: {new Date(project.latestPhotoDate + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

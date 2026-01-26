"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import {
  Building2,
  Calendar,
  Clock,
  MessageSquare,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PortalResponse, PortalActivity, PortalPhoto } from "@/types";

interface PortalPageProps {
  params: Promise<{ code: string }>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function TimelineItem({ activity }: { activity: PortalActivity }) {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex-shrink-0 w-16 text-xs text-muted-foreground">
        {formatDate(new Date(activity.date))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.title}</p>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {activity.description}
          </p>
        )}
      </div>
    </div>
  );
}

function PhotoGallery({ photos }: { photos: PortalPhoto[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayPhotos = expanded ? photos : photos.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {displayPhotos.map((photo) => (
          <a
            key={photo.id}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-square relative rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
          >
            {photo.thumbnailUrl ? (
              <Image
                src={photo.thumbnailUrl}
                alt={photo.caption || "Project photo"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </a>
        ))}
      </div>
      {photos.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show all {photos.length} photos
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function PortalPage({ params }: PortalPageProps) {
  const { code } = use(params);
  const [data, setData] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/portal/${code}`);
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load project");
          return;
        }
        const portalData = await response.json();
        setData(portalData);
      } catch (err) {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Project Not Found</h1>
          <p className="text-muted-foreground">
            {error || "This project portal is no longer available or the link is invalid."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-medium text-primary">DeHyl Constructors</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Project Info */}
        <section className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{data.project.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.project.clientName}</span>
            <span>•</span>
            <Badge variant={data.project.status === "active" ? "default" : "secondary"}>
              {data.project.status === "active" ? "Active" : "Completed"}
            </Badge>
          </div>
          {data.project.description && (
            <p className="text-muted-foreground">{data.project.description}</p>
          )}
        </section>

        {/* Client Message */}
        {data.project.clientMessage && (
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-primary mb-1">
                  Message from DeHyl
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {data.project.clientMessage}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Timeline */}
        {data.timeline && data.timeline.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </h2>
            <div className="bg-card border rounded-lg">
              <div className="divide-y">
                {data.timeline.map((activity) => (
                  <div key={activity.id} className="px-4">
                    <TimelineItem activity={activity} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Photos */}
        {data.photos && data.photos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos ({data.photos.length})
            </h2>
            <PhotoGallery photos={data.photos} />
          </section>
        )}

        {/* No Content State */}
        {(!data.timeline || data.timeline.length === 0) &&
         (!data.photos || data.photos.length === 0) &&
         !data.project.clientMessage && (
          <section className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No updates yet</h3>
            <p className="text-muted-foreground">
              Check back later for project updates.
            </p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Separator className="mb-4" />
          <div className="text-center text-xs text-muted-foreground">
            <p>
              Last updated: {formatDateTime(new Date(data.lastUpdated))}
            </p>
            <p className="mt-1">
              Powered by DeHyl Constructors Corp
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

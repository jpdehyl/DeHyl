"use client";

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { ProjectTabBar } from "./ProjectTabBar";
import { DesktopStoryHero } from "./DesktopStoryHero";
import { StageCardGrid } from "./StageCardGrid";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { ProjectStorySummary } from "@/types/stories";

interface DesktopStoryViewProps {
  projects: ProjectStorySummary[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

export function DesktopStoryView({
  projects,
  currentProjectId,
  onSelectProject,
}: DesktopStoryViewProps) {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { stories, isLoading } = useStoryStore();

  const story = currentProjectId ? stories.get(currentProjectId) : undefined;

  const handleScrollToHero = useCallback(() => {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Stories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track project lifecycle stages at a glance
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </button>
      </div>

      {/* Project tabs */}
      <ProjectTabBar
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={onSelectProject}
      />

      {/* Hero section */}
      <div ref={heroRef}>
        {isLoading && !story ? (
          <div className="mt-6 flex items-center justify-center h-64 rounded-xl border bg-card">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
        ) : story ? (
          <DesktopStoryHero story={story} />
        ) : (
          <div className="mt-6 flex items-center justify-center h-64 rounded-xl border bg-card">
            <p className="text-muted-foreground">Select a project to view its story</p>
          </div>
        )}
      </div>

      {/* Stage card grid */}
      {story && (
        <StageCardGrid story={story} onScrollToHero={handleScrollToHero} />
      )}
    </div>
  );
}

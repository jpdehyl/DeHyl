"use client";

import { use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { StoryShell } from "@/components/stories/StoryShell";
import { DesktopStoryView } from "@/components/stories/desktop/DesktopStoryView";
import { Loader2, X } from "lucide-react";
import type { StoryDetailResponse, StorySummariesResponse } from "@/types/stories";

interface ProjectStoryPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectStoryPage({ params }: ProjectStoryPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const {
    currentProjectId,
    setCurrentProject,
    setStory,
    getStory,
    isLoading,
    setIsLoading,
    projectSummaries,
    setProjectSummaries,
  } = useStoryStore();

  // Set current project on mount
  useEffect(() => {
    if (currentProjectId !== projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, currentProjectId, setCurrentProject]);

  // Fetch story detail
  useEffect(() => {
    async function fetchStory() {
      const existing = getStory(projectId);
      if (existing) return;

      try {
        setIsLoading(true);
        const res = await fetch(`/api/stories/${projectId}`);
        if (!res.ok) throw new Error("Failed to fetch story");
        const data: StoryDetailResponse = await res.json();
        setStory(projectId, data.story);
      } catch (err) {
        console.error("Failed to fetch story:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStory();
  }, [projectId, getStory, setStory, setIsLoading]);

  // Fetch summaries for navigation between projects
  useEffect(() => {
    if (projectSummaries.length > 0) return;
    async function fetchSummaries() {
      try {
        const res = await fetch("/api/stories");
        if (!res.ok) return;
        const data: StorySummariesResponse = await res.json();
        setProjectSummaries(data.projects);
      } catch {
        // Silent fail for summaries
      }
    }
    fetchSummaries();
  }, [projectSummaries.length, setProjectSummaries]);

  const handleSelectProject = useCallback(
    (id: string) => {
      setCurrentProject(id);
      router.push(`/stories/${id}`);
    },
    [setCurrentProject, router]
  );

  if (isLoading && !getStory(projectId)) {
    return (
      <>
        <div className="lg:hidden h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
          <Loader2 className="h-8 w-8 text-white/50 animate-spin" />
        </div>
        <div className="hidden lg:flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile: full-screen immersive */}
      <div className="lg:hidden h-full relative">
        <div className="absolute top-[env(safe-area-inset-top,8px)] right-3 z-50">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/50 transition-colors"
            data-no-tap
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <StoryShell />
      </div>

      {/* Desktop: blog-style card layout */}
      <div className="hidden lg:block">
        <DesktopStoryView
          projects={projectSummaries}
          currentProjectId={currentProjectId}
          onSelectProject={handleSelectProject}
        />
      </div>
    </>
  );
}

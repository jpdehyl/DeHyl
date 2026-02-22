"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { StoryBubbles } from "@/components/stories/StoryBubbles";
import { StoryShell } from "@/components/stories/StoryShell";
import { DesktopStoryView } from "@/components/stories/desktop/DesktopStoryView";
import { Loader2, X } from "lucide-react";
import type { StorySummariesResponse, StoryDetailResponse, SmartFeedResponse } from "@/types/stories";

export default function StoriesPage() {
  const router = useRouter();
  const {
    projectSummaries,
    setProjectSummaries,
    currentProjectId,
    setCurrentProject,
    setStory,
    isLoading,
    setIsLoading,
    setFeedCards,
    setFeedLoading,
    setUpcomingProjects,
  } = useStoryStore();

  // Fetch project summaries + smart feed in parallel
  useEffect(() => {
    async function fetchSummaries() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/stories");
        if (!res.ok) throw new Error("Failed to fetch stories");
        const data: StorySummariesResponse = await res.json();
        setProjectSummaries(data.projects);

        // Auto-select first project if none selected
        if (!currentProjectId && data.projects.length > 0) {
          setCurrentProject(data.projects[0].projectId);
        }
      } catch (err) {
        console.error("Failed to fetch story summaries:", err);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchFeed() {
      try {
        setFeedLoading(true);
        const res = await fetch("/api/stories/feed");
        if (!res.ok) throw new Error("Failed to fetch feed");
        const data: SmartFeedResponse = await res.json();
        setFeedCards(data.cards);
        setUpcomingProjects(data.upcomingBids);
      } catch (err) {
        console.error("Failed to fetch smart feed:", err);
      } finally {
        setFeedLoading(false);
      }
    }

    fetchSummaries();
    fetchFeed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch story detail when project changes
  const fetchStoryDetail = useCallback(
    async (projectId: string) => {
      // Skip if already cached
      const existing = useStoryStore.getState().getStory(projectId);
      if (existing) return;

      try {
        setIsLoading(true);
        const res = await fetch(`/api/stories/${projectId}`);
        if (!res.ok) throw new Error("Failed to fetch story");
        const data: StoryDetailResponse = await res.json();
        setStory(projectId, data.story);
      } catch (err) {
        console.error("Failed to fetch story detail:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [setStory, setIsLoading]
  );

  useEffect(() => {
    if (currentProjectId) {
      fetchStoryDetail(currentProjectId);
    }
  }, [currentProjectId, fetchStoryDetail]);

  // Pre-fetch adjacent projects
  useEffect(() => {
    if (!currentProjectId || projectSummaries.length === 0) return;
    const currentIndex = projectSummaries.findIndex(
      (p) => p.projectId === currentProjectId
    );
    const adjacentIds = [
      projectSummaries[currentIndex - 1]?.projectId,
      projectSummaries[currentIndex + 1]?.projectId,
    ].filter(Boolean) as string[];

    for (const id of adjacentIds) {
      fetchStoryDetail(id);
    }
  }, [currentProjectId, projectSummaries, fetchStoryDetail]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      setCurrentProject(projectId);
    },
    [setCurrentProject]
  );

  // Loading state (mobile style on mobile, handled by DesktopStoryView on desktop)
  if (isLoading && projectSummaries.length === 0) {
    return (
      <>
        {/* Mobile loading */}
        <div className="lg:hidden h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
          <Loader2 className="h-8 w-8 text-white/50 animate-spin" />
        </div>
        {/* Desktop loading */}
        <div className="hidden lg:flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      </>
    );
  }

  if (projectSummaries.length === 0) {
    return (
      <>
        {/* Mobile empty */}
        <div className="lg:hidden h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="text-center text-white/60 px-8">
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-sm mt-2">
              Projects will appear here once they have data.
            </p>
            <button
              onClick={() => router.push("/projects")}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Go to Projects
            </button>
          </div>
        </div>
        {/* Desktop empty */}
        <div className="hidden lg:block">
          <DesktopStoryView
            projects={[]}
            currentProjectId={null}
            onSelectProject={handleSelectProject}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile: full-screen immersive story view */}
      <div className="lg:hidden h-full flex flex-col">
        {/* Close button */}
        <div className="absolute top-[env(safe-area-inset-top,8px)] right-3 z-50">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/50 transition-colors"
            data-no-tap
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Story bubbles */}
        <StoryBubbles
          projects={projectSummaries}
          currentProjectId={currentProjectId}
          onSelectProject={handleSelectProject}
        />

        {/* Story content */}
        <div className="flex-1 min-h-0">
          <StoryShell />
        </div>
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

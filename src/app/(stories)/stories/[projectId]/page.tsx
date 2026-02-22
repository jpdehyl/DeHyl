"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { StoryShell } from "@/components/stories/StoryShell";
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

  if (isLoading && !getStory(projectId)) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Close button */}
      <div className="absolute top-[env(safe-area-inset-top,8px)] right-3 z-50">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/50 transition-colors"
          data-no-tap
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop: phone-frame wrapper */}
      <div className="h-full lg:flex lg:items-center lg:justify-center lg:bg-slate-950">
        <div className="h-full w-full lg:w-[390px] lg:h-[calc(100%-40px)] lg:max-h-[844px] lg:rounded-[40px] lg:border-4 lg:border-white/10 lg:overflow-hidden lg:shadow-2xl">
          <StoryShell />
        </div>
      </div>
    </div>
  );
}

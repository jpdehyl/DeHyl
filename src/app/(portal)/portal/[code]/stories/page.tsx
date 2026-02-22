"use client";

import { use, useEffect, useState, useCallback } from "react";
import { StoryShell } from "@/components/stories/StoryShell";
import { useStoryStore } from "@/lib/stores/story-store";
import { AlertCircle, Loader2 } from "lucide-react";
import type { StoryDetailResponse } from "@/types/stories";

interface PortalStoriesPageProps {
  params: Promise<{ code: string }>;
}

export default function PortalStoriesPage({ params }: PortalStoriesPageProps) {
  const { code } = use(params);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    setCurrentProject,
    setStory,
    setProjectSummaries,
  } = useStoryStore();

  useEffect(() => {
    async function fetchPortalStory() {
      try {
        // First, validate the portal code and get the project
        const portalRes = await fetch(`/api/portal/${code}`);
        if (!portalRes.ok) {
          const err = await portalRes.json();
          setError(err.error || "Project not found");
          return;
        }
        const portalData = await portalRes.json();

        // We need the project ID to fetch the story
        // The portal response should include enough to identify the project
        // Fetch all stories and find the one matching this portal code
        const storiesRes = await fetch("/api/stories");
        if (!storiesRes.ok) throw new Error("Failed to load");
        const storiesData = await storiesRes.json();

        // Find the project that matches this portal
        const matchingProject = storiesData.projects.find(
          (p: { projectName: string }) =>
            p.projectName === portalData.project.name ||
            p.projectName === portalData.project.description
        );

        if (!matchingProject) {
          setError("Project story not available");
          return;
        }

        setProjectSummaries([matchingProject]);
        setCurrentProject(matchingProject.projectId);

        // Fetch the full story
        const storyRes = await fetch(`/api/stories/${matchingProject.projectId}`);
        if (!storyRes.ok) throw new Error("Failed to load story");
        const storyData: StoryDetailResponse = await storyRes.json();
        setStory(matchingProject.projectId, storyData.story);
      } catch (err) {
        setError("Failed to load project story");
      } finally {
        setLoading(false);
      }
    }
    fetchPortalStory();
  }, [code, setCurrentProject, setStory, setProjectSummaries]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Project Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="h-full lg:flex lg:items-center lg:justify-center lg:bg-slate-950">
        <div className="h-full w-full lg:w-[390px] lg:h-[calc(100%-40px)] lg:max-h-[844px] lg:rounded-[40px] lg:border-4 lg:border-white/10 lg:overflow-hidden lg:shadow-2xl">
          <StoryShell />
        </div>
      </div>
    </div>
  );
}

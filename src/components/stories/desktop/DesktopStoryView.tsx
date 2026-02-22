"use client";

import { useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStoryStore } from "@/lib/stores/story-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectTabBar } from "./ProjectTabBar";
import { DesktopStoryHero } from "./DesktopStoryHero";
import { StageCardGrid } from "./StageCardGrid";
import { SmartFeed } from "./SmartFeed";
import { StoryFilterBar } from "./StoryFilterBar";
import { UpcomingProjectsSection } from "./UpcomingProjectsSection";
import { ArrowLeft, Loader2, Sparkles, FolderKanban, Gavel } from "lucide-react";
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
  const { stories, isLoading, activeTab, setActiveTab, storyFilters } = useStoryStore();

  const story = currentProjectId ? stories.get(currentProjectId) : undefined;

  const handleScrollToHero = useCallback(() => {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Filtered projects for the Projects tab
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Status filter
    if (storyFilters.status !== "all") {
      result = result.filter((p) => p.status === storyFilters.status);
    }

    // Client code filter
    if (storyFilters.clientCode) {
      result = result.filter((p) => p.clientCode === storyFilters.clientCode);
    }

    // Search filter
    if (storyFilters.search) {
      const q = storyFilters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.projectCode.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientCode.toLowerCase().includes(q)
      );
    }

    return result;
  }, [projects, storyFilters]);

  // Unique client codes for filter bar
  const clientCodes = useMemo(() => {
    const codes = new Set(projects.map((p) => p.clientCode).filter(Boolean));
    return [...codes].sort();
  }, [projects]);

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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "feed" | "projects" | "upcoming")}
      >
        <TabsList>
          <TabsTrigger value="feed" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Feed
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Gavel className="h-3.5 w-3.5" />
            Upcoming
          </TabsTrigger>
        </TabsList>

        {/* Smart Feed Tab */}
        <TabsContent value="feed">
          <SmartFeed />
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          {/* Filter bar */}
          <StoryFilterBar clientCodes={clientCodes} />

          {/* Project tabs */}
          <div className="mt-4">
            <ProjectTabBar
              projects={filteredProjects}
              currentProjectId={currentProjectId}
              onSelectProject={onSelectProject}
            />
          </div>

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
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming">
          <UpcomingProjectsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

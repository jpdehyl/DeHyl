"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Users,
  Hammer,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Calendar,
  MapPin,
  Clock
} from "lucide-react";
import type { ProjectStory, StoryStage } from "@/types/stories";
import { ChapterGenesis } from "./chapters/ChapterGenesis";
import { ChapterAssembly } from "./chapters/ChapterAssembly";
import { ChapterExecution } from "./chapters/ChapterExecution";
import { ChapterCompletion } from "./chapters/ChapterCompletion";
import { ChapterSettlement } from "./chapters/ChapterSettlement";

interface StoryViewerProps {
  story: ProjectStory;
}

// Map lifecycle stages to our five chapters
type ChapterKey = "genesis" | "assembly" | "execution" | "completion" | "settlement";

interface Chapter {
  key: ChapterKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  stages: string[]; // lifecycle stages that belong to this chapter
}

const CHAPTERS: Chapter[] = [
  {
    key: "genesis",
    label: "Genesis",
    icon: Sparkles,
    color: "text-violet-500",
    stages: ["bid_invite", "estimate", "po_contract"],
  },
  {
    key: "assembly",
    label: "Assembly",
    icon: Users,
    color: "text-blue-500",
    stages: ["pre_planning", "crew", "materials", "equipment"],
  },
  {
    key: "execution",
    label: "Execution",
    icon: Hammer,
    color: "text-amber-500",
    stages: ["daily_logs"],
  },
  {
    key: "completion",
    label: "Completion",
    icon: CheckCircle2,
    color: "text-emerald-500",
    stages: ["completion", "safety_docs"],
  },
  {
    key: "settlement",
    label: "Settlement",
    icon: DollarSign,
    color: "text-green-500",
    stages: ["invoicing", "payment"],
  },
];

function getChapterData(story: ProjectStory, chapterStages: string[]): StoryStage[] {
  return story.stages.filter((s) => chapterStages.includes(s.slug));
}

function hasChapterData(story: ProjectStory, chapterStages: string[]): boolean {
  return story.stages.some((s) => chapterStages.includes(s.slug) && s.hasData);
}

export function StoryViewer({ story }: StoryViewerProps) {
  const [activeChapter, setActiveChapter] = useState<ChapterKey>("genesis");

  // Determine which chapters have data
  const chaptersWithData = useMemo(() => {
    return CHAPTERS.map((ch) => ({
      ...ch,
      hasData: hasChapterData(story, ch.stages),
      data: getChapterData(story, ch.stages),
    }));
  }, [story]);

  // Find current chapter based on project state
  const currentChapterIndex = useMemo(() => {
    const currentStage = story.stages.find((s) => s.isCurrent);
    if (!currentStage) return chaptersWithData.length - 1;

    const idx = chaptersWithData.findIndex((ch) =>
      ch.stages.includes(currentStage.slug)
    );
    return idx >= 0 ? idx : 0;
  }, [story, chaptersWithData]);

  const activeChapterData = chaptersWithData.find((ch) => ch.key === activeChapter);

  return (
    <div>
      {/* Story Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-muted-foreground">
                {story.projectCode}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {story.clientCode}
              </span>
              {story.status === "active" ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  Active
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  Completed
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{story.projectName}</h2>
            <p className="text-muted-foreground mt-1">{story.clientName}</p>
          </div>

          {/* Thumbnail if available */}
          {story.thumbnailUrl && (
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
              <img
                src={story.thumbnailUrl}
                alt={story.projectName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Chapter Navigation */}
      <nav className="mb-8">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {chaptersWithData.map((chapter, index) => {
            const Icon = chapter.icon;
            const isActive = activeChapter === chapter.key;
            const isPast = index < currentChapterIndex;
            const isCurrent = index === currentChapterIndex;

            return (
              <button
                key={chapter.key}
                onClick={() => setActiveChapter(chapter.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md transition-all text-sm",
                  isActive
                    ? "bg-background shadow-sm font-medium"
                    : "hover:bg-background/50",
                  !chapter.hasData && "opacity-40"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? chapter.color : "text-muted-foreground"
                  )}
                />
                <span className="hidden sm:inline">{chapter.label}</span>
                {isCurrent && story.status === "active" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Chapter Content */}
      <div className="min-h-[400px]">
        {activeChapter === "genesis" && (
          <ChapterGenesis story={story} stages={activeChapterData?.data || []} />
        )}
        {activeChapter === "assembly" && (
          <ChapterAssembly story={story} stages={activeChapterData?.data || []} />
        )}
        {activeChapter === "execution" && (
          <ChapterExecution story={story} stages={activeChapterData?.data || []} />
        )}
        {activeChapter === "completion" && (
          <ChapterCompletion story={story} stages={activeChapterData?.data || []} />
        )}
        {activeChapter === "settlement" && (
          <ChapterSettlement story={story} stages={activeChapterData?.data || []} />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Users,
  Hammer,
  CheckCircle2,
  DollarSign,
  ArrowLeft,
  List,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { ProjectWithTotals, Invoice, Bill } from "@/types";
import { GenesisChapter } from "./GenesisChapter";
import { AssemblyChapter } from "./AssemblyChapter";
import { ExecutionChapter } from "./ExecutionChapter";
import { CompletionChapter } from "./CompletionChapter";
import { SettlementChapter } from "./SettlementChapter";
import { DataDrawer } from "./DataDrawer";

interface ProjectStoryViewProps {
  project: ProjectWithTotals;
  invoices: Invoice[];
  bills: Bill[];
  onRefetch: () => void;
}

type ChapterKey = "genesis" | "assembly" | "execution" | "completion" | "settlement";

interface Chapter {
  key: ChapterKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
}

const CHAPTERS: Chapter[] = [
  {
    key: "genesis",
    label: "Genesis",
    icon: Sparkles,
    color: "text-violet-500",
    bgGradient: "from-violet-500/10 via-purple-500/5",
  },
  {
    key: "assembly",
    label: "Assembly",
    icon: Users,
    color: "text-blue-500",
    bgGradient: "from-blue-500/10 via-cyan-500/5",
  },
  {
    key: "execution",
    label: "Execution",
    icon: Hammer,
    color: "text-amber-500",
    bgGradient: "from-amber-500/10 via-orange-500/5",
  },
  {
    key: "completion",
    label: "Completion",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgGradient: "from-emerald-500/10 via-green-500/5",
  },
  {
    key: "settlement",
    label: "Settlement",
    icon: DollarSign,
    color: "text-green-500",
    bgGradient: "from-green-500/10 via-emerald-500/5",
  },
];

export function ProjectStoryView({
  project,
  invoices,
  bills,
  onRefetch,
}: ProjectStoryViewProps) {
  const router = useRouter();
  const [activeChapter, setActiveChapter] = useState<ChapterKey>("genesis");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"timeline" | "invoices" | "costs">("timeline");

  const activeChapterData = CHAPTERS.find((ch) => ch.key === activeChapter);

  // Determine current chapter based on project state
  const getCurrentChapterIndex = () => {
    if (project.status === "closed") return 4; // Settlement
    if (project.totals.invoiced > 0) return 4; // Settlement
    if (project.totals.costs > 0) return 2; // Execution
    if (project.estimateAmount) return 1; // Assembly
    return 0; // Genesis
  };

  const currentChapterIndex = getCurrentChapterIndex();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/projects")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {project.code}
                  </span>
                  {project.status === "active" ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                      Completed
                    </span>
                  )}
                </div>
                <h1 className="text-lg font-semibold truncate max-w-md">
                  {project.description}
                </h1>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">View Data</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Chapter Navigation */}
      <div className="sticky top-[73px] z-30 border-b bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto">
            {CHAPTERS.map((chapter, index) => {
              const Icon = chapter.icon;
              const isActive = activeChapter === chapter.key;
              const isCurrent = index === currentChapterIndex;

              return (
                <button
                  key={chapter.key}
                  onClick={() => setActiveChapter(chapter.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm whitespace-nowrap",
                    isActive
                      ? "bg-accent font-medium"
                      : "hover:bg-accent/50 text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? chapter.color : "text-muted-foreground"
                    )}
                  />
                  <span>{chapter.label}</span>
                  {isCurrent && project.status === "active" && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Chapter Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {activeChapter === "genesis" && (
          <GenesisChapter project={project} />
        )}
        {activeChapter === "assembly" && (
          <AssemblyChapter project={project} />
        )}
        {activeChapter === "execution" && (
          <ExecutionChapter project={project} onRefetch={onRefetch} />
        )}
        {activeChapter === "completion" && (
          <CompletionChapter project={project} />
        )}
        {activeChapter === "settlement" && (
          <SettlementChapter project={project} invoices={invoices} bills={bills} />
        )}
      </main>

      {/* Data Drawer */}
      <DataDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        project={project}
        invoices={invoices}
        bills={bills}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        onRefetch={onRefetch}
      />
    </div>
  );
}

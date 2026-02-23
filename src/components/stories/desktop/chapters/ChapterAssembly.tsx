"use client";

import { useMemo } from "react";
import { Users, Wrench, Package, HardHat } from "lucide-react";
import type { ProjectStory, StoryStage } from "@/types/stories";

interface ChapterAssemblyProps {
  story: ProjectStory;
  stages: StoryStage[];
}

export function ChapterAssembly({ story, stages }: ChapterAssemblyProps) {
  const crewStage = stages.find((s) => s.slug === "crew");
  const materialsStage = stages.find((s) => s.slug === "materials");
  const equipmentStage = stages.find((s) => s.slug === "equipment");

  const hasData = crewStage?.hasData || materialsStage?.hasData || equipmentStage?.hasData;

  // Extract crew data
  const crewData = useMemo(() => {
    if (!crewStage) return null;
    const listSubstep = crewStage.substeps.find((s) => s.type === "list");
    return listSubstep?.data as { members?: Array<{ name: string; role: string; avatar?: string }> } | null;
  }, [crewStage]);

  const crewMembers = crewData?.members || [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border p-8">
        <div className="relative z-10">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
            Chapter 2
          </p>
          <h3 className="text-3xl font-bold mb-4">Assembly</h3>
          <p className="text-muted-foreground max-w-lg">
            The team and tools. Who&apos;s on the job and what they&apos;re working with.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
      </div>

      {/* Crew Grid */}
      {crewMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Crew</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {crewMembers.length}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {crewMembers.map((member, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-card border text-center"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <p className="font-medium text-sm truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-card border text-center">
          <HardHat className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{crewMembers.length || "—"}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Crew Size</p>
        </div>
        <div className="p-6 rounded-xl bg-card border text-center">
          <Wrench className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">—</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Equipment</p>
        </div>
        <div className="p-6 rounded-xl bg-card border text-center">
          <Package className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">—</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Materials</p>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="text-center py-12 px-8 rounded-xl border border-dashed">
          <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No crew or equipment data yet.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Team assignments will appear here once added.
          </p>
        </div>
      )}
    </div>
  );
}

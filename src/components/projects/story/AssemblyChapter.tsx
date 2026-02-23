"use client";

import { useState, useEffect } from "react";
import { Users, Wrench, Package, HardHat, Loader2 } from "lucide-react";
import type { ProjectWithTotals } from "@/types";

interface AssemblyChapterProps {
  project: ProjectWithTotals;
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
}

interface CrewAssignment {
  id: string;
  crewMember: CrewMember;
  role: string;
  startDate: string;
  endDate: string | null;
}

export function AssemblyChapter({ project }: AssemblyChapterProps) {
  const [crew, setCrew] = useState<CrewAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCrew() {
      try {
        const res = await fetch(`/api/projects/${project.id}/crew`);
        if (res.ok) {
          const data = await res.json();
          setCrew(data.assignments || []);
        }
      } catch (error) {
        console.error("Failed to fetch crew:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCrew();
  }, [project.id]);

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
            The team and resources. Who&apos;s on the job and what they need.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
      </div>

      {/* Crew Section */}
      <div>
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Users className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Crew</span>
          {crew.length > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {crew.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : crew.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {crew.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 rounded-xl bg-card border text-center hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl">
                  {assignment.crewMember.name.charAt(0)}
                </div>
                <p className="font-medium text-sm truncate">
                  {assignment.crewMember.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {assignment.role.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-8 rounded-xl border border-dashed">
            <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No crew assigned yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Team assignments will appear here when added.
            </p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-card border text-center">
          <HardHat className="h-8 w-8 text-blue-500 mx-auto mb-3" />
          <p className="text-3xl font-bold">{crew.length || "—"}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            Team Size
          </p>
        </div>
        <div className="p-6 rounded-xl bg-card border text-center">
          <Wrench className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <p className="text-3xl font-bold">—</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            Equipment
          </p>
        </div>
        <div className="p-6 rounded-xl bg-card border text-center">
          <Package className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
          <p className="text-3xl font-bold">—</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            Materials
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Hammer,
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { ProjectWithTotals, Activity } from "@/types";

interface ExecutionChapterProps {
  project: ProjectWithTotals;
  onRefetch: () => void;
}

export function ExecutionChapter({ project, onRefetch }: ExecutionChapterProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({
    totalDays: 0,
    totalHours: 0,
    avgCrew: 0,
    totalCosts: 0,
  });

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${project.id}/timeline?types=daily_log&order=desc&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);

        // Calculate stats from daily logs
        const logs = data.activities || [];
        let totalHours = 0;
        let totalCrew = 0;
        logs.forEach((log: Activity) => {
          const meta = log.metadata as Record<string, unknown>;
          totalHours += (meta?.totalHours as number) || 0;
          totalCrew += (meta?.crewCount as number) || 1;
        });

        setStats({
          totalDays: logs.length,
          totalHours: Math.round(totalHours),
          avgCrew: logs.length > 0 ? Math.round(totalCrew / logs.length) : 0,
          totalCosts: project.totals.costs,
        });
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  }, [project.id, project.totals.costs]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const currentActivity = activities[currentIndex];

  const nextDay = () => {
    if (currentIndex < activities.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevDay = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border p-8">
        <div className="relative z-10">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            Chapter 3
          </p>
          <h3 className="text-3xl font-bold mb-4">Execution</h3>
          <p className="text-muted-foreground max-w-lg">
            Day by day in the field. The work, the progress, the story as it unfolds.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-card border text-center">
          <Calendar className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{stats.totalDays}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Days Logged
          </p>
        </div>
        <div className="p-5 rounded-xl bg-card border text-center">
          <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{stats.totalHours}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Total Hours
          </p>
        </div>
        <div className="p-5 rounded-xl bg-card border text-center">
          <Users className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{stats.avgCrew || "—"}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Avg Crew
          </p>
        </div>
        <div className="p-5 rounded-xl bg-card border text-center">
          <FileText className="h-6 w-6 text-rose-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">
            {stats.totalCosts > 0 ? formatCurrency(stats.totalCosts) : "—"}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Costs
          </p>
        </div>
      </div>

      {/* Daily Log Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length > 0 && currentActivity ? (
        <div className="rounded-2xl border bg-card overflow-hidden">
          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <button
              onClick={prevDay}
              disabled={currentIndex === 0}
              className={cn(
                "p-2 rounded-lg transition-colors",
                currentIndex === 0
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Day {activities.length - currentIndex} of {activities.length}
              </p>
              <p className="font-semibold">
                {new Date(currentActivity.activityDate).toLocaleDateString("en-CA", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <button
              onClick={nextDay}
              disabled={currentIndex === activities.length - 1}
              className={cn(
                "p-2 rounded-lg transition-colors",
                currentIndex === activities.length - 1
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day Content */}
          <div className="p-6">
            {/* Title */}
            <h4 className="text-lg font-semibold mb-4">{currentActivity.title}</h4>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {(() => {
                const meta = currentActivity.metadata as Record<string, unknown>;
                const totalHours = meta?.totalHours as number | undefined;
                const crewCount = meta?.crewCount as number | undefined;
                const weather = meta?.weather as string | undefined;
                return (
                  <>
                    {totalHours && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{totalHours}h</span>
                      </div>
                    )}
                    {crewCount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{crewCount} crew</span>
                      </div>
                    )}
                    {weather && (
                      <span className="text-sm text-muted-foreground capitalize">
                        {weather}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Description */}
            {currentActivity.description && (
              <p className="text-muted-foreground leading-relaxed">
                {currentActivity.description}
              </p>
            )}

            {/* Areas worked */}
            {(() => {
              const meta = currentActivity.metadata as Record<string, unknown>;
              const areasWorked = meta?.areasWorked as string[] | undefined;
              if (!Array.isArray(areasWorked) || areasWorked.length === 0) return null;
              return (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Areas Worked</p>
                  <div className="flex flex-wrap gap-2">
                    {areasWorked.map((area, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-muted rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Day Dots */}
          <div className="px-6 py-4 border-t flex items-center justify-center gap-1.5 overflow-x-auto">
            {activities.slice(0, 20).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all shrink-0",
                  i === currentIndex
                    ? "w-6 bg-amber-500"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
            {activities.length > 20 && (
              <span className="text-xs text-muted-foreground ml-2">
                +{activities.length - 20} more
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 px-8 rounded-xl border border-dashed">
          <Hammer className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No daily logs yet</p>
          <p className="text-sm text-muted-foreground/70 mb-6">
            Field updates will appear here as work progresses.
          </p>
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Daily Log
          </Button>
        </div>
      )}
    </div>
  );
}

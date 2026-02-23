"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Hammer,
  Calendar,
  Clock,
  Users,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Mic,
  Play,
} from "lucide-react";
import type { ProjectStory, StoryStage, StorySubstep } from "@/types/stories";

interface ChapterExecutionProps {
  story: ProjectStory;
  stages: StoryStage[];
}

interface DayLog {
  date: string;
  notes: string;
  hours: number;
  crewCount: number;
  weather?: string;
  photos?: string[];
  audioNotes?: string[];
}

const WEATHER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
};

export function ChapterExecution({ story, stages }: ChapterExecutionProps) {
  const dailyLogsStage = stages.find((s) => s.slug === "daily_logs");
  const hasData = dailyLogsStage?.hasData;

  // Extract daily logs
  const dailyLogs = useMemo(() => {
    if (!dailyLogsStage) return [];
    return dailyLogsStage.substeps
      .filter((s) => s.type === "text" || s.type === "photo")
      .map((s) => ({
        date: new Date(s.timestamp).toLocaleDateString("en-CA"),
        notes: s.title,
        hours: (s.data as { hours?: number })?.hours || 0,
        crewCount: (s.data as { crewCount?: number })?.crewCount || 0,
        weather: (s.data as { weather?: string })?.weather,
        photos: (s.data as { photos?: string[] })?.photos || [],
        audioNotes: (s.data as { audioNotes?: string[] })?.audioNotes || [],
      })) as DayLog[];
  }, [dailyLogsStage]);

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const currentDay = dailyLogs[currentDayIndex];

  const totalHours = dailyLogs.reduce((sum, d) => sum + d.hours, 0);
  const totalDays = dailyLogs.length;

  const nextDay = () => {
    if (currentDayIndex < dailyLogs.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  const prevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-card border text-center">
          <Calendar className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{totalDays}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Days Logged</p>
        </div>
        <div className="p-6 rounded-xl bg-card border text-center">
          <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{totalHours}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Hours</p>
        </div>
        <div className="p-6 rounded-xl bg-card border text-center">
          <Users className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">
            {dailyLogs.length > 0
              ? Math.round(dailyLogs.reduce((sum, d) => sum + d.crewCount, 0) / dailyLogs.length)
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Crew</p>
        </div>
      </div>

      {/* Daily Log Timeline */}
      {dailyLogs.length > 0 && currentDay && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          {/* Day Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <button
              onClick={prevDay}
              disabled={currentDayIndex === 0}
              className={cn(
                "p-2 rounded-lg transition-colors",
                currentDayIndex === 0
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Day {currentDayIndex + 1} of {dailyLogs.length}
              </p>
              <p className="font-semibold">{currentDay.date}</p>
            </div>

            <button
              onClick={nextDay}
              disabled={currentDayIndex === dailyLogs.length - 1}
              className={cn(
                "p-2 rounded-lg transition-colors",
                currentDayIndex === dailyLogs.length - 1
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day Content */}
          <div className="p-6">
            {/* Weather & Stats Row */}
            <div className="flex items-center gap-4 mb-6">
              {currentDay.weather && WEATHER_ICONS[currentDay.weather] && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  {(() => {
                    const WeatherIcon = WEATHER_ICONS[currentDay.weather];
                    return <WeatherIcon className="h-5 w-5" />;
                  })()}
                  <span className="text-sm capitalize">{currentDay.weather}</span>
                </div>
              )}
              {currentDay.hours > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{currentDay.hours} hrs</span>
                </div>
              )}
              {currentDay.crewCount > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{currentDay.crewCount} crew</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {currentDay.notes && (
              <div className="mb-6">
                <p className="text-lg leading-relaxed">{currentDay.notes}</p>
              </div>
            )}

            {/* Photos */}
            {currentDay.photos && currentDay.photos.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-2">
                  {currentDay.photos.map((photo, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg bg-muted overflow-hidden"
                    >
                      <img
                        src={photo}
                        alt={`Day ${currentDayIndex + 1} photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Notes */}
            {currentDay.audioNotes && currentDay.audioNotes.length > 0 && (
              <div className="space-y-2">
                {currentDay.audioNotes.map((audio, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <button className="p-2 rounded-full bg-primary text-primary-foreground">
                      <Play className="h-4 w-4" />
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-muted rounded-full">
                        <div className="h-full w-0 bg-primary rounded-full" />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">0:34</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Day Dots Navigation */}
          <div className="px-6 py-4 border-t flex items-center justify-center gap-1.5">
            {dailyLogs.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentDayIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === currentDayIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasData && (
        <div className="text-center py-12 px-8 rounded-xl border border-dashed">
          <Hammer className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No daily logs yet for this project.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Field updates will appear here as work progresses.
          </p>
        </div>
      )}
    </div>
  );
}

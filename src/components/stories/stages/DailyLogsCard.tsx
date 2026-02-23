"use client";

import { motion } from "framer-motion";
import type { StorySubstep, StoryStage } from "@/types/stories";
import { cn, formatDate } from "@/lib/utils";
import { WeatherBadge } from "../widgets/WeatherBadge";
import { MetricCard } from "../widgets/MetricCard";

interface DailyLogsCardProps {
  substep: StorySubstep;
  stage: StoryStage;
}

interface CrewMember {
  name: string;
  hours: number;
  role: string;
}

export function DailyLogsCard({ substep }: DailyLogsCardProps) {
  const {
    date,
    workSummary,
    weather,
    temperatureHigh,
    temperatureLow,
    totalHours,
    notes,
    areasWorked,
    crewCount,
    crew,
    materials,
    equipment,
  } = substep.data as {
    date: string | Date;
    workSummary: string;
    weather: string;
    temperatureHigh: number;
    temperatureLow: number;
    totalHours: number;
    notes: string;
    areasWorked: string[];
    crewCount: number;
    crew: CrewMember[];
    materials: { name: string; quantity: number; unit: string | null }[] | null;
    equipment: { name: string; hours: number | null }[] | null;
  };

  const formattedDate = date ? formatDate(date) : "Unknown Date";
  const crewMembers = (crew ?? []) as CrewMember[];
  const areas = (areasWorked ?? []) as string[];

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pb-4 scrollbar-none">
      {/* Header: Date + Weather */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div>
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
            Daily Log
          </p>
          <h2 className="text-2xl font-bold text-white mt-1">{formattedDate}</h2>
        </div>
        {weather && (
          <WeatherBadge
            weather={weather}
            high={temperatureHigh}
            low={temperatureLow}
          />
        )}
      </motion.div>

      {/* Work Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl bg-white/5 border border-white/10 p-4"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">
          Work Summary
        </p>
        <p className="text-white/90 text-sm leading-relaxed">
          {(workSummary as string) || "No summary recorded."}
        </p>
      </motion.div>

      {/* Metrics Row: Crew Count + Total Hours */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <MetricCard
          label="Crew on Site"
          value={crewCount ?? crewMembers.length ?? 0}
          icon="👷"
        />
        <MetricCard
          label="Total Hours"
          value={totalHours ?? 0}
          suffix="hrs"
          icon="⏱"
        />
      </motion.div>

      {/* Areas Worked Tags */}
      {areas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">
            Areas Worked
          </p>
          <div className="flex flex-wrap gap-2">
            {areas.map((area, i) => (
              <motion.span
                key={area}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.15 + i * 0.04 }}
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                  "bg-white/10 text-white/80 border border-white/10"
                )}
              >
                {area}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Crew List */}
      {crewMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">
            Crew
          </p>
          <div className="space-y-2">
            {crewMembers.map((member, i) => (
              <motion.div
                key={`${member.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.2 + i * 0.04 }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl",
                  "bg-white/5 border border-white/5"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white/70">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 font-medium truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-white/40">{member.role}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-white/60 shrink-0 ml-2">
                  {member.hours}h
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Notes */}
      {notes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">
            Notes
          </p>
          <p className="text-white/70 text-sm leading-relaxed">{notes as string}</p>
        </motion.div>
      )}

      {/* Materials / Equipment (if present) */}
      {((materials && materials.length > 0) || (equipment && equipment.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          {materials && materials.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-1">
                Materials
              </p>
              <p className="text-sm text-white/70">
                {materials.map((m) => m.name).join(", ")}
              </p>
            </div>
          )}
          {equipment && equipment.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-1">
                Equipment
              </p>
              <p className="text-sm text-white/70">
                {equipment.map((e) => e.name).join(", ")}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

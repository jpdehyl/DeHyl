"use client";

import { motion } from "framer-motion";
import type { StorySubstep, StoryStage } from "@/types/stories";
import { cn } from "@/lib/utils";
import { CrewAvatarStack } from "../widgets/CrewAvatarStack";
import { AnimatedCounter } from "../widgets/AnimatedCounter";

interface CrewAssignmentCardProps {
  substep: StorySubstep;
  stage: StoryStage;
}

interface CrewMemberData {
  id: string;
  name: string;
  role: string;
  company: string;
  employmentType: string;
}

export function CrewAssignmentCard({ substep }: CrewAssignmentCardProps) {
  const {
    totalCrew,
    roleGroups,
    members,
  } = substep.data as {
    totalCrew: number;
    roleGroups: Record<string, string[]>;
    members: CrewMemberData[];
  };

  const crewMembers = (members ?? []) as CrewMemberData[];
  const crewTotal = totalCrew ?? crewMembers.length;
  const groups = (roleGroups ?? {}) as Record<string, string[]>;

  // Build role summary string like "2 Foremen, 3 Laborers"
  const roleSummary = Object.entries(groups)
    .map(([role, names]) => `${(names as string[]).length} ${role}`)
    .join(", ");

  // Colors for role badges
  const roleColors: Record<string, string> = {
    Foreman: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Foremen: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Laborer: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Laborers: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Operator: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    Operators: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    Supervisor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Supervisors: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Driver: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    Drivers: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  };

  const defaultRoleColor = "bg-white/10 text-white/70 border-white/15";

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto pb-4 scrollbar-none">
      {/* Big crew count */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        className="text-center pt-2"
      >
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">
          Crew Assigned
        </p>
        <div className="text-6xl font-black text-white leading-none">
          <AnimatedCounter value={crewTotal} />
        </div>
        {roleSummary && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-sm mt-2"
          >
            {roleSummary}
          </motion.p>
        )}
      </motion.div>

      {/* Role breakdown badges */}
      {Object.keys(groups).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {Object.entries(groups).map(([role, names], i) => (
            <motion.span
              key={role}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 + i * 0.05 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                roleColors[role] ?? defaultRoleColor
              )}
            >
              <span className="text-sm font-bold">{(names as string[]).length}</span>
              {role}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* Avatar stack */}
      {crewMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="flex justify-center"
        >
          <CrewAvatarStack
            members={crewMembers.map((m) => ({
              id: m.id,
              name: m.name,
              role: m.role,
            }))}
            maxDisplay={8}
          />
        </motion.div>
      )}

      {/* Scrollable crew member list */}
      {crewMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex-1 min-h-0"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2 px-1">
            Team Members
          </p>
          <div className="space-y-2 overflow-y-auto max-h-[40vh] scrollbar-none">
            {crewMembers.map((member, i) => (
              <motion.div
                key={member.id ?? `${member.name}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.2 + i * 0.04 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                  "bg-white/5 border border-white/5 hover:bg-white/8 transition-colors"
                )}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white/70">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 font-medium truncate">
                    {member.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/40">{member.role}</span>
                    {member.company && (
                      <>
                        <span className="text-white/20 text-xs">|</span>
                        <span className="text-xs text-white/30 truncate">
                          {member.company}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Employment type badge */}
                {member.employmentType && (
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                      member.employmentType === "full-time"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : member.employmentType === "sub-contractor"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-white/10 text-white/50"
                    )}
                  >
                    {member.employmentType === "full-time"
                      ? "FT"
                      : member.employmentType === "sub-contractor"
                      ? "Sub"
                      : member.employmentType}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

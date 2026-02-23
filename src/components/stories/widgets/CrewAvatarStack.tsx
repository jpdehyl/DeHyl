"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CrewMember {
  id?: string;
  name: string;
  role: string;
}

interface CrewAvatarStackProps {
  members: CrewMember[];
  max?: number;
  maxDisplay?: number;
  className?: string;
}

const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getDeterministicColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function CrewAvatarStack({
  members,
  max = 5,
  maxDisplay,
  className,
}: CrewAvatarStackProps) {
  const limit = maxDisplay ?? max;
  const visibleMembers = members.slice(0, limit);
  const overflowCount = members.length - limit;

  return (
    <div className={cn("flex items-center", className)}>
      {visibleMembers.map((member, index) => {
        const color = getDeterministicColor(member.name);
        const initials = getInitials(member.name);

        return (
          <motion.div
            key={member.id ?? `${member.name}-${member.role}`}
            className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-900 text-white text-xs font-bold shrink-0"
            style={{
              backgroundColor: color,
              marginLeft: index === 0 ? 0 : -8,
              zIndex: visibleMembers.length - index,
            }}
            initial={{ opacity: 0, scale: 0.5, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.08,
              ease: "easeOut",
            }}
            title={`${member.name} — ${member.role}`}
          >
            {initials}
          </motion.div>
        );
      })}

      {overflowCount > 0 && (
        <motion.div
          className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-900 bg-white/20 text-white text-xs font-bold shrink-0 backdrop-blur-sm"
          style={{ marginLeft: -8, zIndex: 0 }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.3,
            delay: visibleMembers.length * 0.08,
            ease: "easeOut",
          }}
        >
          +{overflowCount}
        </motion.div>
      )}
    </div>
  );
}

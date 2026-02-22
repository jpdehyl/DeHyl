"use client";

import { getRelativeTime } from "@/lib/utils";

export function RelativeTime({ date, className }: { date: string | Date; className?: string }) {
  return <span className={className}>{getRelativeTime(date)}</span>;
}

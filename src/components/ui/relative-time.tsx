"use client";

import { useState, useEffect } from "react";
import { getRelativeTime } from "@/lib/utils";

export function RelativeTime({ date, className }: { date: string | Date; className?: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(getRelativeTime(date));
  }, [date]);

  return <span className={className} suppressHydrationWarning>{text}</span>;
}

"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  duration = 800,
  className,
  formatter,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => {
    if (formatter) return formatter(Math.round(latest));
    const formatted = new Intl.NumberFormat("en-CA", {
      minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: value % 1 !== 0 ? 2 : 0,
    }).format(Math.abs(latest));
    const sign = value < 0 && latest !== 0 ? "-" : "";
    return `${sign}${prefix}${formatted}`;
  });

  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [value, duration, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = latest;
      }
    });
    return unsubscribe;
  }, [rounded]);

  return (
    <motion.span
      ref={displayRef}
      className={cn("tabular-nums font-semibold text-white", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}0
    </motion.span>
  );
}

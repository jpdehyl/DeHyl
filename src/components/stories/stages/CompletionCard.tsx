"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StorySubstep, StoryStage } from "@/types/stories";
import { cn, formatCurrency } from "@/lib/utils";
import { MetricCard } from "../widgets/MetricCard";
import { AnimatedCounter } from "../widgets/AnimatedCounter";
import { StatusPill } from "../widgets/StatusPill";

interface CompletionCardProps {
  substep: StorySubstep;
  stage: StoryStage;
}

interface PhotoItem {
  url: string;
  thumbnail: string;
  caption?: string;
  category?: string;
}

export function CompletionCard({ substep }: CompletionCardProps) {
  if (substep.type === "photo_grid") {
    return <PhotoGridView substep={substep} />;
  }

  if (substep.type === "metric") {
    return <CompletionMetricView substep={substep} />;
  }

  return (
    <div className="flex items-center justify-center h-full text-white/60">
      <p className="text-sm">{substep.title}</p>
    </div>
  );
}

// -----------------------------------------------
// Photo grid view: before/after, during, all photos
// -----------------------------------------------
function PhotoGridView({ substep }: { substep: StorySubstep }) {
  const {
    before,
    after,
    during,
    all,
    totalPhotos,
  } = substep.data as {
    before?: PhotoItem[];
    after?: PhotoItem[];
    during?: PhotoItem[];
    all?: PhotoItem[];
    totalPhotos?: number;
  };

  const beforePhotos = (before ?? []) as PhotoItem[];
  const afterPhotos = (after ?? []) as PhotoItem[];
  const duringPhotos = (during ?? []) as PhotoItem[];
  const allPhotos = (all ?? []) as PhotoItem[];

  const hasBeforeAfter = beforePhotos.length > 0 && afterPhotos.length > 0;
  const photoCount = totalPhotos ?? allPhotos.length;

  // For before/after split view
  const [splitIndex, setSplitIndex] = useState(0);
  const maxSplitPairs = Math.min(beforePhotos.length, afterPhotos.length);

  // Determine grid photos: use 'all' if available, otherwise 'during'
  const gridPhotos = allPhotos.length > 0 ? allPhotos : duringPhotos;
  const gridColumns = gridPhotos.length <= 4 ? 2 : 3;

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pb-4 scrollbar-none">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
            Project Photos
          </p>
          <h2 className="text-xl font-bold text-white mt-1">
            {substep.title || "Completion"}
          </h2>
        </div>
        {photoCount > 0 && (
          <span className="text-sm text-white/40 font-medium">
            {photoCount} photos
          </span>
        )}
      </motion.div>

      {/* Before / After Split View */}
      {hasBeforeAfter && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl overflow-hidden border border-white/10"
        >
          <div className="grid grid-cols-2 gap-0.5 bg-white/10">
            {/* Before */}
            <div className="relative">
              <div className="absolute top-2 left-2 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white/90 px-2 py-0.5 rounded-full">
                  Before
                </span>
              </div>
              <div className="aspect-[4/3] bg-black/30 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`before-${splitIndex}`}
                    src={beforePhotos[splitIndex % beforePhotos.length].thumbnail || beforePhotos[splitIndex % beforePhotos.length].url}
                    alt={beforePhotos[splitIndex % beforePhotos.length].caption || "Before"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
            </div>

            {/* After */}
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/80 text-white px-2 py-0.5 rounded-full">
                  After
                </span>
              </div>
              <div className="aspect-[4/3] bg-black/30 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`after-${splitIndex}`}
                    src={afterPhotos[splitIndex % afterPhotos.length].thumbnail || afterPhotos[splitIndex % afterPhotos.length].url}
                    alt={afterPhotos[splitIndex % afterPhotos.length].caption || "After"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Caption */}
          {(beforePhotos[splitIndex % beforePhotos.length]?.caption ||
            afterPhotos[splitIndex % afterPhotos.length]?.caption) && (
            <div className="bg-white/5 px-3 py-2">
              <p className="text-xs text-white/60 text-center">
                {afterPhotos[splitIndex % afterPhotos.length]?.caption ??
                  beforePhotos[splitIndex % beforePhotos.length]?.caption}
              </p>
            </div>
          )}

          {/* Navigation dots for multiple before/after pairs */}
          {maxSplitPairs > 1 && (
            <div className="flex justify-center gap-1.5 py-2 bg-white/5">
              {Array.from({ length: maxSplitPairs }).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSplitIndex(i);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === splitIndex
                      ? "w-4 bg-white/80"
                      : "w-1.5 bg-white/30"
                  )}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Photo Grid */}
      {gridPhotos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: hasBeforeAfter ? 0.15 : 0.05 }}
        >
          {!hasBeforeAfter && duringPhotos.length > 0 && (
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">
              During Construction
            </p>
          )}
          <div
            className={cn(
              "grid gap-1.5 rounded-2xl overflow-hidden",
              gridColumns === 2 ? "grid-cols-2" : "grid-cols-3"
            )}
          >
            {gridPhotos.slice(0, gridColumns === 2 ? 4 : 9).map((photo, i) => (
              <motion.div
                key={`grid-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: 0.1 + i * 0.04 }}
                className="relative aspect-square bg-black/30 overflow-hidden rounded-lg"
              >
                <img
                  src={photo.thumbnail || photo.url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {photo.category && (
                  <div className="absolute bottom-1 left-1">
                    <span className="text-[9px] font-medium bg-black/60 text-white/80 px-1.5 py-0.5 rounded-full">
                      {photo.category}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Show remaining count if more photos */}
          {gridPhotos.length > (gridColumns === 2 ? 4 : 9) && (
            <p className="text-xs text-white/40 text-center mt-2">
              +{gridPhotos.length - (gridColumns === 2 ? 4 : 9)} more photos
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// -----------------------------------------------
// Metric view: completion summary stats
// -----------------------------------------------
function CompletionMetricView({ substep }: { substep: StorySubstep }) {
  const {
    status,
    estimateAmount,
    finalCost,
    finalRevenue,
    profitMargin,
    totalPhotos,
  } = substep.data as {
    status: string;
    estimateAmount: number;
    finalCost: number;
    finalRevenue: number;
    profitMargin: number;
    totalPhotos: number;
  };

  const marginPercentage = profitMargin != null ? profitMargin : 0;
  const isPositiveMargin = marginPercentage >= 0;

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Project Completion
        </p>
        {status && (
          <div className="mt-2 flex justify-center">
            <StatusPill status={status} />
          </div>
        )}
      </motion.div>

      {/* Profit margin highlight */}
      {profitMargin != null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
            Profit Margin
          </p>
          <div
            className={cn(
              "text-5xl font-black leading-none",
              isPositiveMargin ? "text-emerald-400" : "text-red-400"
            )}
          >
            <AnimatedCounter
              value={marginPercentage}
              formatter={(val) => `${val.toFixed(1)}%`}
            />
          </div>
        </motion.div>
      )}

      {/* Metrics grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="grid grid-cols-2 gap-3"
      >
        {estimateAmount != null && (
          <MetricCard
            label="Estimate"
            value={estimateAmount}
            formatter={formatCurrency}
            icon="📋"
          />
        )}
        {finalCost != null && (
          <MetricCard
            label="Final Cost"
            value={finalCost}
            formatter={formatCurrency}
            icon="💰"
          />
        )}
        {finalRevenue != null && (
          <MetricCard
            label="Revenue"
            value={finalRevenue}
            formatter={formatCurrency}
            icon="📈"
          />
        )}
        {totalPhotos != null && (
          <MetricCard
            label="Photos"
            value={totalPhotos}
            icon="📸"
          />
        )}
      </motion.div>

      {/* Estimate vs Final comparison bar */}
      {estimateAmount != null && finalCost != null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
            Estimate vs Actual
          </p>
          <div className="space-y-3">
            {/* Estimate bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/50">Estimate</span>
                <span className="text-white/70 font-medium">
                  {formatCurrency(estimateAmount)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="h-full rounded-full bg-blue-500/60"
                />
              </div>
            </div>

            {/* Actual bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/50">Actual</span>
                <span className="text-white/70 font-medium">
                  {formatCurrency(finalCost)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((finalCost / estimateAmount) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className={cn(
                    "h-full rounded-full",
                    finalCost <= estimateAmount
                      ? "bg-emerald-500/60"
                      : "bg-red-500/60"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Variance */}
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-xs text-white/40">Variance</span>
            <span
              className={cn(
                "text-sm font-semibold",
                finalCost <= estimateAmount
                  ? "text-emerald-400"
                  : "text-red-400"
              )}
            >
              {finalCost <= estimateAmount ? "-" : "+"}
              {formatCurrency(Math.abs(finalCost - estimateAmount))}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

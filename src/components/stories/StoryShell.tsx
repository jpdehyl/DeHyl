"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStoryStore } from "@/lib/stores/story-store";
import { useStoryGestures } from "@/hooks/use-story-gestures";
import { STAGE_GRADIENTS } from "@/lib/stories/stage-config";
import { StoryProgressBar } from "./StoryProgressBar";
import { StoryOverlay } from "./StoryOverlay";
import { StorySubstepDots } from "./StorySubstepDots";
import { StoryCard } from "./StoryCard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const stageVariants = {
  enter: (direction: string | null) => ({
    y: direction === "up" ? "100%" : direction === "down" ? "-100%" : 0,
    x: direction === "left" ? "100%" : direction === "right" ? "-100%" : 0,
    opacity: 0,
    rotate: direction === "left" ? 5 : direction === "right" ? -5 : 0,
  }),
  center: {
    y: 0,
    x: 0,
    opacity: 1,
    rotate: 0,
  },
  exit: (direction: string | null) => ({
    y: direction === "up" ? "-100%" : direction === "down" ? "100%" : 0,
    x: direction === "left" ? "-100%" : direction === "right" ? "100%" : 0,
    opacity: 0,
    rotate: direction === "left" ? -15 : direction === "right" ? 15 : 0,
  }),
};

const substepVariants = {
  enter: { opacity: 0, scale: 0.98 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

const stageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const substepTransition = {
  duration: 0.2,
  ease: "easeInOut" as const,
};


export function StoryShell() {
  const {
    currentProjectId,
    currentStageIndex,
    currentSubstepIndex,
    direction,
    stories,
    isLoading,
    nextStage,
    prevStage,
    nextSubstep,
    prevSubstep,
    nextProject,
    prevProject,
    setDirection,
  } = useStoryStore();

  const story = currentProjectId ? stories.get(currentProjectId) : undefined;
  const currentStage = story?.stages[currentStageIndex] ?? null;
  const totalSubsteps = currentStage?.substeps.length ?? 0;

  const handleTapRight = useCallback(() => {
    // Try to advance substep, if at end, advance stage
    const advanced = nextSubstep();
    if (!advanced) {
      nextStage();
    }
  }, [nextSubstep, nextStage]);

  const handleTapLeft = useCallback(() => {
    // Try to go back substep, if at start, go back stage
    const wentBack = prevSubstep();
    if (!wentBack) {
      prevStage();
    }
  }, [prevSubstep, prevStage]);

  const bind = useStoryGestures({
    onSwipeUp: nextStage,
    onSwipeDown: prevStage,
    onSwipeLeft: nextProject,
    onSwipeRight: prevProject,
    onTapLeft: handleTapLeft,
    onTapRight: handleTapRight,
    enabled: !!story && !isLoading,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!story) return;
      // Skip if the story container is hidden (desktop uses blog layout)
      const container = document.querySelector("[data-story-container]") as HTMLElement | null;
      if (container && container.offsetParent === null) return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          prevStage();
          break;
        case "ArrowDown":
          e.preventDefault();
          nextStage();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleTapLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleTapRight();
          break;
        case "Escape":
          window.history.back();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [story, prevStage, nextStage, handleTapLeft, handleTapRight]);

  // Clear direction after animation
  useEffect(() => {
    if (direction) {
      const timeout = setTimeout(() => setDirection(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [direction, setDirection]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (!story || !currentStage) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="text-center text-white/60">
          <p className="text-lg font-medium">No story data</p>
          <p className="text-sm mt-1">Select a project to view its story</p>
        </div>
      </div>
    );
  }

  const gradient = STAGE_GRADIENTS[currentStage.slug] || "from-slate-900 to-slate-950";

  return (
    <div
      {...bind()}
      data-story-container
      className={cn(
        "h-full w-full relative select-none touch-none overflow-hidden bg-gradient-to-b",
        gradient
      )}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <StoryProgressBar
          totalStages={story.stages.length}
          currentStageIndex={currentStageIndex}
          currentSubstepIndex={currentSubstepIndex}
          totalSubsteps={totalSubsteps}
        />
      </div>

      {/* Project info overlay */}
      <StoryOverlay
        projectCode={story.projectCode}
        projectName={story.projectName}
        clientName={story.clientName}
        currentStage={currentStage}
        stageIndex={currentStageIndex}
        totalStages={story.stages.length}
      />

      {/* Main content area */}
      <div className="absolute inset-0 pt-20 pb-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentProjectId}-${currentStageIndex}`}
            custom={direction}
            variants={
              direction === "left" || direction === "right"
                ? stageVariants
                : direction === "up" || direction === "down"
                ? stageVariants
                : substepVariants
            }
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              direction === "left" || direction === "right" || direction === "up" || direction === "down"
                ? stageTransition
                : substepTransition
            }
            className="h-full w-full"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentStageIndex}-${currentSubstepIndex}`}
                variants={substepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={substepTransition}
                className="h-full w-full px-4"
              >
                <StoryCard stage={currentStage} substepIndex={currentSubstepIndex} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Substep dots */}
      <StorySubstepDots total={totalSubsteps} current={currentSubstepIndex} />
    </div>
  );
}

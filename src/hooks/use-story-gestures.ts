"use client";

import { useCallback } from "react";
import { useGesture } from "@use-gesture/react";

interface UseStoryGesturesOptions {
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTapLeft: () => void;
  onTapRight: () => void;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;
const TAP_LEFT_RATIO = 0.3; // Left 30% of screen

export function useStoryGestures({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onTapLeft,
  onTapRight,
  enabled = true,
}: UseStoryGesturesOptions) {
  const handleTap = useCallback(
    (event: { event: PointerEvent | MouseEvent | TouchEvent }) => {
      if (!enabled) return;

      const target = event.event.target as HTMLElement;
      // Don't intercept taps on buttons, links, or interactive elements
      if (target.closest("button, a, input, [role='button'], [data-no-tap]")) {
        return;
      }

      const rect = (target.closest("[data-story-container]") || document.body).getBoundingClientRect();
      const clientX =
        "clientX" in event.event
          ? event.event.clientX
          : (event.event as TouchEvent).touches?.[0]?.clientX ?? 0;

      const relativeX = (clientX - rect.left) / rect.width;

      if (relativeX < TAP_LEFT_RATIO) {
        onTapLeft();
      } else {
        onTapRight();
      }
    },
    [enabled, onTapLeft, onTapRight]
  );

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], cancel, last }) => {
        if (!enabled || !last) return;

        const absX = Math.abs(mx);
        const absY = Math.abs(my);

        // Determine if this is primarily horizontal or vertical
        if (absY > absX) {
          // Vertical swipe
          if (absY > SWIPE_THRESHOLD || vy > VELOCITY_THRESHOLD) {
            if (dy < 0) {
              onSwipeUp();
            } else {
              onSwipeDown();
            }
          }
        } else {
          // Horizontal swipe
          if (absX > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) {
            if (dx < 0) {
              onSwipeLeft();
            } else {
              onSwipeRight();
            }
          }
        }
      },
      onClick: handleTap,
    },
    {
      drag: {
        axis: undefined,
        threshold: 10,
        filterTaps: true,
      },
    }
  );

  return bind;
}

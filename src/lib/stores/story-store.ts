import { create } from "zustand";
import type { LifecycleStage, ProjectStory, ProjectStorySummary } from "@/types/stories";

interface StoryState {
  // Project summaries for bubbles
  projectSummaries: ProjectStorySummary[];
  setProjectSummaries: (summaries: ProjectStorySummary[]) => void;

  // Cached stories
  stories: Map<string, ProjectStory>;
  setStory: (projectId: string, story: ProjectStory) => void;
  getStory: (projectId: string) => ProjectStory | undefined;

  // Navigation
  currentProjectId: string | null;
  currentStageIndex: number;
  currentSubstepIndex: number;
  direction: "up" | "down" | "left" | "right" | null;

  setCurrentProject: (projectId: string) => void;
  setCurrentStageIndex: (index: number) => void;
  setCurrentSubstepIndex: (index: number) => void;
  setDirection: (dir: "up" | "down" | "left" | "right" | null) => void;

  // Stage navigation
  nextStage: () => void;
  prevStage: () => void;
  nextSubstep: () => boolean; // returns false if at end of stage
  prevSubstep: () => boolean; // returns false if at start of stage

  // Project navigation
  nextProject: () => void;
  prevProject: () => void;

  // Desktop expanded stage
  expandedStageSlug: LifecycleStage | null;
  setExpandedStageSlug: (slug: LifecycleStage | null) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  projectSummaries: [],
  setProjectSummaries: (summaries) => set({ projectSummaries: summaries }),

  stories: new Map(),
  setStory: (projectId, story) =>
    set((state) => {
      const newStories = new Map(state.stories);
      newStories.set(projectId, story);
      return { stories: newStories };
    }),
  getStory: (projectId) => get().stories.get(projectId),

  currentProjectId: null,
  currentStageIndex: 0,
  currentSubstepIndex: 0,
  direction: null,

  setCurrentProject: (projectId) =>
    set({ currentProjectId: projectId, currentStageIndex: 0, currentSubstepIndex: 0 }),
  setCurrentStageIndex: (index) => set({ currentStageIndex: index, currentSubstepIndex: 0 }),
  setCurrentSubstepIndex: (index) => set({ currentSubstepIndex: index }),
  setDirection: (dir) => set({ direction: dir }),

  nextStage: () => {
    const { currentProjectId, currentStageIndex, stories } = get();
    if (!currentProjectId) return;
    const story = stories.get(currentProjectId);
    if (!story) return;
    if (currentStageIndex < story.stages.length - 1) {
      set({
        currentStageIndex: currentStageIndex + 1,
        currentSubstepIndex: 0,
        direction: "up",
      });
    }
  },

  prevStage: () => {
    const { currentStageIndex } = get();
    if (currentStageIndex > 0) {
      set({
        currentStageIndex: currentStageIndex - 1,
        currentSubstepIndex: 0,
        direction: "down",
      });
    }
  },

  nextSubstep: () => {
    const { currentProjectId, currentStageIndex, currentSubstepIndex, stories } = get();
    if (!currentProjectId) return false;
    const story = stories.get(currentProjectId);
    if (!story) return false;
    const stage = story.stages[currentStageIndex];
    if (!stage) return false;
    if (currentSubstepIndex < stage.substeps.length - 1) {
      set({ currentSubstepIndex: currentSubstepIndex + 1 });
      return true;
    }
    return false; // At end of stage
  },

  prevSubstep: () => {
    const { currentSubstepIndex } = get();
    if (currentSubstepIndex > 0) {
      set({ currentSubstepIndex: currentSubstepIndex - 1 });
      return true;
    }
    return false; // At start of stage
  },

  nextProject: () => {
    const { currentProjectId, projectSummaries } = get();
    if (!currentProjectId || projectSummaries.length === 0) return;
    const currentIndex = projectSummaries.findIndex((p) => p.projectId === currentProjectId);
    if (currentIndex < projectSummaries.length - 1) {
      set({
        currentProjectId: projectSummaries[currentIndex + 1].projectId,
        currentStageIndex: 0,
        currentSubstepIndex: 0,
        direction: "left",
      });
    }
  },

  prevProject: () => {
    const { currentProjectId, projectSummaries } = get();
    if (!currentProjectId || projectSummaries.length === 0) return;
    const currentIndex = projectSummaries.findIndex((p) => p.projectId === currentProjectId);
    if (currentIndex > 0) {
      set({
        currentProjectId: projectSummaries[currentIndex - 1].projectId,
        currentStageIndex: 0,
        currentSubstepIndex: 0,
        direction: "right",
      });
    }
  },

  expandedStageSlug: null,
  setExpandedStageSlug: (slug) => {
    if (slug) {
      // Also sync the currentStageIndex so substep navigation works
      const { currentProjectId, stories } = get();
      if (currentProjectId) {
        const story = stories.get(currentProjectId);
        if (story) {
          const idx = story.stages.findIndex((s) => s.slug === slug);
          if (idx >= 0) {
            set({ expandedStageSlug: slug, currentStageIndex: idx, currentSubstepIndex: 0 });
            return;
          }
        }
      }
    }
    set({ expandedStageSlug: slug, currentSubstepIndex: 0 });
  },

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

// ===========================================
// Project Stories — Type Definitions
// ===========================================

export type LifecycleStage =
  | 'bid_invite'
  | 'estimate'
  | 'po_contract'
  | 'pre_planning'
  | 'crew'
  | 'materials'
  | 'equipment'
  | 'daily_logs'
  | 'safety_docs'
  | 'completion'
  | 'invoicing'
  | 'payment';

export type StoryRole = 'client' | 'team' | 'manager';

// -------------------------------------------
// Substep — a single "frame" within a stage
// -------------------------------------------
export type SubstepType = 'metric' | 'photo' | 'document' | 'list' | 'chart' | 'text' | 'photo_grid';

export interface StorySubstep {
  id: string;
  type: SubstepType;
  title: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// -------------------------------------------
// Stage — one lifecycle phase of a project
// -------------------------------------------
export interface StoryStage {
  slug: LifecycleStage;
  label: string;
  icon: string;
  color: string;
  hasData: boolean;
  substeps: StorySubstep[];
  completedAt: Date | null;
  isCurrent: boolean;
}

// -------------------------------------------
// Project Story — the full story for a project
// -------------------------------------------
export interface ProjectStory {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  clientCode: string;
  status: 'active' | 'closed';
  thumbnailUrl: string | null;
  stages: StoryStage[];
  currentStageIndex: number;
  lastUpdated: Date;
}

// -------------------------------------------
// Project Summary — lightweight, for bubbles
// -------------------------------------------
export interface ProjectStorySummary {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  clientCode: string;
  status: 'active' | 'closed';
  thumbnailUrl: string | null;
  lastUpdated: Date;
  stageCount: number;
  currentStageName: string;
}

// -------------------------------------------
// API Responses
// -------------------------------------------
export interface StorySummariesResponse {
  projects: ProjectStorySummary[];
}

export interface StoryDetailResponse {
  story: ProjectStory;
}

// -------------------------------------------
// Navigation State
// -------------------------------------------
export interface StoryNavigationState {
  currentProjectId: string | null;
  currentStageIndex: number;
  currentSubstepIndex: number;
  projectIds: string[];
  direction: 'up' | 'down' | 'left' | 'right' | null;
}

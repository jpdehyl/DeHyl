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

// ===========================================
// Smart Feed ("For You") Types
// ===========================================

export type FeedCardType =
  | 'overdue_invoice'
  | 'negative_profit'
  | 'bill_due_soon'
  | 'aging_receivable'
  | 'stalled_project'
  | 'missing_estimate'
  | 'unassigned_invoice'
  | 'match_suggestion'
  | 'daily_log'
  | 'new_photos'
  | 'cost_entry'
  | 'invoice_activity'
  | 'safety_checklist'
  | 'project_progress'
  | 'bid_update'
  | 'crew_change'
  | 'upcoming_bid'
  | 'opportunity'; // Future: scraped bid invites

export type FeedPriority = 'critical' | 'high' | 'medium' | 'info';

export interface FeedCard {
  id: string;
  type: FeedCardType;
  priority: FeedPriority;
  title: string;
  description: string;
  timestamp: string; // ISO string from API
  projectId?: string;
  projectCode?: string;
  clientName?: string;
  amount?: number;
  metadata: Record<string, unknown>;
  actionUrl: string;
  actionLabel: string;
}

export interface UpcomingProject {
  id: string;
  name: string;
  clientCode: string | null;
  clientName: string | null;
  dueDate: string | null;
  estimatedValue: number | null;
  status: string;
  location: string | null;
}

export interface SmartFeedResponse {
  cards: FeedCard[];
  generatedAt: string;
  upcomingBids: UpcomingProject[];
}

// -------------------------------------------
// Story Filter State
// -------------------------------------------
export interface StoryFilterState {
  search: string;
  status: 'all' | 'active' | 'closed';
  clientCode: string | null;
}

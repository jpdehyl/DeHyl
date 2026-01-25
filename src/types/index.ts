// ===========================================
// DeHyl Project Financial System
// Type Definitions
// ===========================================

// -------------------------------------------
// Project (from Google Drive)
// -------------------------------------------
export interface Project {
  id: string;
  driveId: string;
  code: string;
  clientCode: string;
  clientName: string;
  description: string;
  status: 'active' | 'closed';
  estimateAmount: number | null;
  estimateDriveId: string | null;
  hasEstimate: boolean;
  hasPBS: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithTotals extends Project {
  totals: {
    invoiced: number;
    paid: number;
    outstanding: number;
    costs: number;
    profit: number;
  };
}

// -------------------------------------------
// Invoice (from QuickBooks)
// -------------------------------------------
export interface Invoice {
  id: string;
  qbId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  balance: number;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  projectId: string | null;
  matchConfidence: 'high' | 'medium' | 'low' | null;
  memo: string | null;
  syncedAt: Date;
}

export interface InvoiceWithSuggestions extends Invoice {
  matchSuggestions: MatchSuggestion[];
}

// -------------------------------------------
// Bill (from QuickBooks)
// -------------------------------------------
export interface Bill {
  id: string;
  qbId: string;
  vendorName: string;
  amount: number;
  balance: number;
  billDate: Date;
  dueDate: Date;
  status: 'open' | 'paid' | 'overdue';
  projectId: string | null;
  memo: string | null;
  syncedAt: Date;
}

// -------------------------------------------
// Client Mapping
// -------------------------------------------
export interface ClientMapping {
  id: string;
  code: string;
  qbCustomerName: string;
  displayName: string;
  aliases: string[];
}

// -------------------------------------------
// Bid
// -------------------------------------------
export interface Bid {
  id: string;
  name: string;
  clientCode: string | null;
  clientName: string | null;
  description: string | null;
  submittedDate: Date | null;
  dueDate: Date | null;
  status: 'draft' | 'submitted' | 'won' | 'lost' | 'no-bid';
  estimatedValue: number | null;
  actualValue: number | null;
  driveFolderId: string | null;
  convertedProjectId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BidWithProject extends Bid {
  project?: Project;
}

// -------------------------------------------
// Estimate
// -------------------------------------------
export type EstimateCategory = 'labor' | 'materials' | 'equipment' | 'subcontractors' | 'permits' | 'other';
export type EstimateSource = 'manual' | 'imported';
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface EstimateLineItem {
  id: string;
  estimateId: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Estimate {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  totalAmount: number;
  source: EstimateSource;
  driveFileId: string | null;
  status: EstimateStatus;
  sentDate: Date | null;
  approvedDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstimateWithLineItems extends Estimate {
  lineItems: EstimateLineItem[];
}

export interface EstimateWithProject extends Estimate {
  project?: Project;
}

export interface EstimateCategoryTotals {
  labor: number;
  materials: number;
  equipment: number;
  subcontractors: number;
  permits: number;
  other: number;
}

// -------------------------------------------
// Dashboard
// -------------------------------------------
export interface DashboardKPIs {
  totalReceivables: number;
  totalPayables: number;
  netPosition: number;
  activeProjects: number;
  overdueInvoices: number;
  overdueAmount: number;
  billsDueThisWeek: number;
  billsDueAmount: number;
}

export type AlertType =
  | 'overdue_invoice'
  | 'bills_due_soon'
  | 'missing_estimate'
  | 'missing_pbs'
  | 'unassigned_invoices'
  | 'invoice_suggestions'
  | 'aging_receivables'
  | 'negative_profit';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  type: AlertType;
  count: number;
  total?: number;
  projects?: string[];
  invoices?: string[];
  severity?: AlertSeverity;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  alerts: Alert[];
  recentActivity: ActivityItem[];
  lastSyncedAt: Date | null;
}

export interface ActivityItem {
  type: 'payment_received' | 'invoice_sent' | 'bill_paid' | 'project_created';
  description: string;
  amount?: number;
  date: Date;
}

// -------------------------------------------
// Matching
// -------------------------------------------
export interface MatchSuggestion {
  projectId: string;
  projectCode: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// -------------------------------------------
// API Responses
// -------------------------------------------
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  lastSyncedAt?: Date;
}

export interface ProjectsResponse {
  projects: ProjectWithTotals[];
  lastSyncedAt: Date | null;
}

export interface ReceivablesResponse {
  invoices: InvoiceWithSuggestions[];
  totals: {
    outstanding: number;
    overdue: number;
    dueThisWeek: number;
  };
  lastSyncedAt: Date | null;
}

export interface PayablesResponse {
  bills: Bill[];
  totals: {
    outstanding: number;
    overdue: number;
    dueThisWeek: number;
  };
  lastSyncedAt: Date | null;
}

// -------------------------------------------
// Project Activities / Timeline
// -------------------------------------------
export type ActivityType = 'email' | 'invoice' | 'bill' | 'bid' | 'note' | 'status_change' | 'file';

export interface Activity {
  id: string;
  projectId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  activityDate: Date;
  metadata: Record<string, unknown>;
  sourceId?: string;
  sourceType?: string;
  // For emails
  emailFrom?: string;
  emailTo?: string;
  emailSubject?: string;
  emailSnippet?: string;
  emailThreadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineResponse {
  activities: Activity[];
  total: number;
  hasMore: boolean;
}

export interface AddActivityRequest {
  activityType: 'note' | 'status_change';
  title: string;
  description?: string;
  activityDate?: string; // Defaults to now
}

// -------------------------------------------
// Profitability
// -------------------------------------------
export interface ProjectProfitability {
  id: string;
  code: string;
  description: string;
  clientCode: string;
  clientName: string;
  status: string;
  estimateAmount: number | null;
  totalInvoiced: number;
  totalCollected: number;
  outstandingReceivables: number;
  totalCosts: number;
  grossProfit: number;
  profitMarginPct: number;
}

export interface ClientProfitability {
  clientCode: string;
  clientName: string;
  projectCount: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
}

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  avgProfitMargin: number;
  mostProfitableProject: string;
  leastProfitableProject: string;
}

export interface ProfitabilityResponse {
  projects: ProjectProfitability[];
  summary: ProfitabilitySummary;
  byClient: ClientProfitability[];
}

// -------------------------------------------
// OAuth / Connections
// -------------------------------------------
export interface ConnectionStatus {
  quickbooks: {
    connected: boolean;
    companyName?: string;
    lastSyncedAt?: Date;
  };
  googleDrive: {
    connected: boolean;
    email?: string;
    lastSyncedAt?: Date;
  };
}

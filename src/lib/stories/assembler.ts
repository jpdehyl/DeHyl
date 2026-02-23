import type { StoryStage, StorySubstep, ProjectStory } from "@/types/stories";
import { getStageConfig } from "./stage-config";
import { formatCurrency } from "@/lib/utils";

// -------------------------------------------
// Raw data types from Supabase queries
// -------------------------------------------
interface RawProject {
  id: string;
  code: string;
  client_code: string;
  client_name: string;
  description: string;
  status: string;
  estimate_amount: number | null;
  project_type: string | null;
  square_footage: number | null;
  location: string | null;
  final_cost: number | null;
  final_revenue: number | null;
  profit_margin: number | null;
  created_at: string;
  updated_at: string;
}

interface RawEstimate {
  id: string;
  name: string;
  total_amount: number;
  status: string;
  approved_date: string | null;
  created_at: string;
  estimate_line_items?: RawLineItem[];
}

interface RawLineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface RawCrewAssignment {
  id: string;
  role: string;
  start_date: string | null;
  is_active: boolean;
  crew_members: {
    id: string;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
    employment_type: string;
    company: string | null;
    hourly_rate: number | null;
  };
}

interface RawDailyLog {
  id: string;
  log_date: string;
  work_summary: string | null;
  weather: string | null;
  temperature_high: number | null;
  temperature_low: number | null;
  total_hours: number | null;
  notes: string | null;
  internal_notes: string | null;
  status: string;
  areas_worked: string[] | null;
  daily_log_crew?: { worker_name: string; hours_worked: number; role: string | null }[];
  daily_log_materials?: { item_name: string; quantity: number; unit: string | null }[];
  daily_log_equipment?: { equipment_name: string; hours_used: number | null }[];
}

interface RawPhoto {
  id: string;
  storage_url: string | null;
  thumbnail_url: string | null;
  filename: string;
  photo_date: string | null;
  category: string;
  notes: string | null;
  area: string | null;
  created_at: string;
}

interface RawInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  balance: number;
  issue_date: string;
  due_date: string;
  status: string;
  memo: string | null;
}

interface RawProjectCost {
  id: string;
  description: string;
  amount: number;
  cost_date: string;
  category: string;
  vendor: string | null;
}

export interface RawStoryData {
  project: RawProject;
  estimates: RawEstimate[];
  crewAssignments: RawCrewAssignment[];
  dailyLogs: RawDailyLog[];
  photos: RawPhoto[];
  invoices: RawInvoice[];
  costs: RawProjectCost[];
}

// -------------------------------------------
// Assembler
// -------------------------------------------

export function assembleProjectStory(raw: RawStoryData): ProjectStory {
  const stages: StoryStage[] = [];

  // Stage: Estimate
  const estimateStage = buildEstimateStage(raw.estimates);
  if (estimateStage) stages.push(estimateStage);

  // Stage: Crew
  const crewStage = buildCrewStage(raw.crewAssignments);
  if (crewStage) stages.push(crewStage);

  // Stage: Daily Logs
  const dailyLogsStage = buildDailyLogsStage(raw.dailyLogs);
  if (dailyLogsStage) stages.push(dailyLogsStage);

  // Stage: Completion (photos + final stats)
  const completionStage = buildCompletionStage(raw.photos, raw.project, raw.costs);
  if (completionStage) stages.push(completionStage);

  // Stage: Invoicing
  const invoicingStage = buildInvoicingStage(raw.invoices);
  if (invoicingStage) stages.push(invoicingStage);

  // Determine current stage
  const currentStageIndex = determineCurrentStage(stages);

  // Find thumbnail
  const thumbnailUrl = raw.photos.length > 0
    ? (raw.photos[0].thumbnail_url || raw.photos[0].storage_url)
    : null;

  return {
    projectId: raw.project.id,
    projectCode: raw.project.code,
    projectName: raw.project.description,
    clientName: raw.project.client_name,
    clientCode: raw.project.client_code,
    status: raw.project.status as "active" | "closed",
    thumbnailUrl,
    stages,
    currentStageIndex,
    lastUpdated: new Date(raw.project.updated_at),
  };
}

// -------------------------------------------
// Stage Builders
// -------------------------------------------

function buildEstimateStage(estimates: RawEstimate[]): StoryStage | null {
  if (estimates.length === 0) return null;

  const config = getStageConfig("estimate");
  const primary = estimates[0];
  const lineItems = primary.estimate_line_items || [];

  const substeps: StorySubstep[] = [
    {
      id: `est-summary-${primary.id}`,
      type: "metric",
      title: "Estimate Total",
      data: {
        totalAmount: primary.total_amount,
        status: primary.status,
        name: primary.name,
      },
      timestamp: new Date(primary.created_at),
    },
  ];

  if (lineItems.length > 0) {
    const categoryTotals: Record<string, number> = {};
    for (const item of lineItems) {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.total_price;
    }

    substeps.push({
      id: `est-breakdown-${primary.id}`,
      type: "chart",
      title: "Cost Breakdown",
      data: { categoryTotals, lineItemCount: lineItems.length },
      timestamp: new Date(primary.created_at),
    });
  }

  return {
    slug: "estimate",
    label: config.label,
    icon: config.icon,
    color: config.color,
    hasData: true,
    substeps,
    completedAt: primary.approved_date ? new Date(primary.approved_date) : null,
    isCurrent: primary.status === "sent" || primary.status === "draft",
  };
}

function buildCrewStage(assignments: RawCrewAssignment[]): StoryStage | null {
  if (assignments.length === 0) return null;

  const config = getStageConfig("crew");
  const activeAssignments = assignments.filter((a) => a.is_active);

  const roleGroups: Record<string, string[]> = {};
  for (const a of activeAssignments) {
    const role = a.crew_members.role || "laborer";
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(a.crew_members.name);
  }

  const substeps: StorySubstep[] = [
    {
      id: "crew-overview",
      type: "metric",
      title: "Team Overview",
      data: {
        totalCrew: activeAssignments.length,
        roleGroups,
        members: activeAssignments.map((a) => ({
          id: a.crew_members.id,
          name: a.crew_members.name,
          role: a.crew_members.role,
          company: a.crew_members.company,
          employmentType: a.crew_members.employment_type,
        })),
      },
      timestamp: new Date(),
    },
  ];

  return {
    slug: "crew",
    label: config.label,
    icon: config.icon,
    color: config.color,
    hasData: true,
    substeps,
    completedAt: null,
    isCurrent: activeAssignments.length > 0,
  };
}

function buildDailyLogsStage(dailyLogs: RawDailyLog[]): StoryStage | null {
  if (dailyLogs.length === 0) return null;

  const config = getStageConfig("daily_logs");

  // Each daily log becomes a substep — tap through days
  const substeps: StorySubstep[] = dailyLogs.slice(0, 30).map((log) => ({
    id: `log-${log.id}`,
    type: "text",
    title: new Date(log.log_date).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    data: {
      date: log.log_date,
      workSummary: log.work_summary,
      weather: log.weather,
      temperatureHigh: log.temperature_high,
      temperatureLow: log.temperature_low,
      totalHours: log.total_hours,
      notes: log.notes,
      areasWorked: log.areas_worked,
      status: log.status,
      crewCount: log.daily_log_crew?.length || 0,
      crew: log.daily_log_crew?.map((c) => ({
        name: c.worker_name,
        hours: c.hours_worked,
        role: c.role,
      })),
      materials: log.daily_log_materials?.map((m) => ({
        name: m.item_name,
        quantity: m.quantity,
        unit: m.unit,
      })),
      equipment: log.daily_log_equipment?.map((e) => ({
        name: e.equipment_name,
        hours: e.hours_used,
      })),
    },
    timestamp: new Date(log.log_date),
  }));

  return {
    slug: "daily_logs",
    label: config.label,
    icon: config.icon,
    color: config.color,
    hasData: true,
    substeps,
    completedAt: null,
    isCurrent: true,
  };
}

function buildCompletionStage(
  photos: RawPhoto[],
  project: RawProject,
  costs: RawProjectCost[]
): StoryStage | null {
  if (photos.length === 0 && !project.final_cost) return null;

  const config = getStageConfig("completion");
  const substeps: StorySubstep[] = [];

  // Before/after photos
  const beforePhotos = photos.filter((p) => p.category === "before");
  const afterPhotos = photos.filter((p) => p.category === "after");
  const duringPhotos = photos.filter((p) => p.category === "during");

  if (beforePhotos.length > 0 || afterPhotos.length > 0) {
    substeps.push({
      id: "completion-photos",
      type: "photo_grid",
      title: "Project Photos",
      data: {
        before: beforePhotos.slice(0, 4).map((p) => ({
          url: p.storage_url || p.thumbnail_url,
          thumbnail: p.thumbnail_url,
          caption: p.notes,
        })),
        after: afterPhotos.slice(0, 4).map((p) => ({
          url: p.storage_url || p.thumbnail_url,
          thumbnail: p.thumbnail_url,
          caption: p.notes,
        })),
        during: duringPhotos.slice(0, 4).map((p) => ({
          url: p.storage_url || p.thumbnail_url,
          thumbnail: p.thumbnail_url,
          caption: p.notes,
        })),
        totalPhotos: photos.length,
      },
      timestamp: new Date(photos[0]?.created_at || project.updated_at),
    });
  } else if (photos.length > 0) {
    substeps.push({
      id: "completion-all-photos",
      type: "photo_grid",
      title: "Project Photos",
      data: {
        all: photos.slice(0, 9).map((p) => ({
          url: p.storage_url || p.thumbnail_url,
          thumbnail: p.thumbnail_url,
          caption: p.notes,
          category: p.category,
        })),
        totalPhotos: photos.length,
      },
      timestamp: new Date(photos[0].created_at),
    });
  }

  // Final stats
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
  substeps.push({
    id: "completion-stats",
    type: "metric",
    title: "Project Summary",
    data: {
      status: project.status,
      estimateAmount: project.estimate_amount,
      finalCost: project.final_cost || totalCosts,
      finalRevenue: project.final_revenue,
      profitMargin: project.profit_margin,
      totalPhotos: photos.length,
    },
    timestamp: new Date(project.updated_at),
  });

  return {
    slug: "completion",
    label: config.label,
    icon: config.icon,
    color: config.color,
    hasData: true,
    substeps,
    completedAt: project.status === "closed" ? new Date(project.updated_at) : null,
    isCurrent: project.status === "active",
  };
}

function buildInvoicingStage(invoices: RawInvoice[]): StoryStage | null {
  if (invoices.length === 0) return null;

  const config = getStageConfig("invoicing");

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount - inv.balance), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  const substeps: StorySubstep[] = [
    {
      id: "invoicing-summary",
      type: "metric",
      title: "Invoice Summary",
      data: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        invoiceCount: invoices.length,
        overdueCount,
        paidPercentage: totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0,
      },
      timestamp: new Date(invoices[0].issue_date),
    },
  ];

  // Individual invoices as substeps
  if (invoices.length <= 10) {
    for (const inv of invoices) {
      substeps.push({
        id: `inv-${inv.id}`,
        type: "metric",
        title: `Invoice #${inv.invoice_number}`,
        data: {
          invoiceNumber: inv.invoice_number,
          clientName: inv.client_name,
          amount: inv.amount,
          balance: inv.balance,
          status: inv.status,
          issueDate: inv.issue_date,
          dueDate: inv.due_date,
        },
        timestamp: new Date(inv.issue_date),
      });
    }
  }

  const allPaid = invoices.every((inv) => inv.status === "paid");

  return {
    slug: "invoicing",
    label: config.label,
    icon: config.icon,
    color: config.color,
    hasData: true,
    substeps,
    completedAt: allPaid ? new Date(invoices[invoices.length - 1].due_date) : null,
    isCurrent: !allPaid,
  };
}

// -------------------------------------------
// Determine Current Stage
// -------------------------------------------

function determineCurrentStage(stages: StoryStage[]): number {
  // Find the last stage marked as current
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].isCurrent) return i;
  }
  // Fall back to last stage with data
  return Math.max(0, stages.length - 1);
}

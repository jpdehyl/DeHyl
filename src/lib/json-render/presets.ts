import type { Dashboard } from "./renderer";

export type PresetKey = "executive" | "collections" | "project-manager";

export interface DashboardPreset {
  key: PresetKey;
  name: string;
  description: string;
  layout: "full" | "compact" | "kpi-only";
  emphasis: string[];
}

/**
 * Dashboard presets for quick switching between views
 */
export const dashboardPresets: Record<PresetKey, DashboardPreset> = {
  executive: {
    key: "executive",
    name: "Executive Summary",
    description: "KPIs + trend chart only",
    layout: "kpi-only",
    emphasis: ["kpis", "trends"],
  },
  collections: {
    key: "collections",
    name: "Collections Focus",
    description: "Receivables heavy, aging breakdown",
    layout: "full",
    emphasis: ["receivables", "aging", "overdue"],
  },
  "project-manager": {
    key: "project-manager",
    name: "Project Manager",
    description: "Projects + active work emphasis",
    layout: "full",
    emphasis: ["projects", "activity", "estimates"],
  },
};

/**
 * Generate Executive Summary dashboard JSON
 */
export function createExecutiveDashboard(kpis: {
  totalReceivables: number;
  totalPayables: number;
  netPosition: number;
  activeProjects: number;
  overdueInvoices: number;
  billsDueThisWeek: number;
}): Dashboard {
  return {
    version: 1,
    title: "Executive Summary",
    layout: [
      {
        component: "grid",
        props: { columns: 4, gap: "md" },
        children: [
          {
            component: "kpi-card",
            props: {
              title: "Total Receivables",
              value: kpis.totalReceivables,
              format: "currency",
              icon: "trending-up",
              variant: "success",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Total Payables",
              value: kpis.totalPayables,
              format: "currency",
              icon: "trending-down",
              variant: "danger",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Net Position",
              value: kpis.netPosition,
              format: "currency",
              icon: "dollar-sign",
              variant: kpis.netPosition >= 0 ? "success" : "danger",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Active Projects",
              value: kpis.activeProjects,
              format: "number",
              icon: "folder",
              variant: "default",
            },
          },
        ],
      },
    ],
  };
}

/**
 * Generate Collections Focus dashboard JSON
 */
export function createCollectionsDashboard(data: {
  totalReceivables: number;
  overdueAmount: number;
  overdueCount: number;
  dueSoonAmount: number;
  dueSoonCount: number;
  aging: { current: number; days31_60: number; days61_90: number; over90: number };
  topInvoices: Array<{
    number: string;
    client: string;
    amount: number;
    dueDate: string;
    status: string;
  }>;
}): Dashboard {
  return {
    version: 1,
    title: "Collections Focus",
    layout: [
      {
        component: "grid",
        props: { columns: 3, gap: "md" },
        children: [
          {
            component: "kpi-card",
            props: {
              title: "Total Receivables",
              value: data.totalReceivables,
              format: "currency",
              icon: "dollar-sign",
              variant: "default",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Overdue",
              value: data.overdueAmount,
              format: "currency",
              icon: "alert-triangle",
              variant: data.overdueAmount > 0 ? "danger" : "success",
              subtitle: `${data.overdueCount} invoices`,
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Due This Week",
              value: data.dueSoonAmount,
              format: "currency",
              icon: "clock",
              variant: data.dueSoonAmount > 0 ? "warning" : "default",
              subtitle: `${data.dueSoonCount} invoices`,
            },
          },
        ],
      },
      {
        component: "grid",
        props: { columns: 2, gap: "md" },
        children: [
          {
            component: "bar-chart",
            props: {
              title: "Aging Analysis",
              description: "Outstanding by age",
              xKey: "range",
              bars: [{ dataKey: "amount", label: "Amount", color: "primary" }],
              data: [
                { range: "0-30", amount: data.aging.current },
                { range: "31-60", amount: data.aging.days31_60 },
                { range: "61-90", amount: data.aging.days61_90 },
                { range: "90+", amount: data.aging.over90 },
              ],
            },
          },
          {
            component: "data-table",
            props: {
              title: "Priority Collections",
              columns: [
                { key: "number", label: "Invoice #" },
                { key: "client", label: "Client" },
                { key: "amount", label: "Amount", format: "currency" },
                { key: "status", label: "Status", format: "badge" },
              ],
              rows: data.topInvoices,
              emptyMessage: "No overdue invoices! 🎉",
            },
          },
        ],
      },
      ...(data.overdueCount > 0
        ? [
            {
              component: "card" as const,
              props: { title: "Action Items" },
              children: [
                {
                  component: "alert-item" as const,
                  props: {
                    type: "overdue_invoice" as const,
                    count: data.overdueCount,
                    total: data.overdueAmount,
                    severity: "critical" as const,
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
}

/**
 * Generate Project Manager dashboard JSON
 */
export function createProjectManagerDashboard(data: {
  activeProjects: number;
  totalEstimated: number;
  totalInvoiced: number;
  missingEstimates: number;
  recentProjects: Array<{
    code: string;
    client: string;
    status: string;
    invoiced: number;
  }>;
}): Dashboard {
  return {
    version: 1,
    title: "Project Manager",
    layout: [
      {
        component: "grid",
        props: { columns: 4, gap: "md" },
        children: [
          {
            component: "kpi-card",
            props: {
              title: "Active Projects",
              value: data.activeProjects,
              format: "number",
              icon: "folder",
              variant: "success",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Total Estimated",
              value: data.totalEstimated,
              format: "currency",
              icon: "file-text",
              variant: "default",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Total Invoiced",
              value: data.totalInvoiced,
              format: "currency",
              icon: "dollar-sign",
              variant: "success",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Missing Estimates",
              value: data.missingEstimates,
              format: "number",
              icon: "alert-triangle",
              variant: data.missingEstimates > 0 ? "warning" : "success",
            },
          },
        ],
      },
      {
        component: "data-table",
        props: {
          title: "Active Projects",
          columns: [
            { key: "code", label: "Code" },
            { key: "client", label: "Client" },
            { key: "invoiced", label: "Invoiced", format: "currency" },
            { key: "status", label: "Status", format: "badge" },
          ],
          rows: data.recentProjects,
          emptyMessage: "No active projects",
        },
      },
      {
        component: "quick-actions",
        props: {
          actions: [
            { id: "new-project", label: "New Project", href: "/projects/new" },
            { id: "sync-drive", label: "Sync Drive", href: "/settings" },
            { id: "view-bids", label: "View Bids", href: "/bids" },
            { id: "estimates", label: "Estimates", href: "/projects?filter=missing-estimate" },
          ],
        },
      },
    ],
  };
}

/**
 * Generate Mobile-Optimized dashboard JSON
 * Prioritizes: Total Receivables, Overdue, Bills due, Quick actions
 * Single column layout with larger touch targets
 */
export function createMobileDashboard(data: {
  totalReceivables: number;
  overdueAmount: number;
  overdueCount: number;
  billsDueAmount: number;
  billsDueCount: number;
  activeProjects: number;
}): Dashboard {
  return {
    version: 1,
    title: "Quick View",
    layout: [
      {
        component: "stack",
        props: { direction: "vertical", gap: "md" },
        children: [
          {
            component: "kpi-card",
            props: {
              title: "Total Receivables",
              value: data.totalReceivables,
              format: "currency",
              icon: "dollar-sign",
              variant: "success",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Overdue",
              value: data.overdueAmount,
              format: "currency",
              icon: "alert-triangle",
              variant: data.overdueAmount > 0 ? "danger" : "success",
              subtitle: `${data.overdueCount} invoices need attention`,
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Bills Due This Week",
              value: data.billsDueAmount,
              format: "currency",
              icon: "clock",
              variant: data.billsDueAmount > 0 ? "warning" : "default",
              subtitle: `${data.billsDueCount} bills`,
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Active Projects",
              value: data.activeProjects,
              format: "number",
              icon: "folder",
              variant: "default",
            },
          },
        ],
      },
      {
        component: "quick-actions",
        props: {
          actions: [
            { id: "view-overdue", label: "View Overdue", href: "/receivables?filter=overdue" },
            { id: "view-projects", label: "Projects", href: "/projects" },
            { id: "sync", label: "Sync Data", href: "/settings" },
            { id: "view-bills", label: "Bills Due", href: "/payables?filter=due-soon" },
          ],
        },
      },
    ],
  };
}

/**
 * Get preset key from localStorage
 */
export function getStoredPreset(): PresetKey {
  if (typeof window === "undefined") return "executive";
  const stored = localStorage.getItem("dashboard-preset");
  if (stored && stored in dashboardPresets) {
    return stored as PresetKey;
  }
  return "executive";
}

/**
 * Save preset key to localStorage
 */
export function setStoredPreset(preset: PresetKey): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dashboard-preset", preset);
}

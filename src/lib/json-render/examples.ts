import type { Dashboard } from "./renderer";

/**
 * Example dashboard demonstrating all component types
 */
export const exampleDashboard: Dashboard = {
  version: 1,
  title: "DeHyl Financial Overview",
  layout: [
    {
      component: "grid",
      props: { columns: 4, gap: "md" },
      children: [
        {
          component: "kpi-card",
          props: {
            title: "Total Receivables",
            value: 125750,
            format: "currency",
            icon: "dollar-sign",
            variant: "default",
            trend: { value: 12, isPositive: true },
          },
        },
        {
          component: "kpi-card",
          props: {
            title: "Total Payables",
            value: 45200,
            format: "currency",
            icon: "credit-card",
            variant: "warning",
          },
        },
        {
          component: "kpi-card",
          props: {
            title: "Overdue",
            value: 28500,
            format: "currency",
            icon: "alert-triangle",
            variant: "danger",
            subtitle: "3 invoices",
          },
        },
        {
          component: "kpi-card",
          props: {
            title: "Active Projects",
            value: 8,
            format: "number",
            icon: "folder",
            variant: "success",
          },
        },
      ],
    },
    {
      component: "grid",
      props: { columns: 2, gap: "md" },
      children: [
        {
          component: "line-chart",
          props: {
            title: "Revenue Trend",
            description: "Monthly invoiced vs paid",
            xKey: "month",
            lines: [
              { dataKey: "invoiced", label: "Invoiced", color: "primary" },
              { dataKey: "paid", label: "Paid", color: "success" },
            ],
            data: [
              { month: "Sep", invoiced: 42000, paid: 35000 },
              { month: "Oct", invoiced: 48000, paid: 40000 },
              { month: "Nov", invoiced: 52000, paid: 45000 },
              { month: "Dec", invoiced: 38000, paid: 48000 },
              { month: "Jan", invoiced: 55000, paid: 42000 },
            ],
          },
        },
        {
          component: "card",
          props: { title: "Alerts", description: "Items requiring attention" },
          children: [
            {
              component: "stack",
              props: { direction: "vertical", gap: "sm" },
              children: [
                {
                  component: "alert-item",
                  props: {
                    type: "overdue_invoice",
                    count: 3,
                    total: 28500,
                    severity: "critical",
                  },
                },
                {
                  component: "alert-item",
                  props: {
                    type: "bills_due_soon",
                    count: 2,
                    total: 12400,
                    severity: "warning",
                  },
                },
                {
                  component: "alert-item",
                  props: {
                    type: "missing_estimate",
                    count: 4,
                    severity: "info",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      component: "data-table",
      props: {
        title: "Recent Invoices",
        columns: [
          { key: "number", label: "Invoice #" },
          { key: "client", label: "Client" },
          { key: "amount", label: "Amount", format: "currency" },
          { key: "status", label: "Status", format: "badge" },
          { key: "dueDate", label: "Due Date", format: "date" },
        ],
        rows: [
          { number: "DC0361", client: "Certified Demolition", amount: 12500, status: "Sent", dueDate: "2026-02-01" },
          { number: "DC0360", client: "ADR Construction", amount: 8750, status: "Overdue", dueDate: "2026-01-10" },
          { number: "DC0359", client: "Russell & Sons", amount: 15200, status: "Paid", dueDate: "2026-01-05" },
        ],
      },
    },
    {
      component: "quick-actions",
      props: {
        actions: [
          { id: "new-invoice", label: "New Invoice", href: "/receivables/new" },
          { id: "sync-qb", label: "Sync QuickBooks", href: "/settings" },
          { id: "view-projects", label: "View Projects", href: "/projects" },
          { id: "run-reports", label: "Run Reports", href: "/reports" },
        ],
      },
    },
  ],
};

/**
 * Factory function to create a KPI dashboard from real data
 */
export function createKpiDashboard(data: {
  totalReceivables: number;
  totalPayables: number;
  overdueAmount: number;
  overdueCount: number;
  activeProjects: number;
  netPosition: number;
  alerts?: Array<{ type: string; count: number; total?: number; severity?: string }>;
  revenueData?: Array<{ month: string; invoiced: number; paid: number }>;
}): Dashboard {
  return {
    version: 1,
    layout: [
      {
        component: "grid",
        props: { columns: 4, gap: "md" },
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
              title: "Total Payables",
              value: data.totalPayables,
              format: "currency",
              icon: "credit-card",
              variant: "warning",
            },
          },
          {
            component: "kpi-card",
            props: {
              title: "Overdue",
              value: data.overdueAmount,
              format: "currency",
              icon: "alert-triangle",
              variant: data.overdueAmount > 0 ? "danger" : "default",
              subtitle: `${data.overdueCount} invoice${data.overdueCount !== 1 ? "s" : ""}`,
            },
          },
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
        ],
      },
      ...(data.revenueData ? [
        {
          component: "line-chart" as const,
          props: {
            title: "Revenue Trend",
            description: "Monthly invoiced vs paid",
            xKey: "month",
            lines: [
              { dataKey: "invoiced", label: "Invoiced", color: "primary" as const },
              { dataKey: "paid", label: "Paid", color: "success" as const },
            ],
            data: data.revenueData,
          },
        },
      ] : []),
      ...(data.alerts && data.alerts.length > 0 ? [
        {
          component: "card" as const,
          props: { title: "Alerts", description: "Items requiring attention" },
          children: [
            {
              component: "stack" as const,
              props: { direction: "vertical" as const, gap: "sm" as const },
              children: data.alerts.map(alert => ({
                component: "alert-item" as const,
                props: {
                  type: alert.type as "overdue_invoice" | "bills_due_soon" | "missing_estimate" | "missing_pbs" | "unassigned_invoices" | "invoice_suggestions" | "aging_receivables" | "negative_profit",
                  count: alert.count,
                  total: alert.total,
                  severity: (alert.severity || "info") as "critical" | "warning" | "info",
                },
              })),
            },
          ],
        },
      ] : []),
    ],
  };
}

/**
 * System prompt for AI to generate dashboard JSON
 */
export const dashboardGenerationPrompt = `
You are a dashboard generator for DeHyl Financials, a construction company's financial dashboard.

Generate a JSON dashboard using these components:
- kpi-card: Key metrics (title, value, format, variant, icon)
- stat-card: Simple stats (label, value, description)
- alert-item: Alerts (type, count, total, severity)
- data-table: Tables (title, columns, rows)
- line-chart: Trends (title, xKey, lines, data)
- bar-chart: Comparisons (title, xKey, bars, data)
- progress-card: Goals (title, current, target)
- grid: Layout grid (columns 1-4, children)
- stack: Flex layout (direction, children)
- card: Container (title, description, children)

Output format:
{
  "version": 1,
  "title": "Dashboard Title",
  "layout": [/* components */]
}

Variants: default, success, warning, danger
Icons: dollar-sign, credit-card, trending-up, trending-down, folder, file-text, alert-triangle, check-circle, clock, users
Alert types: overdue_invoice, bills_due_soon, missing_estimate, unassigned_invoices, negative_profit
`;

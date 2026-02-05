import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDaysOverdue, getDaysUntilDue } from "@/lib/utils";
import type { Dashboard } from "@/lib/json-render/renderer";

type LayoutType = "full" | "compact" | "kpi-only";

/**
 * GET /api/dashboard/json
 * Returns dashboard data in json-render Dashboard JSON format
 * 
 * Query params:
 * - layout: "full" | "compact" | "kpi-only" (default: "full")
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const layout = (searchParams.get("layout") || "full") as LayoutType;

  const supabase = await createClient();

  // Fetch open invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, amount, balance, due_date, status, project_id")
    .gt("balance", 0);

  if (invoicesError) {
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: invoicesError.message },
      { status: 500 }
    );
  }

  // Fetch open bills
  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("id, vendor_name, amount, balance, due_date, status, project_id")
    .gt("balance", 0);

  if (billsError) {
    return NextResponse.json(
      { error: "Failed to fetch bills", details: billsError.message },
      { status: 500 }
    );
  }

  // Fetch active projects
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, code, estimate_amount, has_pbs")
    .eq("status", "active");

  if (projectsError) {
    return NextResponse.json(
      { error: "Failed to fetch projects", details: projectsError.message },
      { status: 500 }
    );
  }

  // Calculate KPIs
  const totalReceivables = (invoices || []).reduce((sum, inv) => sum + Number(inv.balance), 0);
  const totalPayables = (bills || []).reduce((sum, bill) => sum + Number(bill.balance), 0);
  const netPosition = totalReceivables - totalPayables;
  const activeProjects = projects?.length || 0;

  // Count overdue invoices
  const overdueInvoices = (invoices || []).filter((inv) => {
    const daysOverdue = getDaysOverdue(inv.due_date);
    return daysOverdue > 0;
  });
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

  // Count bills due this week
  const billsDueSoon = (bills || []).filter((bill) => {
    const daysUntil = getDaysUntilDue(bill.due_date);
    return daysUntil >= 0 && daysUntil <= 7;
  });
  const billsDueAmount = billsDueSoon.reduce((sum, bill) => sum + Number(bill.balance), 0);

  // Projects missing estimates
  const projectsMissingEstimate = (projects || []).filter((p) => !p.estimate_amount);

  // Build KPI components
  const kpiComponents = [
    {
      component: "kpi-card" as const,
      props: {
        title: "Total Receivables",
        value: totalReceivables,
        format: "currency" as const,
        icon: "trending-up",
        variant: "success" as const,
        subtitle: `${overdueInvoices.length} overdue`,
      },
    },
    {
      component: "kpi-card" as const,
      props: {
        title: "Total Payables",
        value: totalPayables,
        format: "currency" as const,
        icon: "trending-down",
        variant: "danger" as const,
        subtitle: `${billsDueSoon.length} due this week`,
      },
    },
    {
      component: "kpi-card" as const,
      props: {
        title: "Net Position",
        value: netPosition,
        format: "currency" as const,
        icon: "dollar-sign",
        variant: (netPosition >= 0 ? "success" : "danger") as "success" | "danger",
      },
    },
    {
      component: "kpi-card" as const,
      props: {
        title: "Active Projects",
        value: activeProjects,
        format: "number" as const,
        icon: "folder",
        variant: "default" as const,
      },
    },
  ];

  // Build alerts components
  const alertComponents: Array<{
    component: "alert-item";
    props: {
      type: "overdue_invoice" | "bills_due_soon" | "missing_estimate" | "missing_pbs" | "unassigned_invoices" | "invoice_suggestions" | "aging_receivables" | "negative_profit";
      count: number;
      total?: number;
      severity: "critical" | "warning" | "info";
    };
  }> = [];

  if (overdueInvoices.length > 0) {
    alertComponents.push({
      component: "alert-item",
      props: {
        type: "overdue_invoice",
        count: overdueInvoices.length,
        total: overdueAmount,
        severity: "critical",
      },
    });
  }

  if (billsDueSoon.length > 0) {
    alertComponents.push({
      component: "alert-item",
      props: {
        type: "bills_due_soon",
        count: billsDueSoon.length,
        total: billsDueAmount,
        severity: "warning",
      },
    });
  }

  if (projectsMissingEstimate.length > 0) {
    alertComponents.push({
      component: "alert-item",
      props: {
        type: "missing_estimate",
        count: projectsMissingEstimate.length,
        severity: "info",
      },
    });
  }

  // Build recent invoices table data
  const recentInvoices = (invoices || [])
    .sort((a, b) => new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime())
    .slice(0, 5)
    .map((inv) => ({
      number: inv.invoice_number || "-",
      client: inv.client_name,
      amount: Number(inv.balance),
      status: getDaysOverdue(inv.due_date) > 0 ? "Overdue" : "Open",
      dueDate: inv.due_date,
    }));

  // Build dashboard based on layout type
  let dashboard: Dashboard;

  if (layout === "kpi-only") {
    dashboard = {
      version: 1,
      title: "DeHyl Financial Overview",
      layout: [
        {
          component: "grid",
          props: { columns: 4, gap: "md" },
          children: kpiComponents,
        },
      ],
    };
  } else if (layout === "compact") {
    dashboard = {
      version: 1,
      title: "DeHyl Financial Overview",
      layout: [
        {
          component: "grid",
          props: { columns: 4, gap: "md" },
          children: kpiComponents,
        },
        ...(alertComponents.length > 0
          ? [
              {
                component: "card" as const,
                props: { title: "Alerts", description: "Items requiring attention" },
                children: [
                  {
                    component: "stack" as const,
                    props: { direction: "vertical" as const, gap: "sm" as const },
                    children: alertComponents,
                  },
                ],
              },
            ]
          : []),
      ],
    };
  } else {
    // full layout
    dashboard = {
      version: 1,
      title: "DeHyl Financial Overview",
      layout: [
        {
          component: "grid",
          props: { columns: 4, gap: "md" },
          children: kpiComponents,
        },
        {
          component: "grid",
          props: { columns: 2, gap: "md" },
          children: [
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
                rows: recentInvoices,
                emptyMessage: "No open invoices",
              },
            },
            ...(alertComponents.length > 0
              ? [
                  {
                    component: "card" as const,
                    props: { title: "Alerts", description: "Items requiring attention" },
                    children: [
                      {
                        component: "stack" as const,
                        props: { direction: "vertical" as const, gap: "sm" as const },
                        children: alertComponents,
                      },
                    ],
                  },
                ]
              : []),
          ],
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
  }

  return NextResponse.json(dashboard);
}

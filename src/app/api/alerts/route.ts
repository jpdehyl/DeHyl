import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichInvoicesWithSuggestions } from "@/lib/matching/invoice-matcher";
import type { Alert } from "@/types";

/**
 * GET /api/alerts
 * Generates alerts based on current data state
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const alerts: Alert[] = [];

    const [invoicesRes, billsRes, projectsRes, mappingsRes] = await Promise.all([
      supabase.from("invoices").select("*").gt("balance", 0),
      supabase.from("bills").select("*").gt("balance", 0),
      supabase.from("projects").select("*"),
      supabase.from("client_mappings").select("*"),
    ]);

    if (invoicesRes.error || billsRes.error || projectsRes.error) {
      return NextResponse.json(
        { error: "Failed to fetch data for alerts" },
        { status: 500 }
      );
    }

    const invoices = (invoicesRes.data || []).map((inv) => ({
      ...inv,
      id: inv.id,
      qbId: inv.qb_id,
      invoiceNumber: inv.invoice_number,
      clientName: inv.client_name,
      amount: Number(inv.amount),
      balance: Number(inv.balance),
      issueDate: inv.issue_date ? new Date(inv.issue_date) : new Date(),
      dueDate: inv.due_date ? new Date(inv.due_date) : new Date(),
      status: inv.status,
      projectId: inv.project_id,
      matchConfidence: inv.match_confidence,
      memo: inv.memo,
      syncedAt: inv.synced_at ? new Date(inv.synced_at) : new Date(),
      matchSuggestions: [],
    }));

    const bills = (billsRes.data || []).map((bill) => ({
      ...bill,
      id: bill.id,
      qbId: bill.qb_id,
      vendorName: bill.vendor_name,
      amount: Number(bill.amount),
      balance: Number(bill.balance),
      billDate: bill.bill_date ? new Date(bill.bill_date) : new Date(),
      dueDate: bill.due_date ? new Date(bill.due_date) : new Date(),
      status: bill.status,
      projectId: bill.project_id,
      memo: bill.memo,
      syncedAt: bill.synced_at ? new Date(bill.synced_at) : new Date(),
    }));

    const projects = (projectsRes.data || []).map((p) => ({
      ...p,
      id: p.id,
      driveId: p.drive_id,
      code: p.code,
      clientCode: p.client_code,
      clientName: p.client_name,
      description: p.description,
      status: p.status,
      estimateAmount: p.estimate_amount ? Number(p.estimate_amount) : null,
      estimateDriveId: p.estimate_drive_id,
      hasPBS: p.has_pbs,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
      totals: {
        invoiced: 0,
        paid: 0,
        outstanding: 0,
        costs: 0,
        profit: 0,
      },
    }));

    const clientMappings = (mappingsRes.data || []).map((m) => ({
      id: m.id,
      code: m.code,
      qbCustomerName: m.qb_customer_name,
      displayName: m.display_name,
      aliases: m.aliases || [],
    }));

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Overdue invoices (critical)
    const overdueInvoices = invoices.filter(
      (inv) => inv.balance > 0 && new Date(inv.dueDate) < now
    );
    if (overdueInvoices.length > 0) {
      alerts.push({
        type: "overdue_invoice",
        count: overdueInvoices.length,
        total: overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: overdueInvoices.map((inv) => inv.invoiceNumber),
        severity: "critical",
      });
    }

    // 2. Bills due soon (warning)
    const billsDueSoon = bills.filter(
      (bill) =>
        bill.balance > 0 &&
        new Date(bill.dueDate) >= now &&
        new Date(bill.dueDate) <= oneWeekFromNow
    );
    if (billsDueSoon.length > 0) {
      alerts.push({
        type: "bills_due_soon",
        count: billsDueSoon.length,
        total: billsDueSoon.reduce((sum, bill) => sum + bill.balance, 0),
        severity: "warning",
      });
    }

    // 3. Unassigned invoices (warning)
    const unassignedInvoices = invoices.filter(
      (inv) => inv.balance > 0 && !inv.projectId
    );
    if (unassignedInvoices.length > 0) {
      alerts.push({
        type: "unassigned_invoices",
        count: unassignedInvoices.length,
        total: unassignedInvoices.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: unassignedInvoices.map((inv) => inv.invoiceNumber),
        severity: "warning",
      });
    }

    // 4. Invoice match suggestions (info)
    const enrichedInvoices = enrichInvoicesWithSuggestions(
      unassignedInvoices,
      { projects, clientMappings }
    );
    const invoicesWithSuggestions = enrichedInvoices.filter(
      (inv) => inv.matchSuggestions.length > 0
    );
    if (invoicesWithSuggestions.length > 0) {
      alerts.push({
        type: "invoice_suggestions",
        count: invoicesWithSuggestions.length,
        invoices: invoicesWithSuggestions.map((inv) => inv.invoiceNumber),
        severity: "info",
      });
    }

    // 5. Missing estimates (info) - only for active projects
    const activeProjects = projects.filter((p) => p.status === "active");
    const missingEstimate = activeProjects.filter((p) => !p.estimateAmount);
    if (missingEstimate.length > 0) {
      alerts.push({
        type: "missing_estimate",
        count: missingEstimate.length,
        projects: missingEstimate.map((p) => p.code),
        severity: "info",
      });
    }

    // 6. Missing PBS (info) - only for active projects
    const missingPBS = activeProjects.filter((p) => !p.hasPBS);
    if (missingPBS.length > 0) {
      alerts.push({
        type: "missing_pbs",
        count: missingPBS.length,
        projects: missingPBS.map((p) => p.code),
        severity: "info",
      });
    }

    // 7. Aging receivables - invoices > 30 days old (warning)
    const agingReceivables = invoices.filter(
      (inv) =>
        inv.balance > 0 &&
        new Date(inv.issueDate) < thirtyDaysAgo &&
        inv.status !== "overdue" // Don't double count with overdue
    );
    if (agingReceivables.length > 0) {
      alerts.push({
        type: "aging_receivables",
        count: agingReceivables.length,
        total: agingReceivables.reduce((sum, inv) => sum + inv.balance, 0),
        invoices: agingReceivables.map((inv) => inv.invoiceNumber),
        severity: "warning",
      });
    }

    // 8. Projects with negative profit (critical)
    const negativeProfit = projects.filter(
      (p) => p.status === "active" && p.totals && p.totals.profit < 0
    );
    if (negativeProfit.length > 0) {
      alerts.push({
        type: "negative_profit",
        count: negativeProfit.length,
        projects: negativeProfit.map((p) => p.code),
        total: Math.abs(
          negativeProfit.reduce((sum, p) => sum + (p.totals?.profit || 0), 0)
        ),
        severity: "critical",
      });
    }

    return NextResponse.json({
      alerts,
      summary: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        total: alerts.length,
      },
    });
  } catch (error) {
    console.error("Error generating alerts:", error);
    return NextResponse.json(
      { error: "Failed to generate alerts" },
      { status: 500 }
    );
  }
}

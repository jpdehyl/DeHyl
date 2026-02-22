import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReceivablesResponse, InvoiceWithSuggestions } from "@/types";
import { getDaysOverdue, getDaysUntilDue } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();

  // Fetch open invoices from Supabase
  const { data: invoicesData, error: invoicesError } = await supabase
    .from("invoices")
    .select(`
      id,
      qb_id,
      invoice_number,
      client_name,
      amount,
      balance,
      issue_date,
      due_date,
      status,
      project_id,
      match_confidence,
      memo,
      manual_override,
      synced_at
    `)
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  if (invoicesError) {
    console.error("Failed to fetch invoices:", invoicesError);
    return NextResponse.json(
      { error: "Failed to fetch receivables" },
      { status: 500 }
    );
  }

  // Get last sync time
  const { data: syncLog } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "quickbooks")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Transform to InvoiceWithSuggestions type
  const openInvoices: InvoiceWithSuggestions[] = (invoicesData || []).map((inv) => ({
    id: inv.id,
    qbId: inv.qb_id,
    invoiceNumber: inv.invoice_number || "",
    clientName: inv.client_name,
    amount: Number(inv.amount),
    balance: Number(inv.balance),
    issueDate: new Date(inv.issue_date),
    dueDate: new Date(inv.due_date),
    status: inv.status as InvoiceWithSuggestions["status"],
    projectId: inv.project_id,
    matchConfidence: inv.match_confidence as InvoiceWithSuggestions["matchConfidence"],
    memo: inv.memo,
    manualOverride: inv.manual_override ?? false,
    syncedAt: new Date(inv.synced_at),
    matchSuggestions: [], // Will be populated by matching engine in future
  }));

  const totals = openInvoices.reduce(
    (acc, invoice) => {
      const daysOverdue = getDaysOverdue(invoice.dueDate);
      const daysUntil = getDaysUntilDue(invoice.dueDate);

      acc.outstanding += invoice.balance;

      if (daysOverdue > 0) {
        acc.overdue += invoice.balance;
      } else if (daysUntil <= 7) {
        acc.dueThisWeek += invoice.balance;
      }

      return acc;
    },
    { outstanding: 0, overdue: 0, dueThisWeek: 0 }
  );

  const response: ReceivablesResponse = {
    invoices: openInvoices,
    totals,
    lastSyncedAt: syncLog?.completed_at ? new Date(syncLog.completed_at) : null,
  };

  return NextResponse.json(response);
}

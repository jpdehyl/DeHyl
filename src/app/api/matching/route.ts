import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enrichInvoicesWithSuggestions,
  getAutoAssignableInvoices,
} from "@/lib/matching/invoice-matcher";

/**
 * GET /api/matching
 * Returns invoices enriched with match suggestions
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const [invoicesRes, projectsRes, mappingsRes] = await Promise.all([
      supabase.from("invoices").select("*").gt("balance", 0),
      supabase.from("projects").select("*"),
      supabase.from("client_mappings").select("*"),
    ]);

    if (invoicesRes.error) {
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
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
      manualOverride: inv.manual_override ?? false,
      syncedAt: inv.synced_at ? new Date(inv.synced_at) : new Date(),
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

    // Enrich invoices with suggestions
    const enrichedInvoices = enrichInvoicesWithSuggestions(invoices, {
      projects,
      clientMappings,
    });

    // Get auto-assignable invoices
    const autoAssignable = getAutoAssignableInvoices(enrichedInvoices);

    return NextResponse.json({
      invoices: enrichedInvoices,
      autoAssignable,
      stats: {
        total: enrichedInvoices.length,
        unassigned: enrichedInvoices.filter((i) => !i.projectId).length,
        withSuggestions: enrichedInvoices.filter(
          (i) => !i.projectId && i.matchSuggestions.length > 0
        ).length,
        highConfidence: autoAssignable.length,
      },
    });
  } catch (error) {
    console.error("Matching error:", error);
    return NextResponse.json(
      { error: "Failed to generate matches" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/auto-assign
 * Auto-assigns all high-confidence matches
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Get enriched invoices
    const response = await GET();
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const { autoAssignable } = data;

    if (autoAssignable.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: 0,
        message: "No high-confidence matches to auto-assign",
      });
    }

    // Assign each invoice
    const results = await Promise.all(
      autoAssignable.map(
        async (item: { invoiceId: string; projectId: string }) => {
          const { error } = await supabase
            .from("invoices")
            .update({
              project_id: item.projectId,
              match_confidence: "high",
            })
            .eq("id", item.invoiceId);

          return { invoiceId: item.invoiceId, success: !error, error };
        }
      )
    );

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      assigned: successCount,
      total: autoAssignable.length,
      results,
    });
  } catch (error) {
    console.error("Auto-assign error:", error);
    return NextResponse.json(
      { error: "Failed to auto-assign invoices" },
      { status: 500 }
    );
  }
}

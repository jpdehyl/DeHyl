import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoMatchInvoices } from "@/lib/matching/invoice-matcher";
import type { Invoice, Project, ClientMapping } from "@/types";

/**
 * POST /api/matching/auto-match
 *
 * Automatically matches unassigned invoices to projects based on client name matching.
 * Auto-assigns matches with confidence > 80%.
 *
 * Response:
 * {
 *   "matched": 12,
 *   "unmatched": 3,
 *   "results": [
 *     { "invoiceId": "xxx", "projectId": "yyy", "confidence": 0.9, "reason": "Client name exact match" }
 *   ]
 * }
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Fetch unassigned invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .is("project_id", null);

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    // Fetch all active projects
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "active");

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }

    // Fetch client mappings
    const { data: mappingsData, error: mappingsError } = await supabase
      .from("client_mappings")
      .select("*");

    if (mappingsError) {
      console.error("Error fetching client mappings:", mappingsError);
      // Continue without mappings - they're optional
    }

    // Transform database records to TypeScript types
    const invoices: Invoice[] = (invoicesData || []).map((inv) => ({
      id: inv.id,
      qbId: inv.qb_id,
      invoiceNumber: inv.invoice_number,
      clientName: inv.client_name,
      amount: Number(inv.amount),
      balance: Number(inv.balance),
      issueDate: new Date(inv.issue_date),
      dueDate: new Date(inv.due_date),
      status: inv.status,
      projectId: inv.project_id,
      matchConfidence: inv.match_confidence,
      memo: inv.memo,
      syncedAt: new Date(inv.synced_at),
    }));

    const projects: Project[] = (projectsData || []).map((p) => ({
      id: p.id,
      driveId: p.drive_id,
      code: p.code,
      clientCode: p.client_code,
      clientName: p.client_name,
      description: p.description,
      status: p.status,
      estimateAmount: p.estimate_amount ? Number(p.estimate_amount) : null,
      estimateDriveId: p.estimate_drive_id,
      hasEstimate: p.has_estimate ?? false,
      hasPBS: p.has_pbs ?? false,
      projectType: p.project_type || null,
      squareFootage: p.square_footage || null,
      finalCost: p.final_cost ? Number(p.final_cost) : null,
      finalRevenue: p.final_revenue ? Number(p.final_revenue) : null,
      profitMargin: p.profit_margin ? Number(p.profit_margin) : null,
      location: p.location || null,
      portalEnabled: p.portal_enabled ?? false,
      portalAccessCode: p.portal_access_code ?? null,
      portalSettings: p.portal_settings ?? {
        showTimeline: true,
        showPhotos: true,
        showDocuments: false,
        showFinancials: false,
        showContacts: false,
        clientMessage: "",
      },
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));

    const clientMappings: ClientMapping[] = (mappingsData || []).map((m) => ({
      id: m.id,
      code: m.code,
      qbCustomerName: m.qb_customer_name,
      displayName: m.display_name,
      aliases: m.aliases || [],
    }));

    // Run auto-matching algorithm
    const matchResults = autoMatchInvoices(invoices, projects, clientMappings);

    // Auto-assign invoices with confidence >= 80%
    const autoAssignResults = matchResults.results.filter((r) => r.autoAssigned);

    if (autoAssignResults.length > 0) {
      // Update invoices in database
      const updatePromises = autoAssignResults.map(async (result) => {
        const { error } = await supabase
          .from("invoices")
          .update({
            project_id: result.projectId,
            match_confidence: result.confidence >= 0.9 ? "high" : "medium",
          })
          .eq("id", result.invoiceId);

        if (error) {
          console.error(`Failed to assign invoice ${result.invoiceId}:`, error);
          return { success: false, invoiceId: result.invoiceId };
        }
        return { success: true, invoiceId: result.invoiceId };
      });

      const updateResults = await Promise.all(updatePromises);
      const successfulUpdates = updateResults.filter((r) => r.success).length;

      // Adjust matched count based on actual successful updates
      matchResults.matched = successfulUpdates;
      matchResults.unmatched = invoices.length - successfulUpdates;
    }

    return NextResponse.json({
      matched: matchResults.matched,
      unmatched: matchResults.unmatched,
      results: matchResults.results.map((r) => ({
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoiceNumber,
        clientName: r.clientName,
        projectId: r.projectId,
        projectCode: r.projectCode,
        confidence: r.confidence,
        reason: r.reason,
        autoAssigned: r.autoAssigned,
      })),
    });
  } catch (error) {
    console.error("Auto-match error:", error);
    return NextResponse.json(
      { error: "Failed to auto-match invoices" },
      { status: 500 }
    );
  }
}

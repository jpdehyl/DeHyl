import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectsResponse, ProjectWithTotals } from "@/types";

export async function GET() {
  const supabase = await createClient();

  // Fetch projects from Supabase
  const { data: projectsData, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .order("code", { ascending: false });

  if (projectsError) {
    console.error("Failed to fetch projects:", projectsError);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }

  // Fetch all invoices to compute totals per project
  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("project_id, amount, balance");

  // Fetch all bills to compute costs per project
  const { data: billsData } = await supabase
    .from("bills")
    .select("project_id, amount, balance");

  // Get last sync time
  const { data: syncLog } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "google_drive")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Compute totals per project
  const invoiceTotals = new Map<string, { invoiced: number; outstanding: number }>();
  const billTotals = new Map<string, number>();

  (invoicesData || []).forEach((inv) => {
    if (inv.project_id) {
      const current = invoiceTotals.get(inv.project_id) || { invoiced: 0, outstanding: 0 };
      current.invoiced += Number(inv.amount);
      current.outstanding += Number(inv.balance);
      invoiceTotals.set(inv.project_id, current);
    }
  });

  (billsData || []).forEach((bill) => {
    if (bill.project_id) {
      const current = billTotals.get(bill.project_id) || 0;
      billTotals.set(bill.project_id, current + Number(bill.amount));
    }
  });

  // Transform to ProjectWithTotals type
  const projects: ProjectWithTotals[] = (projectsData || []).map((proj) => {
    const invTotals = invoiceTotals.get(proj.id) || { invoiced: 0, outstanding: 0 };
    const costs = billTotals.get(proj.id) || 0;
    const paid = invTotals.invoiced - invTotals.outstanding;
    const profit = paid - costs;

    return {
      id: proj.id,
      driveId: proj.drive_id,
      code: proj.code,
      clientCode: proj.client_code,
      clientName: proj.client_name || proj.client_code,
      description: proj.description || "",
      status: proj.status as "active" | "closed",
      estimateAmount: proj.estimate_amount ? Number(proj.estimate_amount) : null,
      estimateDriveId: proj.estimate_drive_id,
      hasEstimate: !!proj.estimate_amount || !!proj.estimate_drive_id,
      hasPBS: proj.has_pbs || false,
      createdAt: new Date(proj.created_at),
      updatedAt: new Date(proj.updated_at),
      totals: {
        invoiced: invTotals.invoiced,
        paid,
        outstanding: invTotals.outstanding,
        costs,
        profit,
      },
    };
  });

  const response: ProjectsResponse = {
    projects,
    lastSyncedAt: syncLog?.completed_at ? new Date(syncLog.completed_at) : null,
  };

  return NextResponse.json(response);
}

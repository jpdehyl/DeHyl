import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithTotals, Invoice, Bill } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the project
  const { data: proj, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch invoices for this project
  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("*")
    .eq("project_id", id)
    .order("issue_date", { ascending: false });

  // Fetch bills for this project
  const { data: billsData } = await supabase
    .from("bills")
    .select("*")
    .eq("project_id", id)
    .order("bill_date", { ascending: false });

  // Compute totals
  const invoices = invoicesData || [];
  const bills = billsData || [];

  const invoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const outstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
  const paid = invoiced - outstanding;
  const costs = bills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const profit = paid - costs;

  // Transform project to ProjectWithTotals
  const project: ProjectWithTotals = {
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
    projectType: proj.project_type || null,
    squareFootage: proj.square_footage || null,
    finalCost: proj.final_cost ? Number(proj.final_cost) : null,
    finalRevenue: proj.final_revenue ? Number(proj.final_revenue) : null,
    profitMargin: proj.profit_margin ? Number(proj.profit_margin) : null,
    location: proj.location || null,
    createdAt: new Date(proj.created_at),
    updatedAt: new Date(proj.updated_at),
    totals: {
      invoiced,
      paid,
      outstanding,
      costs,
      profit,
    },
  };

  // Transform invoices
  const transformedInvoices: Invoice[] = invoices.map((inv) => ({
    id: inv.id,
    qbId: inv.qb_id,
    invoiceNumber: inv.invoice_number,
    clientName: inv.client_name,
    amount: Number(inv.amount),
    balance: Number(inv.balance),
    issueDate: new Date(inv.issue_date),
    dueDate: new Date(inv.due_date),
    status: inv.status as "draft" | "sent" | "paid" | "overdue",
    projectId: inv.project_id,
    matchConfidence: inv.match_confidence as "high" | "medium" | "low" | null,
    memo: inv.memo,
    syncedAt: new Date(inv.synced_at),
  }));

  // Transform bills
  const transformedBills: Bill[] = bills.map((bill) => ({
    id: bill.id,
    qbId: bill.qb_id,
    vendorName: bill.vendor_name,
    amount: Number(bill.amount),
    balance: Number(bill.balance),
    billDate: new Date(bill.bill_date),
    dueDate: new Date(bill.due_date),
    status: bill.status as "open" | "paid" | "overdue",
    projectId: bill.project_id,
    memo: bill.memo,
    syncedAt: new Date(bill.synced_at),
  }));

  return NextResponse.json({
    project,
    invoices: transformedInvoices,
    bills: transformedBills,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: "Invoice not found" },
      { status: 404 }
    );
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", id)
    .order("line_num", { ascending: true });

  // Fetch assigned project info if applicable
  let project = null;
  if (invoice.project_id) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, code, client_code, client_name, description")
      .eq("id", invoice.project_id)
      .single();
    project = projectData;
  }

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      qbId: invoice.qb_id,
      invoiceNumber: invoice.invoice_number,
      clientName: invoice.client_name,
      amount: Number(invoice.amount),
      balance: Number(invoice.balance),
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      status: invoice.status,
      projectId: invoice.project_id,
      matchConfidence: invoice.match_confidence,
      memo: invoice.memo,
      manualOverride: invoice.manual_override,
      syncedAt: invoice.synced_at,
    },
    lineItems: (lineItems || []).map((li: Record<string, unknown>) => ({
      id: li.id,
      invoiceId: li.invoice_id,
      lineNum: li.line_num,
      description: li.description,
      quantity: li.quantity ? Number(li.quantity) : null,
      unitPrice: li.unit_price ? Number(li.unit_price) : null,
      amount: Number(li.amount),
      itemName: li.item_name,
    })),
    project: project ? {
      id: project.id,
      code: project.code,
      clientCode: project.client_code,
      clientName: project.client_name,
      description: project.description,
    } : null,
  });
}

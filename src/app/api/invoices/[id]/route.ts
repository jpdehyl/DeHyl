import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/invoices/[id] — Update invoice fields (admin override)
// Sets manual_override=true so QB sync won't overwrite changes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = [
    "amount",
    "balance",
    "status",
    "memo",
    "invoice_number",
    "client_name",
    "issue_date",
    "due_date",
    "project_id",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Auto-set manual_override when financial fields are changed
  const financialFields = ["amount", "balance", "status"];
  const isFinancialEdit = financialFields.some((f) => updates[f] !== undefined);
  if (isFinancialEdit) {
    updates.manual_override = true;
  }

  // Allow explicitly setting manual_override
  if (body.manual_override !== undefined) {
    updates.manual_override = body.manual_override;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Invoice update error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, invoice: data });
}

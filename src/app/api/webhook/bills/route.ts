import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function authenticate(request: NextRequest): boolean {
  const apiKey = process.env.DEHYL_API_KEY;
  if (!apiKey) return false;
  const provided = request.headers.get("x-api-key");
  return provided === apiKey;
}

// GET /api/webhook/bills — summary of open bills (AP)
export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid x-api-key header." },
      { status: 401 }
    );
  }

  const supabase = await createClient();
  const { data: bills } = await supabase
    .from("bills")
    .select("id, qb_id, vendor_name, amount, balance, status, due_date, memo, manual_override")
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  const totalAP = (bills || []).reduce((sum: number, b: { balance: number }) => sum + Number(b.balance), 0);

  return NextResponse.json({
    total_ap: totalAP,
    open_bills: (bills || []).length,
    bills: bills || [],
  });
}

// POST /api/webhook/bills — create a new manual bill
// Body: { vendor_name, amount, balance?, due_date?, memo?, status? }
export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid x-api-key header." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { vendor_name, amount, balance, due_date, memo, status } = body as {
    vendor_name?: string;
    amount?: number;
    balance?: number;
    due_date?: string;
    memo?: string;
    status?: string;
  };

  if (!vendor_name || amount == null) {
    return NextResponse.json(
      { error: "Missing required fields: vendor_name and amount" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const qbId = `manual-${vendor_name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

  const { data: bill, error } = await supabase
    .from("bills")
    .insert({
      qb_id: qbId,
      vendor_name,
      amount,
      balance: balance ?? amount,
      due_date: due_date || null,
      memo: memo || null,
      status: status || "open",
      bill_date: new Date().toISOString().split("T")[0],
      manual_override: true,
      synced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, bill }, { status: 201 });
}

// PATCH /api/webhook/bills — update bill(s) by qb_id or vendor_name
// Body: { bills: [{ qb_id?, vendor_name?, balance?, status?, memo? }] }
export async function PATCH(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid x-api-key header." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bills } = body as {
    bills?: Array<{
      qb_id?: string;
      vendor_name?: string;
      balance?: number;
      status?: string;
      memo?: string;
    }>;
  };

  if (!bills || !Array.isArray(bills) || bills.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: bills (array)" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const results: Array<{ identifier: string; success: boolean; error?: string }> = [];

  for (const bill of bills) {
    const update: Record<string, unknown> = {};
    if (bill.balance !== undefined) update.balance = bill.balance;
    if (bill.status) update.status = bill.status;
    if (bill.memo) update.memo = bill.memo;

    if (Object.keys(update).length === 0) {
      results.push({ identifier: bill.qb_id || bill.vendor_name || "unknown", success: false, error: "No fields to update" });
      continue;
    }

    let query = supabase.from("bills").update(update);
    if (bill.qb_id) {
      query = query.eq("qb_id", bill.qb_id);
    } else if (bill.vendor_name) {
      query = query.eq("vendor_name", bill.vendor_name);
    } else {
      results.push({ identifier: "unknown", success: false, error: "Need qb_id or vendor_name" });
      continue;
    }

    const { error } = await query;
    results.push({
      identifier: bill.qb_id || bill.vendor_name || "unknown",
      success: !error,
      error: error?.message,
    });
  }

  return NextResponse.json({
    success: true,
    updated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

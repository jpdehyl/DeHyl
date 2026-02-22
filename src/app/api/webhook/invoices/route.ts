import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function authenticate(request: NextRequest): boolean {
  const apiKey = process.env.DEHYL_API_KEY;
  if (!apiKey) return false;
  const provided = request.headers.get("x-api-key");
  return provided === apiKey;
}

// PATCH /api/webhook/invoices
// Update invoice balance and status by invoice_number
// Body: { invoices: [{ invoice_number, balance, status }] }
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { invoices } = body as {
    invoices?: Array<{
      invoice_number: string;
      balance?: number;
      status?: string;
    }>;
  };

  if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: invoices (array of { invoice_number, balance, status })" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const results: Array<{ invoice_number: string; success: boolean; error?: string }> = [];

  for (const inv of invoices) {
    if (!inv.invoice_number) {
      results.push({ invoice_number: "unknown", success: false, error: "Missing invoice_number" });
      continue;
    }

    const update: Record<string, unknown> = {};
    if (inv.balance !== undefined) update.balance = inv.balance;
    if (inv.status) update.status = inv.status;

    if (Object.keys(update).length === 0) {
      results.push({ invoice_number: inv.invoice_number, success: false, error: "No fields to update" });
      continue;
    }

    const { error } = await supabase
      .from("invoices")
      .update(update)
      .eq("invoice_number", inv.invoice_number);

    if (error) {
      results.push({ invoice_number: inv.invoice_number, success: false, error: error.message });
    } else {
      results.push({ invoice_number: inv.invoice_number, success: true });
    }
  }

  return NextResponse.json({
    success: true,
    updated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_CATEGORIES = [
  "labor",
  "materials",
  "equipment",
  "subcontractor",
  "disposal",
  "permits",
  "fuel",
  "rental",
  "other",
];

function authenticate(request: NextRequest): boolean {
  const apiKey = process.env.DEHYL_API_KEY;
  if (!apiKey) return false;
  const provided = request.headers.get("x-api-key");
  return provided === apiKey;
}

interface CostEntry {
  projectCode: string;
  amount: number;
  description: string;
  category?: string;
  vendor?: string;
  costDate?: string;
  notes?: string;
}

/**
 * POST /api/webhook/costs/batch
 * Creates multiple cost entries in one request.
 * Body: { costs: CostEntry[] }
 */
export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid x-api-key header." },
      { status: 401 }
    );
  }

  let body: { costs?: CostEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { costs } = body;
  if (!costs || !Array.isArray(costs) || costs.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'costs' array in body" },
      { status: 400 }
    );
  }

  if (costs.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 cost entries per batch" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Resolve all unique project codes to IDs
  const uniqueCodes = [...new Set(costs.map((c) => c.projectCode))];
  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("id, code, client_name, description")
    .in("code", uniqueCodes);

  if (projError) {
    return NextResponse.json(
      { error: "Failed to look up projects" },
      { status: 500 }
    );
  }

  const projectMap = new Map(
    (projects || []).map((p) => [p.code, p])
  );

  const results: {
    created: Array<{ index: number; cost: Record<string, unknown>; projectCode: string }>;
    failed: Array<{ index: number; error: string; projectCode: string }>;
  } = { created: [], failed: [] };

  for (let i = 0; i < costs.length; i++) {
    const entry = costs[i];

    // Validate required fields
    if (!entry.projectCode) {
      results.failed.push({ index: i, error: "Missing projectCode", projectCode: entry.projectCode || "" });
      continue;
    }
    if (!entry.amount || typeof entry.amount !== "number" || entry.amount <= 0) {
      results.failed.push({ index: i, error: "Invalid amount", projectCode: entry.projectCode });
      continue;
    }
    if (!entry.description) {
      results.failed.push({ index: i, error: "Missing description", projectCode: entry.projectCode });
      continue;
    }
    if (entry.category && !VALID_CATEGORIES.includes(entry.category)) {
      results.failed.push({ index: i, error: `Invalid category: ${entry.category}`, projectCode: entry.projectCode });
      continue;
    }
    if (entry.costDate && !/^\d{4}-\d{2}-\d{2}$/.test(entry.costDate)) {
      results.failed.push({ index: i, error: "Invalid costDate format", projectCode: entry.projectCode });
      continue;
    }

    const project = projectMap.get(entry.projectCode);
    if (!project) {
      results.failed.push({ index: i, error: `Project '${entry.projectCode}' not found`, projectCode: entry.projectCode });
      continue;
    }

    const { data: cost, error: insertError } = await supabase
      .from("project_costs")
      .insert({
        project_id: project.id,
        description: entry.description,
        amount: entry.amount,
        cost_date: entry.costDate || new Date().toISOString().split("T")[0],
        category: entry.category || "other",
        vendor: entry.vendor || null,
        notes: entry.notes || "Created via Robbie (batch)",
      })
      .select()
      .single();

    if (insertError) {
      results.failed.push({ index: i, error: insertError.message, projectCode: entry.projectCode });
    } else {
      results.created.push({ index: i, cost: cost as Record<string, unknown>, projectCode: entry.projectCode });
    }
  }

  return NextResponse.json({
    summary: {
      total: costs.length,
      created: results.created.length,
      failed: results.failed.length,
    },
    created: results.created,
    failed: results.failed,
  });
}

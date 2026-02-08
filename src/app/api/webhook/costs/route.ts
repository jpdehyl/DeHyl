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

// POST /api/webhook/costs
// Creates a cost entry for a project, looked up by project code
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { projectCode, amount, description, category, vendor } = body as {
    projectCode?: string;
    amount?: number;
    description?: string;
    category?: string;
    vendor?: string;
  };

  // Validate required fields
  if (!projectCode) {
    return NextResponse.json(
      { error: "Missing required field: projectCode (e.g. '2601007')" },
      { status: 400 }
    );
  }
  if (amount == null || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Missing or invalid field: amount (must be a positive number)" },
      { status: 400 }
    );
  }
  if (!description) {
    return NextResponse.json(
      { error: "Missing required field: description" },
      { status: 400 }
    );
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Look up project by code
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, code, client_name, description")
    .eq("code", projectCode)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      {
        error: `Project not found with code '${projectCode}'. Make sure the project exists and the code matches exactly (e.g. '2601007').`,
      },
      { status: 404 }
    );
  }

  // Create cost entry
  const { data: cost, error: insertError } = await supabase
    .from("project_costs")
    .insert({
      project_id: project.id,
      description,
      amount,
      cost_date: new Date().toISOString().split("T")[0],
      category: category || "materials",
      vendor: vendor || null,
      notes: "Created via WhatsApp bridge",
    })
    .select()
    .single();

  if (insertError) {
    console.error("Webhook cost insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create cost entry" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      cost,
      project: {
        id: project.id,
        code: project.code,
        clientName: project.client_name,
        description: project.description,
      },
    },
    { status: 201 }
  );
}

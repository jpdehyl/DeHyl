import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: costs, error } = await supabase
    .from("project_costs")
    .select("*")
    .eq("project_id", id)
    .order("cost_date", { ascending: false });

  if (error) {
    console.error("Error fetching project costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch project costs" },
      { status: 500 }
    );
  }

  const total = (costs || []).reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  return NextResponse.json({ costs: costs || [], total });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json();
  const { description, amount, cost_date, category, vendor, notes } = body;

  if (!description || amount == null || !cost_date) {
    return NextResponse.json(
      { error: "Missing required fields: description, amount, cost_date" },
      { status: 400 }
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  const validCategories = [
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
  if (category && !validCategories.includes(category)) {
    return NextResponse.json(
      {
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const { data: cost, error } = await supabase
    .from("project_costs")
    .insert({
      project_id: id,
      description,
      amount: parsedAmount,
      cost_date,
      category: category || "materials",
      vendor: vendor || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project cost:", error);
    return NextResponse.json(
      { error: "Failed to create cost entry" },
      { status: 500 }
    );
  }

  return NextResponse.json({ cost }, { status: 201 });
}

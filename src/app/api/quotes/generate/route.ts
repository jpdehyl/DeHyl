import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuote, suggestProjectType } from "@/lib/quotes";
import type { QuoteRequest, QuoteResponse, Project, ProjectType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.projectType) {
      return NextResponse.json(
        { error: "projectType is required" },
        { status: 400 }
      );
    }

    if (!body.description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    const quoteRequest: QuoteRequest = {
      clientCode: body.clientCode || undefined,
      projectType: body.projectType as ProjectType,
      description: body.description,
      squareFootage: body.squareFootage ? Number(body.squareFootage) : undefined,
      location: body.location || undefined,
    };

    const supabase = await createClient();

    // Fetch all completed projects with final revenue
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "closed")
      .not("final_revenue", "is", null);

    if (projectsError) {
      console.error("Failed to fetch projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch historical projects" },
        { status: 500 }
      );
    }

    // Transform database rows to Project type
    const projects: Project[] = (projectsData || []).map((proj) => ({
      id: proj.id,
      driveId: proj.drive_id,
      code: proj.code,
      clientCode: proj.client_code,
      clientName: proj.client_name || proj.client_code,
      description: proj.description || "",
      status: proj.status as "active" | "closed",
      estimateAmount: proj.estimate_amount ? Number(proj.estimate_amount) : null,
      estimateDriveId: proj.estimate_drive_id,
      hasEstimate: !!proj.estimate_drive_id || !!proj.estimate_amount,
      hasPBS: proj.has_pbs || false,
      projectType: proj.project_type as ProjectType | null,
      squareFootage: proj.square_footage || null,
      finalCost: proj.final_cost ? Number(proj.final_cost) : null,
      finalRevenue: proj.final_revenue ? Number(proj.final_revenue) : null,
      profitMargin: proj.profit_margin ? Number(proj.profit_margin) : null,
      location: proj.location || null,
      createdAt: new Date(proj.created_at),
      updatedAt: new Date(proj.updated_at),
    }));

    // Generate the quote
    const quote = generateQuote(quoteRequest, projects);

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quote generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quote" },
      { status: 500 }
    );
  }
}

// GET endpoint to suggest project type based on description
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const description = searchParams.get("description");

  if (!description) {
    return NextResponse.json(
      { error: "description query parameter is required" },
      { status: 400 }
    );
  }

  const suggestedType = suggestProjectType(description);

  return NextResponse.json({
    suggestedType,
    description,
  });
}

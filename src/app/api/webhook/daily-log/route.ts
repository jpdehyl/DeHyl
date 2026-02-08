import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function authenticate(request: NextRequest): boolean {
  const apiKey = process.env.DEHYL_API_KEY;
  if (!apiKey) return false;
  const provided = request.headers.get("x-api-key");
  return provided === apiKey;
}

// POST /api/webhook/daily-log
// Creates a daily log for a project, looked up by project code
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

  const { projectCode, summary, weather, crewMembers, hoursWorked, areas } =
    body as {
      projectCode?: string;
      summary?: string;
      weather?: string;
      crewMembers?: string[];
      hoursWorked?: number;
      areas?: string[];
    };

  // Validate required fields
  if (!projectCode) {
    return NextResponse.json(
      { error: "Missing required field: projectCode (e.g. '2601007')" },
      { status: 400 }
    );
  }
  if (!summary) {
    return NextResponse.json(
      { error: "Missing required field: summary (a description of work done today)" },
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

  const today = new Date().toISOString().split("T")[0];

  // Upsert daily log (one per project per day via unique constraint)
  const { data: log, error: logError } = await supabase
    .from("daily_logs")
    .upsert(
      {
        project_id: project.id,
        log_date: today,
        work_summary: summary,
        weather: weather || null,
        areas_worked: areas || [],
        total_hours: hoursWorked || 0,
        source: "whatsapp",
        status: "submitted",
      },
      { onConflict: "project_id,log_date" }
    )
    .select()
    .single();

  if (logError) {
    console.error("Webhook daily log error:", logError);
    return NextResponse.json(
      { error: "Failed to create daily log" },
      { status: 500 }
    );
  }

  // If crew members provided, insert them
  if (crewMembers && crewMembers.length > 0 && log) {
    const hoursPerPerson =
      hoursWorked && crewMembers.length > 0
        ? hoursWorked / crewMembers.length
        : 8;

    const crewRows = crewMembers.map((name) => ({
      daily_log_id: log.id,
      worker_name: name,
      hours_worked: hoursPerPerson,
    }));

    const { error: crewError } = await supabase
      .from("daily_log_crew")
      .insert(crewRows);

    if (crewError) {
      console.error("Webhook crew insert error:", crewError);
      // Non-fatal — log was still created
    }
  }

  return NextResponse.json(
    {
      success: true,
      dailyLog: log,
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

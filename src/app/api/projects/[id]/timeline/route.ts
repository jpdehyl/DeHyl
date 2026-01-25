import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Activity, TimelineResponse, AddActivityRequest } from "@/types";

// Helper to convert snake_case DB rows to camelCase
function toActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    activityType: row.activity_type as Activity["activityType"],
    title: row.title as string,
    description: row.description as string | undefined,
    activityDate: new Date(row.activity_date as string),
    metadata: (row.metadata as Record<string, unknown>) || {},
    sourceId: row.source_id as string | undefined,
    sourceType: row.source_type as string | undefined,
    emailFrom: row.email_from as string | undefined,
    emailTo: row.email_to as string | undefined,
    emailSubject: row.email_subject as string | undefined,
    emailSnippet: row.email_snippet as string | undefined,
    emailThreadId: row.email_thread_id as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// GET /api/projects/[id]/timeline
// Query params: ?types=email,invoice&limit=50&offset=0&order=desc
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const types = searchParams.get("types")?.split(",").filter(Boolean);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("project_activities")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .order("activity_date", { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    // Filter by types if provided
    if (types && types.length > 0) {
      query = query.in("activity_type", types);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching timeline:", error);
      return NextResponse.json(
        { error: "Failed to fetch timeline" },
        { status: 500 }
      );
    }

    const activities = (data || []).map(toActivity);
    const total = count || 0;

    const response: TimelineResponse = {
      activities,
      total,
      hasMore: offset + activities.length < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Timeline GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/timeline
// Add manual note or activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const body: AddActivityRequest = await request.json();

    // Validate required fields
    if (!body.activityType || !body.title) {
      return NextResponse.json(
        { error: "activityType and title are required" },
        { status: 400 }
      );
    }

    // Only allow note and status_change for manual entries
    if (!["note", "status_change"].includes(body.activityType)) {
      return NextResponse.json(
        { error: "Only note and status_change activities can be added manually" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Insert activity
    const { data, error } = await supabase
      .from("project_activities")
      .insert({
        project_id: projectId,
        activity_type: body.activityType,
        title: body.title,
        description: body.description || null,
        activity_date: body.activityDate || new Date().toISOString(),
        metadata: {},
        source_type: "manual",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating activity:", error);
      return NextResponse.json(
        { error: "Failed to create activity" },
        { status: 500 }
      );
    }

    return NextResponse.json({ activity: toActivity(data) }, { status: 201 });
  } catch (error) {
    console.error("Timeline POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

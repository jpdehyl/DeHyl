import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleProjectStory } from "@/lib/stories/assembler";
import type { StoryDetailResponse } from "@/types/stories";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Fan out all queries in parallel
    const [
      projectResult,
      estimatesResult,
      crewResult,
      dailyLogsResult,
      photosResult,
      invoicesResult,
      costsResult,
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single(),

      supabase
        .from("estimates")
        .select("*, estimate_line_items(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),

      supabase
        .from("project_assignments")
        .select("*, crew_members(id, name, role, phone, email, employment_type, company, hourly_rate)")
        .eq("project_id", projectId)
        .eq("is_active", true),

      supabase
        .from("daily_logs")
        .select("*, daily_log_crew(worker_name, hours_worked, role), daily_log_materials(item_name, quantity, unit), daily_log_equipment(equipment_name, hours_used)")
        .eq("project_id", projectId)
        .order("log_date", { ascending: false })
        .limit(30),

      supabase
        .from("project_photos")
        .select("id, storage_url, thumbnail_url, filename, photo_date, category, notes, area, created_at")
        .eq("project_id", projectId)
        .order("photo_date", { ascending: false })
        .limit(50),

      supabase
        .from("invoices")
        .select("id, invoice_number, client_name, amount, balance, issue_date, due_date, status, memo")
        .eq("project_id", projectId)
        .order("issue_date", { ascending: false }),

      supabase
        .from("project_costs")
        .select("id, description, amount, cost_date, category, vendor")
        .eq("project_id", projectId)
        .order("cost_date", { ascending: false }),
    ]);

    if (projectResult.error || !projectResult.data) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const story = assembleProjectStory({
      project: projectResult.data,
      estimates: estimatesResult.data || [],
      crewAssignments: crewResult.data || [],
      dailyLogs: dailyLogsResult.data || [],
      photos: photosResult.data || [],
      invoices: invoicesResult.data || [],
      costs: costsResult.data || [],
    });

    const response: StoryDetailResponse = { story };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("Story detail API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch project story" },
      { status: 500 }
    );
  }
}

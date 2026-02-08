import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/daily-logs/webhook
 * External webhook for Robbie to create daily logs from WhatsApp messages
 * Auth: Bearer token (ROBBIE_API_KEY env var)
 */

const ROBBIE_API_KEY = process.env.ROBBIE_API_KEY;

function authorize(request: NextRequest): boolean {
  if (!ROBBIE_API_KEY) return false;
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const token = auth.replace("Bearer ", "");
  return token === ROBBIE_API_KEY;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await request.json();
    const {
      projectCode,
      projectId,
      logDate,
      workSummary,
      areasWorked,
      weather,
      notes,
      internalNotes,
      crew = [],
      photos = [],
      source = "whatsapp",
      // Also create a project_update for the portal timeline
      createTimelineEntry = true,
      timelineTitle,
      timelineContent,
    } = body;

    // Resolve project
    let resolvedProjectId = projectId;
    if (!resolvedProjectId && projectCode) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("code", projectCode)
        .single();
      if (project) resolvedProjectId = project.id;
    }

    if (!resolvedProjectId) {
      return NextResponse.json(
        { error: "Project not found. Provide projectId or projectCode." },
        { status: 400 }
      );
    }

    const date = logDate || new Date().toISOString().split("T")[0];

    // Upsert daily log (one per project per day)
    const { data: dailyLog, error: logError } = await supabase
      .from("daily_logs")
      .upsert(
        {
          project_id: resolvedProjectId,
          log_date: date,
          work_summary: workSummary,
          areas_worked: areasWorked,
          weather,
          notes,
          internal_notes: internalNotes,
          source,
          status: "submitted",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,log_date" }
      )
      .select()
      .single();

    if (logError) {
      return NextResponse.json(
        { error: "Failed to create daily log", details: logError.message },
        { status: 500 }
      );
    }

    // Add crew entries
    if (crew.length > 0 && dailyLog) {
      const crewInserts = crew.map(
        (c: {
          workerName: string;
          company?: string;
          hoursWorked?: number;
          role?: string;
          taskDescription?: string;
        }) => ({
          daily_log_id: dailyLog.id,
          worker_name: c.workerName,
          company: c.company || "Unknown",
          hours_worked: c.hoursWorked || 0,
          role: c.role,
          task_description: c.taskDescription,
        })
      );

      await supabase.from("daily_log_crew").insert(crewInserts);

      // Also create timesheet entries
      const timesheetInserts = crew
        .filter((c: any) => c.hoursWorked && c.hoursWorked > 0)
        .map((c: {
          workerName: string;
          hoursWorked: number;
          taskDescription?: string;
        }) => ({
          worker_name: c.workerName,
          work_date: date,
          hours_worked: c.hoursWorked,
          project_id: resolvedProjectId,
          description: c.taskDescription || workSummary || "Work logged via daily log",
          status: resolvedProjectId ? "assigned" : "unassigned",
          source: "daily_log",
          submitted_by: "whatsapp"
        }));

      if (timesheetInserts.length > 0) {
        // Use upsert to handle duplicates (same worker, date, project)
        await supabase
          .from("timesheets")
          .upsert(timesheetInserts, { 
            onConflict: "worker_name,work_date,project_id",
            ignoreDuplicates: true 
          });
      }
    }

    // Add photo references
    if (photos.length > 0 && dailyLog) {
      const photoInserts = photos.map(
        (p: { url: string; caption?: string; takenAt?: string }) => ({
          daily_log_id: dailyLog.id,
          photo_url: p.url,
          caption: p.caption,
          taken_at: p.takenAt || new Date().toISOString(),
        })
      );

      await supabase.from("daily_log_photos").insert(photoInserts);
    }

    // Create a project_update for the client portal timeline
    if (createTimelineEntry) {
      const title =
        timelineTitle || `Daily Update — ${date}`;
      const content =
        timelineContent || workSummary || "Work in progress.";

      await supabase.from("project_updates").insert({
        project_id: resolvedProjectId,
        title,
        content,
        update_type: "note",
        visible_to_client: true,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      dailyLog: {
        id: dailyLog.id,
        projectId: dailyLog.project_id,
        date: dailyLog.log_date,
      },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

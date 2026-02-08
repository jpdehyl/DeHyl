import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TimeEntriesResponse, CreateTimeEntryInput } from "@/types/crew";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  
  const crewMemberId = searchParams.get('crew_member_id');
  const projectId = searchParams.get('project_id');
  const dailyLogId = searchParams.get('daily_log_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = parseInt(searchParams.get('limit') || '100');

  let query = supabase
    .from("time_entries")
    .select(`
      *,
      crew_member:crew_members(id, name),
      project:projects(id, code, description)
    `)
    .order("date", { ascending: false })
    .limit(limit);

  // Apply filters
  if (crewMemberId) {
    query = query.eq('crew_member_id', crewMemberId);
  }
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  if (dailyLogId) {
    query = query.eq('daily_log_id', dailyLogId);
  }
  if (from) {
    query = query.gte('date', from);
  }
  if (to) {
    query = query.lte('date', to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }

  const totalHours = (data || []).reduce((sum, entry) => sum + Number(entry.hours), 0);

  // Determine date range from actual data
  const dates = (data || []).map(e => e.date).sort();
  
  const response: TimeEntriesResponse = {
    entries: data || [],
    total_hours: totalHours,
    date_range: {
      from: from || dates[0] || new Date().toISOString().split('T')[0],
      to: to || dates[dates.length - 1] || new Date().toISOString().split('T')[0],
    },
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body: CreateTimeEntryInput = await request.json();

    if (!body.crew_member_id) {
      return NextResponse.json(
        { error: "crew_member_id is required" },
        { status: 400 }
      );
    }
    if (!body.date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }
    if (!body.hours || body.hours <= 0) {
      return NextResponse.json(
        { error: "hours must be greater than 0" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        crew_member_id: body.crew_member_id,
        project_id: body.project_id || null,
        daily_log_id: body.daily_log_id || null,
        date: body.date,
        hours: body.hours,
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        task_description: body.task_description || null,
        area: body.area || null,
        billable: body.billable ?? true,
        notes: body.notes || null,
        source: body.daily_log_id ? 'daily_log' : 'manual',
      })
      .select(`
        *,
        crew_member:crew_members(id, name),
        project:projects(id, code, description)
      `)
      .single();

    if (error) {
      console.error("Failed to create time entry:", error);
      return NextResponse.json(
        { error: "Failed to create time entry" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("Invalid request body:", e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

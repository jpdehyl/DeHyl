import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get count and total hours of unassigned timesheets
    const { data: unassignedStats, error: statsError } = await supabase
      .from('timesheets')
      .select('hours_worked')
      .eq('status', 'unassigned');

    if (statsError) {
      console.error('Error fetching unassigned stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch unassigned timesheet stats' },
        { status: 500 }
      );
    }

    const totalEntries = unassignedStats.length;
    const totalHours = unassignedStats.reduce((sum, entry) => sum + Number(entry.hours_worked), 0);

    // Get detailed list of unassigned timesheets
    const { data: unassignedTimesheets, error: listError } = await supabase
      .from('timesheets')
      .select(`
        *,
        projects:project_id (
          id,
          code,
          client_name,
          description
        )
      `)
      .eq('status', 'unassigned')
      .order('work_date', { ascending: false })
      .order('worker_name', { ascending: true });

    if (listError) {
      console.error('Error fetching unassigned timesheets:', listError);
      return NextResponse.json(
        { error: 'Failed to fetch unassigned timesheets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stats: {
        totalEntries,
        totalHours
      },
      timesheets: unassignedTimesheets
    });
  } catch (error) {
    console.error('Unassigned timesheets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
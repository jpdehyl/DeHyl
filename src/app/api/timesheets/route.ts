import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Extract filters from search params
    const status = searchParams.get('status');
    const worker = searchParams.get('worker');
    const projectId = searchParams.get('project_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit');

    // Build query with filters
    let query = supabase
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
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (worker) {
      query = query.eq('worker_name', worker);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (startDate) {
      query = query.gte('work_date', startDate);
    }
    if (endDate) {
      query = query.lte('work_date', endDate);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: timesheets, error } = await query;

    if (error) {
      console.error('Error fetching timesheets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch timesheets' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timesheets });
  } catch (error) {
    console.error('Timesheets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const {
      worker_name,
      work_date,
      hours_worked,
      project_id,
      description,
      status = 'unassigned',
      source = 'manual',
      submitted_by,
      notes
    } = body;

    // Validation
    if (!worker_name || !work_date || !hours_worked) {
      return NextResponse.json(
        { error: 'Missing required fields: worker_name, work_date, hours_worked' },
        { status: 400 }
      );
    }

    if (hours_worked <= 0) {
      return NextResponse.json(
        { error: 'Hours worked must be greater than 0' },
        { status: 400 }
      );
    }

    // Create timesheet entry
    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .insert({
        worker_name,
        work_date,
        hours_worked: parseFloat(hours_worked),
        project_id,
        description,
        status: project_id ? 'assigned' : status,
        source,
        submitted_by,
        notes
      })
      .select(`
        *,
        projects:project_id (
          id,
          code,
          client_name,
          description
        )
      `)
      .single();

    if (error) {
      console.error('Error creating timesheet:', error);
      
      // Handle duplicate entry error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Timesheet entry already exists for this worker, date, and project' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create timesheet entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timesheet }, { status: 201 });
  } catch (error) {
    console.error('Timesheets POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
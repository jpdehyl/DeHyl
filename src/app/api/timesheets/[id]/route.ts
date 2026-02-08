import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id } = await params;

    const {
      worker_name,
      work_date,
      hours_worked,
      project_id,
      description,
      status,
      notes,
      approved_by
    } = body;

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (worker_name !== undefined) updateData.worker_name = worker_name;
    if (work_date !== undefined) updateData.work_date = work_date;
    if (hours_worked !== undefined) {
      if (hours_worked <= 0) {
        return NextResponse.json(
          { error: 'Hours worked must be greater than 0' },
          { status: 400 }
        );
      }
      updateData.hours_worked = parseFloat(hours_worked);
    }
    if (project_id !== undefined) {
      updateData.project_id = project_id;
      // Auto-assign status if project is set
      if (project_id && !status) {
        updateData.status = 'assigned';
      }
    }
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      // If approving, set approval info
      if (status === 'approved') {
        updateData.approved_by = approved_by;
        updateData.approved_at = new Date().toISOString();
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating timesheet:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Timesheet not found' },
          { status: 404 }
        );
      }
      
      // Handle duplicate entry error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Timesheet entry already exists for this worker, date, and project' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update timesheet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timesheet });
  } catch (error) {
    console.error('Timesheet PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from('timesheets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting timesheet:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Timesheet not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to delete timesheet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Timesheet DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
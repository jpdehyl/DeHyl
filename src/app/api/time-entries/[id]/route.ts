import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("time_entries")
    .select(`
      *,
      crew_member:crew_members(id, name),
      project:projects(id, code, description)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Time entry not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.created_at;
    delete body.updated_at;
    delete body.crew_member;
    delete body.project;

    const { data, error } = await supabase
      .from("time_entries")
      .update(body)
      .eq("id", id)
      .select(`
        *,
        crew_member:crew_members(id, name),
        project:projects(id, code, description)
      `)
      .single();

    if (error) {
      console.error("Failed to update time entry:", error);
      return NextResponse.json(
        { error: "Failed to update time entry" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Invalid request body:", e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete time entry:", error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

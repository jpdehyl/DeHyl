import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { projectId } = body; // Can be null to unassign

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bills")
      .update({
        project_id: projectId || null,
        manual_override: !!projectId, // Protect from sync overwrite when assigned
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update bill in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: projectId
        ? `Bill ${id} assigned to project ${projectId}`
        : `Bill ${id} unassigned`,
      bill: data,
    });
  } catch (error) {
    console.error("Failed to assign bill:", error);
    return NextResponse.json(
      { error: "Failed to assign bill" },
      { status: 500 }
    );
  }
}

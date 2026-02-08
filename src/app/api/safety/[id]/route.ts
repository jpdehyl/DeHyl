import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get a single safety checklist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: checklist, error } = await supabase
      .from("safety_checklists")
      .select(`
        *,
        template:safety_templates(*),
        project:projects(id, code, description, client_name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Checklist not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("Error fetching safety checklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

// PATCH - Update a safety checklist
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { data: checklist, error } = await supabase
      .from("safety_checklists")
      .update(body)
      .eq("id", id)
      .select(`
        *,
        template:safety_templates(id, name, type),
        project:projects(id, code, description)
      `)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Checklist not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error("Error updating safety checklist:", error);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a safety checklist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("safety_checklists")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting safety checklist:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}

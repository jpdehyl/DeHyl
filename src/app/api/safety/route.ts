import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List safety checklists with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const projectId = searchParams.get("project_id");
    const templateId = searchParams.get("template_id");
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("safety_checklists")
      .select(`
        *,
        template:safety_templates(id, name, type),
        project:projects(id, code, description)
      `)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    if (templateId) {
      query = query.eq("template_id", templateId);
    }
    if (date) {
      query = query.eq("date", date);
    }

    const { data: checklists, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ 
      checklists,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching safety checklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}

// POST - Create a new safety checklist
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      template_id,
      project_id,
      completed_by,
      completed_by_name,
      date,
      shift,
      weather,
      temperature,
      location,
      responses,
      attendees,
      hazards_identified,
      controls_implemented,
      additional_notes,
      signature_data,
      status = "completed"
    } = body;

    // Validate required fields
    if (!template_id) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 }
      );
    }

    const { data: checklist, error } = await supabase
      .from("safety_checklists")
      .insert({
        template_id,
        project_id,
        completed_by,
        completed_by_name,
        date: date || new Date().toISOString().split('T')[0],
        shift,
        weather,
        temperature,
        location,
        responses: responses || {},
        attendees: attendees || [],
        hazards_identified,
        controls_implemented,
        additional_notes,
        signature_data,
        status
      })
      .select(`
        *,
        template:safety_templates(id, name, type),
        project:projects(id, code, description)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error("Error creating safety checklist:", error);
    return NextResponse.json(
      { error: "Failed to create checklist" },
      { status: 500 }
    );
  }
}

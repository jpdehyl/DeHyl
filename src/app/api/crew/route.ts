import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CrewListResponse, CreateCrewMemberInput } from "@/types/crew";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  
  const status = searchParams.get('status');
  const role = searchParams.get('role');
  const search = searchParams.get('search');

  let query = supabase
    .from("crew_members")
    .select("id, name, phone, email, role, employment_type, company, hire_date, termination_date, status, emergency_contact_name, emergency_contact_phone, notes, created_at, updated_at")
    .order("name", { ascending: true });

  // Apply filters
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (role && role !== 'all') {
    query = query.eq('role', role);
  }
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch crew members:", error);
    return NextResponse.json(
      { error: "Failed to fetch crew members" },
      { status: 500 }
    );
  }

  const response: CrewListResponse = {
    crew: data || [],
    total: data?.length || 0,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body: CreateCrewMemberInput = await request.json();

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("crew_members")
      .insert({
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        role: body.role || null,
        employment_type: body.employment_type || 'employee',
        company: body.company || null,
        hourly_rate: body.hourly_rate || null,
        hire_date: body.hire_date || null,
        emergency_contact_name: body.emergency_contact_name || null,
        emergency_contact_phone: body.emergency_contact_phone || null,
        notes: body.notes || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create crew member:", error);
      return NextResponse.json(
        { error: "Failed to create crew member" },
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

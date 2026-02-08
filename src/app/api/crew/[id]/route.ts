import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CrewDetailResponse } from "@/types/crew";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch crew member (including hourly_rate for admin)
  const { data: crewMember, error: crewError } = await supabase
    .from("crew_members")
    .select("*")
    .eq("id", id)
    .single();

  if (crewError || !crewMember) {
    return NextResponse.json(
      { error: "Crew member not found" },
      { status: 404 }
    );
  }

  // Fetch certifications
  const { data: certifications } = await supabase
    .from("certifications")
    .select("*")
    .eq("crew_member_id", id)
    .order("expiry_date", { ascending: true });

  // Fetch project assignments with project info
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select(`
      *,
      project:projects(code, description)
    `)
    .eq("crew_member_id", id)
    .order("start_date", { ascending: false });

  // Fetch recent time entries (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select(`
      *,
      project:projects(id, code, description)
    `)
    .eq("crew_member_id", id)
    .gte("date", thirtyDaysAgo.toISOString().split('T')[0])
    .order("date", { ascending: false })
    .limit(50);

  // Calculate stats
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const hoursThisWeek = (timeEntries || [])
    .filter(te => new Date(te.date) >= startOfWeek)
    .reduce((sum, te) => sum + Number(te.hours), 0);

  const hoursThisMonth = (timeEntries || [])
    .filter(te => new Date(te.date) >= startOfMonth)
    .reduce((sum, te) => sum + Number(te.hours), 0);

  const activeProjects = (assignments || [])
    .filter(a => a.is_active).length;

  const expiringCerts = (certifications || [])
    .filter(c => {
      if (!c.expiry_date) return false;
      const expiry = new Date(c.expiry_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiry <= thirtyDaysFromNow && expiry >= now;
    }).length;

  const response: CrewDetailResponse = {
    crew_member: crewMember,
    certifications: certifications || [],
    assignments: assignments || [],
    recent_time_entries: timeEntries || [],
    stats: {
      hours_this_week: hoursThisWeek,
      hours_this_month: hoursThisMonth,
      active_projects: activeProjects,
      expiring_certs: expiringCerts,
    },
  };

  return NextResponse.json(response);
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

    const { data, error } = await supabase
      .from("crew_members")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update crew member:", error);
      return NextResponse.json(
        { error: "Failed to update crew member" },
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
    .from("crew_members")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete crew member:", error);
    return NextResponse.json(
      { error: "Failed to delete crew member" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

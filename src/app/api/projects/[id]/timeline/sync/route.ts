import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Helper: upsert or update an activity by source_id + source_type
async function syncActivity(
  supabase: SupabaseClient,
  data: {
    project_id: string;
    activity_type: string;
    title: string;
    description: string;
    activity_date: string;
    metadata: Record<string, unknown>;
    source_id: string;
    source_type: string;
  }
) {
  const { error: upsertError } = await supabase
    .from("project_activities")
    .upsert(data, {
      onConflict: "source_id,source_type",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    // Fallback: check-then-update/insert
    const { data: existing } = await supabase
      .from("project_activities")
      .select("id")
      .eq("source_id", data.source_id)
      .eq("source_type", data.source_type)
      .single();

    if (existing) {
      await supabase
        .from("project_activities")
        .update({
          title: data.title,
          description: data.description,
          activity_date: data.activity_date,
          metadata: data.metadata,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("project_activities").insert(data);
    }
  }
}

// POST /api/projects/[id]/timeline/sync
// Syncs invoices, bills, daily logs, costs, and safety checklists into the timeline
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const supabase = await createClient();

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, code")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const counts = {
      invoices: 0,
      bills: 0,
      dailyLogs: 0,
      costs: 0,
      safetyChecklists: 0,
    };

    // --- Sync invoices ---
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("project_id", projectId);

    if (invoices) {
      for (const inv of invoices) {
        await syncActivity(supabase, {
          project_id: projectId,
          activity_type: "invoice",
          title: `Invoice ${inv.invoice_number || inv.qb_id}`,
          description: `$${Number(inv.amount).toLocaleString()} - ${inv.status}`,
          activity_date: inv.issue_date || inv.synced_at,
          metadata: {
            amount: inv.amount,
            balance: inv.balance,
            status: inv.status,
            invoiceNumber: inv.invoice_number,
            clientName: inv.client_name,
            dueDate: inv.due_date,
          },
          source_id: inv.id,
          source_type: "invoice",
        });
        counts.invoices++;
      }
    }

    // --- Sync bills ---
    const { data: bills } = await supabase
      .from("bills")
      .select("*")
      .eq("project_id", projectId);

    if (bills) {
      for (const bill of bills) {
        await syncActivity(supabase, {
          project_id: projectId,
          activity_type: "bill",
          title: `Bill from ${bill.vendor_name}`,
          description: `$${Number(bill.amount).toLocaleString()} - ${bill.status}`,
          activity_date: bill.bill_date || bill.synced_at,
          metadata: {
            amount: bill.amount,
            balance: bill.balance,
            status: bill.status,
            vendorName: bill.vendor_name,
            dueDate: bill.due_date,
          },
          source_id: bill.id,
          source_type: "bill",
        });
        counts.bills++;
      }
    }

    // --- Sync daily logs ---
    const { data: dailyLogs } = await supabase
      .from("daily_logs")
      .select("*, daily_log_crew(*)")
      .eq("project_id", projectId);

    if (dailyLogs) {
      for (const log of dailyLogs) {
        const crew = log.daily_log_crew || [];
        const totalHours = crew.reduce(
          (sum: number, c: { hours_worked?: number }) =>
            sum + (c.hours_worked || 0),
          0
        );
        const crewCount = crew.length;

        await syncActivity(supabase, {
          project_id: projectId,
          activity_type: "daily_log",
          title: `Daily Log - ${log.log_date}`,
          description: log.work_summary || `${crewCount} crew, ${totalHours}h logged`,
          activity_date: log.log_date,
          metadata: {
            weather: log.weather_conditions,
            temperature: log.temperature_high,
            totalHours,
            crewCount,
            areasWorked: log.areas_worked || [],
            status: log.status,
            safetyIncident: log.safety_incident,
          },
          source_id: log.id,
          source_type: "daily_log",
        });
        counts.dailyLogs++;
      }
    }

    // --- Sync project costs ---
    const { data: costs } = await supabase
      .from("project_costs")
      .select("*")
      .eq("project_id", projectId);

    if (costs) {
      for (const cost of costs) {
        await syncActivity(supabase, {
          project_id: projectId,
          activity_type: "cost",
          title: cost.description,
          description: `$${Number(cost.amount).toLocaleString()} - ${cost.category}${cost.vendor ? ` (${cost.vendor})` : ""}`,
          activity_date: cost.cost_date,
          metadata: {
            amount: cost.amount,
            category: cost.category,
            vendor: cost.vendor,
            notes: cost.notes,
            status: cost.status,
          },
          source_id: cost.id,
          source_type: "cost",
        });
        counts.costs++;
      }
    }

    // --- Sync safety checklists ---
    const { data: checklists } = await supabase
      .from("safety_checklists")
      .select("*, safety_templates(name)")
      .eq("project_id", projectId);

    if (checklists) {
      for (const cl of checklists) {
        const templateName =
          cl.safety_templates?.name || "Safety Checklist";

        await syncActivity(supabase, {
          project_id: projectId,
          activity_type: "safety_checklist",
          title: `${templateName}`,
          description: `${cl.status || "completed"} - ${cl.shift || "day"} shift${cl.location ? ` at ${cl.location}` : ""}`,
          activity_date: cl.checklist_date || cl.created_at,
          metadata: {
            templateName,
            shift: cl.shift,
            location: cl.location,
            weather: cl.weather,
            temperature: cl.temperature,
            status: cl.status,
            attendees: cl.attendees,
            hazards: cl.hazards,
          },
          source_id: cl.id,
          source_type: "safety_checklist",
        });
        counts.safetyChecklists++;
      }
    }

    return NextResponse.json({
      success: true,
      synced: counts,
    });
  } catch (error) {
    console.error("Timeline sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

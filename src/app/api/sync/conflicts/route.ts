import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sync/conflicts
 * Returns pending sync conflicts for user review.
 * Query params:
 *   - status: 'pending' (default) | 'resolved_keep_app' | 'resolved_keep_external' | 'dismissed' | 'all'
 *   - entity_type: 'invoice' | 'bill' | 'project' (optional filter)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const entityType = searchParams.get("entity_type");

  let query = supabase
    .from("sync_conflicts")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch sync conflicts" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    conflicts: data || [],
    count: data?.length || 0,
  });
}

/**
 * POST /api/sync/conflicts
 * Resolve a sync conflict.
 * Body: { id: string, resolution: 'keep_app' | 'keep_external' | 'dismiss' }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { id, resolution } = body;

    if (!id || !resolution) {
      return NextResponse.json(
        { error: "Missing id or resolution" },
        { status: 400 }
      );
    }

    const validResolutions = ["keep_app", "keep_external", "dismiss"];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: `Invalid resolution. Must be one of: ${validResolutions.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the conflict details
    const { data: conflict, error: fetchError } = await supabase
      .from("sync_conflicts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !conflict) {
      return NextResponse.json(
        { error: "Conflict not found" },
        { status: 404 }
      );
    }

    // If resolving with external value, apply the change
    if (resolution === "keep_external") {
      const table = conflict.entity_type === "invoice"
        ? "invoices"
        : conflict.entity_type === "bill"
          ? "bills"
          : "projects";

      const idField = conflict.entity_type === "project" ? "drive_id" : "qb_id";

      // Apply the external value to the app record
      const { error: updateError } = await supabase
        .from(table)
        .update({ [conflict.field_name]: conflict.external_value })
        .eq(idField, conflict.external_id);

      if (updateError) {
        console.error("Failed to apply external value:", updateError);
        return NextResponse.json(
          { error: "Failed to apply resolution" },
          { status: 500 }
        );
      }
    }

    // Mark the conflict as resolved
    const statusValue = resolution === "keep_app"
      ? "resolved_keep_app"
      : resolution === "keep_external"
        ? "resolved_keep_external"
        : "dismissed";

    const { error: resolveError } = await supabase
      .from("sync_conflicts")
      .update({
        status: statusValue,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (resolveError) {
      return NextResponse.json(
        { error: "Failed to update conflict status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Conflict resolved: ${statusValue}`,
    });
  } catch (error) {
    console.error("Failed to resolve conflict:", error);
    return NextResponse.json(
      { error: "Failed to resolve conflict" },
      { status: 500 }
    );
  }
}

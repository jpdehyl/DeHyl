import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/client-mappings
 * Returns all client mappings
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("client_mappings")
      .select("*")
      .order("code");

    if (error) {
      console.error("Error fetching client mappings:", error);
      return NextResponse.json(
        { error: "Failed to fetch client mappings" },
        { status: 500 }
      );
    }

    const mappings = (data || []).map((m) => ({
      id: m.id,
      code: m.code,
      qbCustomerName: m.qb_customer_name,
      displayName: m.display_name,
      aliases: m.aliases || [],
    }));

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Error fetching client mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch client mappings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/client-mappings
 * Creates a new client mapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, displayName, qbCustomerName, aliases = [] } = body;

    if (!code || !displayName) {
      return NextResponse.json(
        { error: "Code and display name are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("client_mappings")
      .insert({
        code: code.toUpperCase(),
        display_name: displayName,
        qb_customer_name: qbCustomerName || null,
        aliases: aliases,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A mapping with this code already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      mapping: {
        id: data.id,
        code: data.code,
        displayName: data.display_name,
        qbCustomerName: data.qb_customer_name,
        aliases: data.aliases || [],
      },
    });
  } catch (error) {
    console.error("Error creating client mapping:", error);
    return NextResponse.json(
      { error: "Failed to create client mapping" },
      { status: 500 }
    );
  }
}

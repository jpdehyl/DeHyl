import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/disconnect
 * Disconnects an OAuth integration by removing stored tokens
 * Body: { provider: "quickbooks" | "google_drive" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || !["quickbooks", "google_drive"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'quickbooks' or 'google_drive'" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Delete the stored tokens for this provider
    const { error } = await supabase
      .from("oauth_tokens")
      .delete()
      .eq("provider", provider);

    if (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      return NextResponse.json(
        { error: `Failed to disconnect ${provider}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`,
    });
  } catch (error) {
    console.error("Error in disconnect:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}

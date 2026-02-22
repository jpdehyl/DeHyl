import { NextResponse } from "next/server";
import { driveClient } from "@/lib/google-drive/client";
import { parseBidFolder } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const BIDS_FOLDER_ID = "1oBGPQe2rCmNg_g4FMVVPRLdWxMPDcyoH";

export async function POST() {
  const supabase = await createClient();
  let syncLogId: string | null = null;

  try {
    // Log sync start
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({
        source: "google_drive_bids",
        status: "started",
      })
      .select("id")
      .single();
    syncLogId = syncLog?.id || null;

    // Get tokens from Supabase
    const { data: tokenData, error: tokenError } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("provider", "google")
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect in Settings." },
        { status: 401 }
      );
    }

    // Initialize Drive client with stored tokens
    driveClient.setTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(tokenData.expires_at),
    });

    // Persist refreshed tokens back to database
    driveClient.setOnTokenRefresh(async (tokens) => {
      await supabase.from("oauth_tokens").update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("provider", "google");
    });

    // Get client mappings for resolving client names and aliases
    const { data: clientMappings } = await supabase
      .from("client_mappings")
      .select("code, display_name, aliases");

    const clientNameMap = new Map(
      (clientMappings || []).map((m) => [m.code, m.display_name])
    );

    // Build alias → canonical code lookup
    const aliasToCode = new Map<string, string>();
    for (const m of clientMappings || []) {
      aliasToCode.set(m.code.toLowerCase(), m.code);
      for (const alias of m.aliases || []) {
        aliasToCode.set(alias.toLowerCase(), m.code);
      }
    }

    // List bid folders from the Bids folder
    const folders = await driveClient.listProjectFolders(BIDS_FOLDER_ID);

    // Process each folder
    const bids = folders.map((folder) => {
      const parsed = parseBidFolder(folder.name);
      if (!parsed) {
        console.log("Could not parse bid folder name:", folder.name);
        return null;
      }

      // Resolve client code via alias lookup, then get display name
      const canonicalCode = aliasToCode.get(parsed.clientCode.toLowerCase()) || parsed.clientCode;
      const clientName = clientNameMap.get(canonicalCode) || parsed.clientCode;

      return {
        drive_folder_id: folder.id,
        name: parsed.name,
        client_code: canonicalCode,
        client_name: clientName,
        status: "draft", // New bids default to draft
      };
    });

    // Filter out null values (unparseable folders)
    const validBids = bids.filter((b) => b !== null);

    if (validBids.length > 0) {
      const { error: bidsError } = await supabase
        .from("bids")
        .upsert(validBids, { onConflict: "drive_folder_id" });

      if (bidsError) {
        console.error("Failed to upsert bids:", bidsError);
      }
    }

    // Update sync log with success
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          records_synced: validBids.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json({
      success: true,
      bids_synced: validBids.length,
      skipped: folders.length - validBids.length,
    });
  } catch (error) {
    console.error("Bid sync error:", error);

    // Log failed sync
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json(
      { error: "Failed to sync bids" },
      { status: 500 }
    );
  }
}

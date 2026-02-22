import { NextResponse } from "next/server";
import { driveClient } from "@/lib/google-drive/client";
import { parseProjectFolder } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  let syncLogId: string | null = null;

  try {
    // Log sync start
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({
        source: "google_drive",
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

    // Build lookup: code → display_name (exact match)
    const clientNameMap = new Map(
      (clientMappings || []).map((m) => [m.code, m.display_name])
    );

    // Build alias → canonical code lookup (e.g., "Cert Demo" → "CD")
    const aliasToCode = new Map<string, string>();
    for (const m of clientMappings || []) {
      aliasToCode.set(m.code.toLowerCase(), m.code);
      for (const alias of m.aliases || []) {
        aliasToCode.set(alias.toLowerCase(), m.code);
      }
    }

    // List project folders
    const folders = await driveClient.listProjectFolders();

    // Process each folder
    const projects = await Promise.all(
      folders.map(async (folder) => {
        const parsed = parseProjectFolder(folder.name);
        if (!parsed) {
          console.log("Could not parse folder name:", folder.name);
          return null;
        }

        // Check for estimate and PBS
        const hasEstimate = await driveClient.hasEstimateFolder(folder.id);
        const hasPBS = await driveClient.hasPBSFile(folder.id);

        // Resolve client code via alias lookup, then get display name
        const canonicalCode = aliasToCode.get(parsed.clientCode.toLowerCase()) || parsed.clientCode;
        const clientName = clientNameMap.get(canonicalCode) || parsed.clientCode;

        return {
          drive_id: folder.id,
          code: parsed.code,
          client_code: canonicalCode,
          client_name: clientName,
          description: parsed.description,
          status: "active",
          has_pbs: hasPBS,
          estimate_drive_id: hasEstimate ? folder.id : null,
        };
      })
    );

    // Filter out null values (unparseable folders)
    const validProjects = projects.filter((p) => p !== null);

    if (validProjects.length > 0) {
      const { error: projectError } = await supabase
        .from("projects")
        .upsert(validProjects, { onConflict: "drive_id" });

      if (projectError) {
        console.error("Failed to upsert projects:", projectError);
      }
    }

    // Update sync log with success
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          records_synced: validProjects.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json({
      success: true,
      projects_synced: validProjects.length,
      skipped: folders.length - validProjects.length,
    });
  } catch (error) {
    console.error("Project sync error:", error);

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
      { error: "Failed to sync projects" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { driveClient } from "@/lib/google-drive/client";
import { createClient } from "@/lib/supabase/server";

interface EstimateScanResult {
  projectId: string;
  projectCode: string;
  projectName: string;
  hasEstimate: boolean;
  estimateFileId: string | null;
  estimateFileName: string | null;
}

export async function POST() {
  const supabase = await createClient();
  let syncLogId: string | null = null;

  try {
    // Log sync start
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({
        source: "estimates",
        status: "started",
      })
      .select("id")
      .single();
    syncLogId = syncLog?.id || null;

    // Get Google OAuth tokens from Supabase
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

    // Fetch all projects that have a drive_id
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, code, description, drive_id")
      .not("drive_id", "is", null);

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        scanned: 0,
        withEstimates: 0,
        withoutEstimates: 0,
        results: [],
        message: "No projects with Drive folders found. Run 'Sync Projects' first.",
      });
    }

    const results: EstimateScanResult[] = [];
    let withEstimates = 0;
    let withoutEstimates = 0;

    // Process each project (scanning in batches to avoid rate limits)
    for (const project of projects) {
      try {
        const estimateFile = await driveClient.findEstimateFile(project.drive_id);

        const hasEstimate = estimateFile !== null;
        if (hasEstimate) {
          withEstimates++;
        } else {
          withoutEstimates++;
        }

        // Update the project in the database
        await supabase
          .from("projects")
          .update({
            has_estimate: hasEstimate,
            estimate_drive_id: estimateFile?.id || null,
          })
          .eq("id", project.id);

        results.push({
          projectId: project.id,
          projectCode: project.code,
          projectName: project.description || project.code,
          hasEstimate,
          estimateFileId: estimateFile?.id || null,
          estimateFileName: estimateFile?.name || null,
        });
      } catch (err) {
        console.error(`Error scanning project ${project.code}:`, err);
        // Continue with next project even if one fails
        results.push({
          projectId: project.id,
          projectCode: project.code,
          projectName: project.description || project.code,
          hasEstimate: false,
          estimateFileId: null,
          estimateFileName: null,
        });
        withoutEstimates++;
      }
    }

    // Update sync log with success
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          records_synced: projects.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json({
      scanned: projects.length,
      withEstimates,
      withoutEstimates,
      results,
    });
  } catch (error) {
    console.error("Estimate sync error:", error);

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
      { error: "Failed to sync estimates" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { driveClient } from "@/lib/google-drive/client";
import type { PhotoUploadResponse } from "@/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const projectId = formData.get("projectId") as string;
    const files = formData.getAll("photos") as File[];

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No photos provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the project to find its Drive folder ID
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, drive_id, code")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Load Google Drive tokens
    const { data: tokenData } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("provider", "google")
      .single();

    if (!tokenData) {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect in Settings." },
        { status: 401 }
      );
    }

    // Set tokens on the drive client
    driveClient.setTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(tokenData.expires_at),
    });

    // Create Photos folder if it doesn't exist
    const photosFolderId = await driveClient.createOrGetFolder(
      project.drive_id,
      "Photos"
    );

    // Create date folder (YYYY-MM-DD)
    const today = new Date();
    const dateFolder = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const dateFolderId = await driveClient.createOrGetFolder(
      photosFolderId,
      dateFolder
    );

    const response: PhotoUploadResponse = {
      uploaded: [],
      failed: [],
    };

    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          response.failed.push({
            originalName: file.name,
            error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP, HEIC`,
          });
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          response.failed.push({
            originalName: file.name,
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 25MB`,
          });
          continue;
        }

        // Read file content
        const arrayBuffer = await file.arrayBuffer();

        // Upload to Google Drive
        const uploadResult = await driveClient.uploadFile(
          dateFolderId,
          file.name,
          file.type,
          arrayBuffer
        );

        // Generate thumbnail URL
        const thumbnailUrl = driveClient.getThumbnailUrl(uploadResult.id, 200);

        // Insert into database
        const { data: photo, error: insertError } = await supabase
          .from("project_photos")
          .insert({
            project_id: projectId,
            drive_file_id: uploadResult.id,
            drive_folder_id: dateFolderId,
            filename: uploadResult.name,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            thumbnail_url: thumbnailUrl,
            photo_date: dateFolder,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to insert photo record:", insertError);
          response.failed.push({
            originalName: file.name,
            error: "Failed to save photo metadata",
          });
          continue;
        }

        response.uploaded.push({
          id: photo.id,
          driveFileId: uploadResult.id,
          filename: uploadResult.name,
          thumbnailUrl,
        });
      } catch (fileError) {
        console.error(`Failed to upload ${file.name}:`, fileError);
        response.failed.push({
          originalName: file.name,
          error: fileError instanceof Error ? fileError.message : "Upload failed",
        });
      }
    }

    // Return appropriate status based on results
    if (response.uploaded.length === 0 && response.failed.length > 0) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

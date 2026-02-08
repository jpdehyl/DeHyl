import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PhotoUploadResponse, PhotoCategory } from "@/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const projectId = formData.get("projectId") as string;
    const category = (formData.get("category") as PhotoCategory) || "other";
    const area = formData.get("area") as string | null;
    const notes = formData.get("notes") as string | null;
    const dailyLogId = formData.get("dailyLogId") as string | null;
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

    const response: PhotoUploadResponse = {
      uploaded: [],
      failed: [],
    };

    const today = new Date().toISOString().split("T")[0];

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

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split(".").pop() || "jpg";
        const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        
        // Storage path: projects/{projectCode}/{date}/{filename}
        const storagePath = `projects/${project.code}/${today}/${uniqueFilename}`;

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("project-photos")
          .upload(storagePath, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          response.failed.push({
            originalName: file.name,
            error: uploadError.message || "Failed to upload to storage",
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("project-photos")
          .getPublicUrl(storagePath);

        const storageUrl = urlData.publicUrl;

        // Insert into database
        const { data: photo, error: insertError } = await supabase
          .from("project_photos")
          .insert({
            project_id: projectId,
            storage_path: storagePath,
            storage_url: storageUrl,
            filename: uniqueFilename,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            thumbnail_url: storageUrl, // Use same URL for now
            photo_date: today,
            category: category,
            area: area,
            notes: notes,
            daily_log_id: dailyLogId,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to insert photo record:", insertError);
          // Try to clean up the uploaded file
          await supabase.storage.from("project-photos").remove([storagePath]);
          
          response.failed.push({
            originalName: file.name,
            error: "Failed to save photo metadata",
          });
          continue;
        }

        response.uploaded.push({
          id: photo.id,
          storagePath: storagePath,
          storageUrl: storageUrl,
          filename: uniqueFilename,
          thumbnailUrl: storageUrl,
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

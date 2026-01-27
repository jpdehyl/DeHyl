import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectPhoto, PhotoListResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const dateFilter = searchParams.get("date"); // YYYY-MM-DD format

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("project_photos")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false });

    // Apply date filter if provided
    if (dateFilter) {
      query = query.eq("photo_date", dateFilter);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: photos, error, count } = await query;

    if (error) {
      console.error("Failed to fetch photos:", error);
      return NextResponse.json(
        { error: "Failed to fetch photos" },
        { status: 500 }
      );
    }

    // Get distinct dates for the filter dropdown
    const { data: dateData } = await supabase
      .from("project_photos")
      .select("photo_date")
      .eq("project_id", projectId)
      .not("photo_date", "is", null)
      .order("photo_date", { ascending: false });

    // Extract unique dates
    const dates = [...new Set(dateData?.map(d => d.photo_date) || [])];

    // Transform to ProjectPhoto type
    const transformedPhotos: ProjectPhoto[] = (photos || []).map((photo) => ({
      id: photo.id,
      projectId: photo.project_id,
      driveFileId: photo.drive_file_id,
      driveFolderId: photo.drive_folder_id,
      filename: photo.filename,
      originalFilename: photo.original_filename,
      fileSize: photo.file_size,
      mimeType: photo.mime_type,
      thumbnailUrl: photo.thumbnail_url,
      photoDate: photo.photo_date ? new Date(photo.photo_date) : null,
      uploadedAt: new Date(photo.uploaded_at),
      createdAt: new Date(photo.created_at),
    }));

    const response: PhotoListResponse = {
      photos: transformedPhotos,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
      dates,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Photo list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list photos" },
      { status: 500 }
    );
  }
}

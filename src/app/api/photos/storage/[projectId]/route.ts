import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectPhoto, PhotoListResponse, PhotoCategory } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const dateFilter = searchParams.get("date");
    const categoryFilter = searchParams.get("category") as PhotoCategory | null;
    const areaFilter = searchParams.get("area");

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("project_photos")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .not("storage_path", "is", null) // Only Supabase Storage photos
      .order("uploaded_at", { ascending: false });

    // Apply filters
    if (dateFilter) {
      query = query.eq("photo_date", dateFilter);
    }
    if (categoryFilter) {
      query = query.eq("category", categoryFilter);
    }
    if (areaFilter) {
      query = query.eq("area", areaFilter);
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

    // Get distinct dates for filter dropdown
    const { data: dateData } = await supabase
      .from("project_photos")
      .select("photo_date")
      .eq("project_id", projectId)
      .not("storage_path", "is", null)
      .not("photo_date", "is", null)
      .order("photo_date", { ascending: false });

    const dates = [...new Set(dateData?.map(d => d.photo_date) || [])];

    // Get distinct categories
    const { data: categoryData } = await supabase
      .from("project_photos")
      .select("category")
      .eq("project_id", projectId)
      .not("storage_path", "is", null)
      .not("category", "is", null);

    const categories = [...new Set(categoryData?.map(c => c.category) || [])] as PhotoCategory[];

    // Transform to ProjectPhoto type
    const transformedPhotos: ProjectPhoto[] = (photos || []).map((photo) => ({
      id: photo.id,
      projectId: photo.project_id,
      driveFileId: photo.drive_file_id,
      driveFolderId: photo.drive_folder_id,
      storagePath: photo.storage_path,
      storageUrl: photo.storage_url,
      filename: photo.filename,
      originalFilename: photo.original_filename,
      fileSize: photo.file_size,
      mimeType: photo.mime_type,
      thumbnailUrl: photo.thumbnail_url || photo.storage_url,
      photoDate: photo.photo_date ? new Date(photo.photo_date) : null,
      category: photo.category || "other",
      latitude: photo.latitude,
      longitude: photo.longitude,
      notes: photo.notes,
      dailyLogId: photo.daily_log_id,
      area: photo.area,
      uploadedBy: photo.uploaded_by,
      uploadedAt: new Date(photo.uploaded_at),
      createdAt: new Date(photo.created_at),
    }));

    const response: PhotoListResponse = {
      photos: transformedPhotos,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
      dates,
      categories,
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

// DELETE endpoint to remove a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get photo record
    const { data: photo, error: fetchError } = await supabase
      .from("project_photos")
      .select("*")
      .eq("id", photoId)
      .eq("project_id", projectId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete from storage if it exists
    if (photo.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("project-photos")
        .remove([photo.storage_path]);

      if (storageError) {
        console.error("Failed to delete from storage:", storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("project_photos")
      .delete()
      .eq("id", photoId);

    if (deleteError) {
      console.error("Failed to delete photo record:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete photo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Photo delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete photo" },
      { status: 500 }
    );
  }
}

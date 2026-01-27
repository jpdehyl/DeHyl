import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Get distinct dates for this project
    const { data, error } = await supabase
      .from("project_photos")
      .select("photo_date")
      .eq("project_id", projectId)
      .not("photo_date", "is", null)
      .order("photo_date", { ascending: false });

    if (error) {
      console.error("Failed to fetch photo dates:", error);
      return NextResponse.json(
        { error: "Failed to fetch dates" },
        { status: 500 }
      );
    }

    // Extract unique dates
    const dates = [...new Set(data?.map(d => d.photo_date) || [])];

    return NextResponse.json({ dates });
  } catch (error) {
    console.error("Photo dates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dates" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStorySummary, StorySummariesResponse } from "@/types/stories";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, code, client_code, client_name, description, status, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get a thumbnail for each project (most recent photo)
    const projectIds = (projects || []).map((p) => p.id);
    const { data: photos } = await supabase
      .from("project_photos")
      .select("project_id, thumbnail_url, storage_url")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    const thumbnailMap = new Map<string, string>();
    for (const photo of photos || []) {
      if (!thumbnailMap.has(photo.project_id)) {
        thumbnailMap.set(photo.project_id, photo.thumbnail_url || photo.storage_url || "");
      }
    }

    // Count stages with data for each project (lightweight check)
    const summaries: ProjectStorySummary[] = (projects || []).map((p) => ({
      projectId: p.id,
      projectCode: p.code || "",
      projectName: p.description || "",
      clientName: p.client_name || "",
      clientCode: p.client_code || "",
      status: p.status as "active" | "closed",
      thumbnailUrl: thumbnailMap.get(p.id) || null,
      lastUpdated: new Date(p.updated_at),
      stageCount: 0, // Will be determined when full story is loaded
      currentStageName: p.status === "active" ? "In Progress" : "Completed",
    }));

    const response: StorySummariesResponse = { projects: summaries };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Stories API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch project stories" },
      { status: 500 }
    );
  }
}

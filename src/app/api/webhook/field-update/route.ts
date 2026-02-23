import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FieldEntry {
  type: "photo" | "voice_note" | "video" | "document" | "text";
  content?: string;
  mediaUrl?: string;
  mimeType?: string;
  transcript?: string;
}

interface FieldUpdatePayload {
  projectCode: string;
  source: "whatsapp" | "email" | "sms";
  sender: {
    name: string;
    phone?: string;
    email?: string;
  };
  timestamp: string;
  entries: FieldEntry[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get("x-webhook-secret");
    if (secret !== process.env.FIELD_UPDATE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload: FieldUpdatePayload = await request.json();
    const { projectCode, source, sender, timestamp, entries } = payload;

    // Find project by code
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("code", projectCode)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: `Project not found: ${projectCode}` },
        { status: 404 }
      );
    }

    const projectId = project.id;
    const results = { photos: 0, activities: 0, errors: [] as string[] };

    for (const entry of entries) {
      try {
        if (entry.type === "photo" || entry.type === "video") {
          // Add to project_photos
          const { error } = await supabase.from("project_photos").insert({
            project_id: projectId,
            url: entry.mediaUrl,
            thumbnail_url: entry.mediaUrl,
            caption: entry.content || `${source} upload from ${sender.name}`,
            taken_at: timestamp,
            uploaded_by: sender.name,
            category: "progress",
            source: source,
          });
          if (error) throw error;
          results.photos++;
        } else if (entry.type === "voice_note") {
          // Add as activity with audio URL
          const { error } = await supabase.from("activities").insert({
            project_id: projectId,
            activity_type: "daily_log",
            activity_date: timestamp,
            title: `Voice note from ${sender.name}`,
            description: entry.transcript || entry.content || "Voice note",
            metadata: {
              source,
              senderName: sender.name,
              senderPhone: sender.phone,
              audioUrl: entry.mediaUrl,
              hasTranscript: !!entry.transcript,
            },
          });
          if (error) throw error;
          results.activities++;
        } else if (entry.type === "text") {
          // Add as activity/note
          const { error } = await supabase.from("activities").insert({
            project_id: projectId,
            activity_type: "daily_log",
            activity_date: timestamp,
            title: `Field update from ${sender.name}`,
            description: entry.content,
            metadata: {
              source,
              senderName: sender.name,
              senderPhone: sender.phone,
            },
          });
          if (error) throw error;
          results.activities++;
        } else if (entry.type === "document") {
          // Add as file activity
          const { error } = await supabase.from("activities").insert({
            project_id: projectId,
            activity_type: "file",
            activity_date: timestamp,
            title: `Document from ${sender.name}`,
            description: entry.content || "Document uploaded",
            metadata: {
              source,
              senderName: sender.name,
              fileUrl: entry.mediaUrl,
              mimeType: entry.mimeType,
            },
          });
          if (error) throw error;
          results.activities++;
        }
      } catch (err) {
        results.errors.push(
          `Failed to process ${entry.type}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      projectCode,
      projectId,
      processed: {
        photos: results.photos,
        activities: results.activities,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("Field update webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "field-update",
    accepts: ["photo", "voice_note", "video", "document", "text"],
  });
}

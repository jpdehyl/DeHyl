import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PortalResponse, PortalActivity, PortalPhoto, PortalSettings } from "@/types";

// Rate limiting: Simple in-memory store (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  record.count++;
  if (record.count > RATE_LIMIT) {
    return true;
  }

  return false;
}

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { code } = await params;

  if (!code || code.length < 8) {
    return NextResponse.json(
      { error: "Invalid access code" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Fetch project by portal access code
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("portal_access_code", code)
    .eq("portal_enabled", true)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found or portal access is disabled" },
      { status: 404 }
    );
  }

  // Parse portal settings
  const settings: PortalSettings = project.portal_settings || {
    showTimeline: true,
    showPhotos: true,
    showDocuments: false,
    showFinancials: false,
    showContacts: false,
    clientMessage: "",
  };

  // Build response with filtered data
  const response: PortalResponse = {
    project: {
      name: `${project.code} - ${project.description}`,
      clientName: project.client_name || project.client_code,
      description: project.description || "",
      status: project.status as "active" | "closed",
      clientMessage: settings.clientMessage || undefined,
    },
    lastUpdated: project.updated_at,
  };

  // Fetch timeline if enabled
  if (settings.showTimeline) {
    // Fetch from project_updates (manual updates + Robbie-created)
    const { data: updates } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", project.id)
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false })
      .limit(20);

    // Also fetch safe activities from project_activities
    const { data: activities } = await supabase
      .from("project_activities")
      .select("*")
      .eq("project_id", project.id)
      .order("activity_date", { ascending: false })
      .limit(20);

    // Merge both sources into timeline
    const timelineItems: PortalActivity[] = [];

    // Add project_updates
    (updates || []).forEach((upd) => {
      timelineItems.push({
        id: upd.id,
        type: (upd.update_type || "note") as PortalActivity["type"],
        title: upd.title || "Update",
        description: upd.content || undefined,
        date: new Date(upd.created_at),
      });
    });

    // Add safe activities (emails sanitized, no financials)
    const safeActivityTypes = ["note", "status_change", "file"];
    (activities || []).forEach((act) => {
      if (safeActivityTypes.includes(act.activity_type)) {
        timelineItems.push({
          id: act.id,
          type: act.activity_type as PortalActivity["type"],
          title: act.title,
          description: act.description || undefined,
          date: new Date(act.activity_date),
        });
      } else if (act.activity_type === "email") {
        timelineItems.push({
          id: act.id,
          type: "note" as const,
          title: `Email from ${act.email_from || "client"}`,
          description: undefined,
          date: new Date(act.activity_date),
        });
      } else if ((act.activity_type === "invoice" || act.activity_type === "bill") && settings.showFinancials) {
        timelineItems.push({
          id: act.id,
          type: act.activity_type as PortalActivity["type"],
          title: act.title,
          description: act.description || undefined,
          date: new Date(act.activity_date),
        });
      }
    });

    // Sort by date descending and limit
    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    response.timeline = timelineItems.slice(0, 30);
  }

  // Fetch photos if enabled
  if (settings.showPhotos) {
    // Photos would come from activities with type='photo' or from a separate photos table
    // For now, we'll extract from activities metadata
    const { data: photoActivities } = await supabase
      .from("project_activities")
      .select("*")
      .eq("project_id", project.id)
      .eq("activity_type", "file")
      .order("activity_date", { ascending: false })
      .limit(20);

    const photos: PortalPhoto[] = (photoActivities || [])
      .filter((act) => {
        // Check if it's an image file
        const metadata = act.metadata as Record<string, unknown> | null;
        const mimeType = metadata?.mimeType as string | undefined;
        return mimeType?.startsWith("image/");
      })
      .map((act) => {
        const metadata = act.metadata as Record<string, unknown> | null;
        return {
          id: act.id,
          url: (metadata?.webViewLink as string) || "",
          thumbnailUrl: (metadata?.thumbnailLink as string) || undefined,
          caption: act.title,
          date: new Date(act.activity_date),
        };
      });

    if (photos.length > 0) {
      response.photos = photos;
    }
  }

  return NextResponse.json(response);
}

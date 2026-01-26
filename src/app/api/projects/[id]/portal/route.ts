import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PortalManagementResponse, PortalSettings } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get current portal settings
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("portal_enabled, portal_access_code, portal_settings")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = project.portal_access_code
    ? `${baseUrl}/portal/${project.portal_access_code}`
    : null;

  const response: PortalManagementResponse = {
    enabled: project.portal_enabled || false,
    accessCode: project.portal_access_code || null,
    portalUrl,
    settings: project.portal_settings || {
      showTimeline: true,
      showPhotos: true,
      showDocuments: false,
      showFinancials: false,
      showContacts: false,
      clientMessage: "",
    },
  };

  return NextResponse.json(response);
}

// POST - Enable portal and generate access code
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const supabase = await createClient();

  // Generate a new access code
  const { data: codeResult, error: codeError } = await supabase
    .rpc("generate_portal_code");

  if (codeError) {
    console.error("Failed to generate portal code:", codeError);
    return NextResponse.json(
      { error: "Failed to generate access code" },
      { status: 500 }
    );
  }

  const accessCode = codeResult as string;

  // Update project with portal enabled and access code
  const { data: project, error: updateError } = await supabase
    .from("projects")
    .update({
      portal_enabled: true,
      portal_access_code: accessCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("portal_enabled, portal_access_code, portal_settings")
    .single();

  if (updateError) {
    console.error("Failed to enable portal:", updateError);
    return NextResponse.json(
      { error: "Failed to enable portal" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${baseUrl}/portal/${accessCode}`;

  const response: PortalManagementResponse = {
    enabled: true,
    accessCode,
    portalUrl,
    settings: project.portal_settings || {
      showTimeline: true,
      showPhotos: true,
      showDocuments: false,
      showFinancials: false,
      showContacts: false,
      clientMessage: "",
    },
  };

  return NextResponse.json(response);
}

// PATCH - Update portal settings
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  // Build update object
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Handle settings update
  if (body.settings) {
    const validSettings: Partial<PortalSettings> = {};
    const settingsKeys: (keyof PortalSettings)[] = [
      "showTimeline",
      "showPhotos",
      "showDocuments",
      "showFinancials",
      "showContacts",
      "clientMessage",
    ];

    for (const key of settingsKeys) {
      if (body.settings[key] !== undefined) {
        validSettings[key] = body.settings[key];
      }
    }

    // Get current settings and merge
    const { data: current } = await supabase
      .from("projects")
      .select("portal_settings")
      .eq("id", id)
      .single();

    updates.portal_settings = {
      ...(current?.portal_settings || {}),
      ...validSettings,
    };
  }

  // Handle enabled toggle
  if (typeof body.enabled === "boolean") {
    updates.portal_enabled = body.enabled;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select("portal_enabled, portal_access_code, portal_settings")
    .single();

  if (error) {
    console.error("Failed to update portal settings:", error);
    return NextResponse.json(
      { error: "Failed to update portal settings" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = project.portal_access_code
    ? `${baseUrl}/portal/${project.portal_access_code}`
    : null;

  const response: PortalManagementResponse = {
    enabled: project.portal_enabled || false,
    accessCode: project.portal_access_code || null,
    portalUrl,
    settings: project.portal_settings || {
      showTimeline: true,
      showPhotos: true,
      showDocuments: false,
      showFinancials: false,
      showContacts: false,
      clientMessage: "",
    },
  };

  return NextResponse.json(response);
}

// DELETE - Disable portal and revoke access code
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({
      portal_enabled: false,
      portal_access_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to disable portal:", error);
    return NextResponse.json(
      { error: "Failed to disable portal" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    enabled: false,
    accessCode: null,
    portalUrl: null,
    settings: {
      showTimeline: true,
      showPhotos: true,
      showDocuments: false,
      showFinancials: false,
      showContacts: false,
      clientMessage: "",
    },
  });
}

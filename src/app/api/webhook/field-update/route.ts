import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const VALID_SOURCES = ["whatsapp", "email", "sms", "imessage"] as const;
const VALID_ENTRY_TYPES = [
  "text",
  "photo",
  "voice_note",
  "video",
  "document",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

function authenticate(request: NextRequest): boolean {
  const secret = process.env.FIELD_UPDATE_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("x-webhook-secret");
  return provided === secret;
}

interface EntryPayload {
  type: (typeof VALID_ENTRY_TYPES)[number];
  content?: string;
  mediaBase64?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  classification?: string;
}

interface FieldUpdatePayload {
  projectCode: string;
  source: (typeof VALID_SOURCES)[number];
  sender: {
    name: string;
    phone?: string;
    email?: string;
  };
  timestamp: string;
  entries: EntryPayload[];
  sourceMessageId?: string;
}

/**
 * POST /api/webhook/field-update
 * Receives field updates from WhatsApp/email/SMS via the EC2 collector.
 * Handles mixed-media messages: text, photos, voice notes, videos, documents.
 * Uploads media to Supabase Storage and stores metadata in field_updates table.
 */
export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid X-Webhook-Secret header." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: FieldUpdatePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectCode, source, sender, timestamp, entries, sourceMessageId } =
    body;

  // Validate required fields
  if (!projectCode || !/^\d{7}$/.test(projectCode)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid projectCode. Must be exactly 7 digits (e.g. '2601007').",
      },
      { status: 400 }
    );
  }

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      {
        error: `Missing or invalid source. Must be one of: ${VALID_SOURCES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (!sender?.name) {
    return NextResponse.json(
      { error: "Missing required field: sender.name" },
      { status: 400 }
    );
  }

  if (!timestamp) {
    return NextResponse.json(
      { error: "Missing required field: timestamp (ISO 8601 format)" },
      { status: 400 }
    );
  }

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty entries array. At least one entry required." },
      { status: 400 }
    );
  }

  // Validate entry types
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.type || !VALID_ENTRY_TYPES.includes(entry.type)) {
      return NextResponse.json(
        {
          error: `Invalid entry type at index ${i}. Must be one of: ${VALID_ENTRY_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (entry.type === "text" && !entry.content) {
      return NextResponse.json(
        { error: `Text entry at index ${i} must have content.` },
        { status: 400 }
      );
    }
  }

  // Look up project by code
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, code, client_name, description")
    .eq("code", projectCode)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      {
        error: `Project not found with code '${projectCode}'. Make sure the project exists and the code matches exactly.`,
      },
      { status: 404 }
    );
  }

  // Process entries: upload media to Supabase Storage where applicable
  const today = new Date().toISOString().split("T")[0];
  let mediaUploaded = 0;
  const processedEntries: Array<{
    type: string;
    content?: string;
    mediaUrl?: string;
    mimeType?: string;
    fileName?: string;
    classification?: string;
  }> = [];

  for (const entry of entries) {
    const processed: (typeof processedEntries)[number] = {
      type: entry.type,
      content: entry.content,
      mimeType: entry.mimeType,
      fileName: entry.fileName,
      classification: entry.classification,
    };

    if (entry.mediaBase64 && entry.mimeType) {
      // Upload to Supabase Storage
      const ext = MIME_TO_EXT[entry.mimeType] || "bin";
      const fileId = randomUUID();
      const storagePath = `${projectCode}/${today}/${fileId}.${ext}`;

      const buffer = Buffer.from(entry.mediaBase64, "base64");
      const { error: uploadError } = await supabase.storage
        .from("field-updates")
        .upload(storagePath, buffer, {
          contentType: entry.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error(
          `Failed to upload media for entry: ${uploadError.message}`
        );
        // Non-fatal — continue with other entries, store without URL
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("field-updates").getPublicUrl(storagePath);
        processed.mediaUrl = publicUrl;
        mediaUploaded++;
      }
    } else if (entry.mediaUrl) {
      // Pass through existing URL
      processed.mediaUrl = entry.mediaUrl;
    }

    processedEntries.push(processed);
  }

  // Insert into field_updates table
  const { data: fieldUpdate, error: insertError } = await supabase
    .from("field_updates")
    .insert({
      project_id: project.id,
      source,
      sender_name: sender.name,
      sender_phone: sender.phone || null,
      sender_email: sender.email || null,
      message_timestamp: timestamp,
      entries: processedEntries,
      source_message_id: sourceMessageId || null,
      status: "received",
    })
    .select()
    .single();

  if (insertError) {
    console.error("Field update insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create field update" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      fieldUpdate: {
        id: fieldUpdate.id,
        projectCode,
        entriesCount: processedEntries.length,
        mediaUploaded,
      },
      project: {
        id: project.id,
        code: project.code,
        clientName: project.client_name,
        description: project.description,
      },
    },
    { status: 201 }
  );
}

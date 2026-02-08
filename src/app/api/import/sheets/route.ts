import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SPREADSHEET_ID = "1cA_T2pzaG9lfo7I3rF5UqmUi2Q8eEce3bM1J61tPiuw";
const SHEET_GID = 2142241593;
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

interface SheetRow {
  vendor: string;
  serviceDate: string;
  project: string;
  qbLinked: boolean;
  invoiceNumber: string;
  amountWithGst: number;
  dateIssued: string;
  dueDate: string;
  status: string;
}

// Helper to get Google access token from DB
async function getGoogleToken() {
  const supabase = await createClient();
  const { data: token } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("provider", "google")
    .single();

  if (!token) return null;

  // Check if token is expired and refresh if needed
  if (new Date(token.expires_at) <= new Date()) {
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: token.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) return null;
    const refreshData = await refreshResponse.json();

    await supabase
      .from("oauth_tokens")
      .update({
        access_token: refreshData.access_token,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      })
      .eq("provider", "google");

    return refreshData.access_token;
  }

  return token.access_token;
}

// Helper to find sheet name by gid
async function getSheetName(accessToken: string): Promise<string | null> {
  const res = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;
  const data = await res.json();

  const sheet = data.sheets?.find(
    (s: { properties: { sheetId: number } }) => s.properties.sheetId === SHEET_GID
  );

  return sheet?.properties?.title || null;
}

// Parse date strings like "Jan 15, 2025" or "2025-01-15" or "1/15/2025"
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

// Parse amount like "$1,234.56" or "1234.56"
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// GET /api/import/sheets - Preview data from the spreadsheet
export async function GET() {
  try {
    const accessToken = await getGoogleToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Google not connected. Please connect Google Drive in Settings." },
        { status: 401 }
      );
    }

    const sheetName = await getSheetName(accessToken);
    if (!sheetName) {
      return NextResponse.json(
        { error: "Could not find the Control Payables sheet. Check the spreadsheet ID and gid." },
        { status: 404 }
      );
    }

    // Fetch all data from the sheet
    const range = encodeURIComponent(`${sheetName}!A:I`);
    const res = await fetch(
      `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${range}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("Sheets API error:", error);
      return NextResponse.json(
        { error: "Failed to read spreadsheet. You may need to re-authorize with Google." },
        { status: 500 }
      );
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    if (rows.length < 2) {
      return NextResponse.json({ rows: [], sheetName, totalRows: 0 });
    }

    // First row is headers, rest is data
    const headers = rows[0];
    const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell?.trim()));

    // Parse rows into structured data
    // Expected columns: Vendor, Service Date, Project, QB, Invoice Number, Amount with GST, Date Issued, Due Date, Status
    const parsed: SheetRow[] = dataRows.map((row) => ({
      vendor: (row[0] || "").trim(),
      serviceDate: (row[1] || "").trim(),
      project: (row[2] || "").trim(),
      qbLinked: (row[3] || "").toLowerCase() === "yes" || (row[3] || "").toLowerCase() === "true" || row[3] === "✓",
      invoiceNumber: (row[4] || "").trim(),
      amountWithGst: parseAmount(row[5] || ""),
      dateIssued: (row[6] || "").trim(),
      dueDate: (row[7] || "").trim(),
      status: (row[8] || "").trim(),
    }));

    // Filter out rows that are clearly empty or invalid
    const validRows = parsed.filter(
      (row) => row.vendor && row.amountWithGst > 0
    );

    // Get projects from Supabase for matching
    const supabase = await createClient();
    const { data: projects } = await supabase
      .from("projects")
      .select("id, code, client_name, description")
      .order("code", { ascending: false });

    // Try to match each row to a project
    const rowsWithMatches = validRows.map((row) => {
      let matchedProject: { id: string; code: string; client_name: string; description: string } | null = null;

      if (projects && row.project) {
        const projectStr = row.project.toLowerCase();
        // Try exact code match first
        matchedProject = projects.find(
          (p) => p.code.toLowerCase() === projectStr
        ) || null;

        // Try partial match on code, client name, or description
        if (!matchedProject) {
          matchedProject = projects.find(
            (p) =>
              projectStr.includes(p.code.toLowerCase()) ||
              projectStr.includes(p.client_name?.toLowerCase() || "") ||
              (p.description && projectStr.includes(p.description.toLowerCase())) ||
              p.code.toLowerCase().includes(projectStr) ||
              (p.client_name?.toLowerCase() || "").includes(projectStr) ||
              (p.description?.toLowerCase() || "").includes(projectStr)
          ) || null;
        }
      }

      return {
        ...row,
        matchedProjectId: matchedProject?.id || null,
        matchedProjectCode: matchedProject?.code || null,
        matchedProjectName: matchedProject
          ? `${matchedProject.code} - ${matchedProject.client_name}`
          : null,
      };
    });

    return NextResponse.json({
      headers,
      rows: rowsWithMatches,
      sheetName,
      totalRows: rowsWithMatches.length,
      projects: (projects || []).map((p) => ({
        id: p.id,
        code: p.code,
        clientName: p.client_name,
        description: p.description,
      })),
    });
  } catch (error) {
    console.error("Sheets import preview error:", error);
    return NextResponse.json(
      { error: "Failed to load spreadsheet data" },
      { status: 500 }
    );
  }
}

// POST /api/import/sheets - Import selected rows into project_costs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body as {
      rows: Array<{
        vendor: string;
        serviceDate: string;
        project: string;
        invoiceNumber: string;
        amountWithGst: number;
        dateIssued: string;
        dueDate: string;
        status: string;
        qbLinked: boolean;
        matchedProjectId: string | null;
        overrideProjectId?: string;
      }>;
    };

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows to import" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const projectId = row.overrideProjectId || row.matchedProjectId;
      if (!projectId) {
        skipped++;
        continue;
      }

      const costDate = parseDate(row.serviceDate) || parseDate(row.dateIssued);
      if (!costDate) {
        errors.push(`Skipped "${row.vendor} - ${row.invoiceNumber}": no valid date`);
        skipped++;
        continue;
      }

      // Determine status based on QB linked and row status
      let costStatus = "unlinked";
      if (row.qbLinked) {
        costStatus = "invoiced";
      }
      if (row.status?.toLowerCase() === "paid") {
        costStatus = "collected";
      }

      const { error: insertError } = await supabase
        .from("project_costs")
        .insert({
          project_id: projectId,
          description: `${row.vendor}${row.invoiceNumber ? ` - Inv #${row.invoiceNumber}` : ""}`,
          amount: row.amountWithGst,
          cost_date: costDate,
          category: "subcontractor",
          vendor: row.vendor,
          status: costStatus,
          notes: `Imported from Control Payables sheet. Invoice: ${row.invoiceNumber || "N/A"}. Due: ${row.dueDate || "N/A"}.`,
        });

      if (insertError) {
        errors.push(`Failed to import "${row.vendor}": ${insertError.message}`);
        skipped++;
      } else {
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Sheets import error:", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    );
  }
}

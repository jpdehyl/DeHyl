import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { qbClient } from "@/lib/quickbooks/client";
import { driveClient } from "@/lib/google-drive/client";
import { parseProjectFolder } from "@/lib/utils";

// Verify cron secret for Vercel Cron
const CRON_SECRET = process.env.CRON_SECRET;

interface QBInvoice {
  Id: string;
  DocNumber?: string;
  CustomerRef?: { name?: string; value?: string };
  TotalAmt: string;
  Balance: string;
  TxnDate: string;
  DueDate: string;
  PrivateNote?: string;
}

interface QBBill {
  Id: string;
  VendorRef?: { name?: string; value?: string };
  TotalAmt: string;
  Balance: string;
  TxnDate: string;
  DueDate: string;
  PrivateNote?: string;
}

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Support source filter: ?source=quickbooks or ?source=google_drive
  const { searchParams } = new URL(request.url);
  const sourceFilter = searchParams.get("source");

  const supabase = await createClient();
  const results = {
    quickbooks: { success: false, invoices: 0, bills: 0, error: null as string | null },
    googleDrive: { success: false, projects: 0, error: null as string | null },
  };

  // Sync QuickBooks (skip if source filter is set to google_drive only)
  if (!sourceFilter || sourceFilter === "quickbooks") try {
    const { data: qbToken } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("provider", "quickbooks")
      .single();

    if (qbToken) {
      qbClient.setTokens({
        accessToken: qbToken.access_token,
        refreshToken: qbToken.refresh_token,
        expiresAt: new Date(qbToken.expires_at),
        realmId: qbToken.realm_id,
      });

      // Sync invoices
      const invoices = (await qbClient.getOpenInvoices()) as unknown as QBInvoice[];
      const mappedInvoices = invoices.map((inv) => {
        const balance = parseFloat(inv.Balance);
        const dueDate = inv.DueDate ? new Date(inv.DueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && balance > 0;
        return {
          qb_id: inv.Id,
          invoice_number: inv.DocNumber || null,
          client_name: inv.CustomerRef?.name || "Unknown",
          amount: parseFloat(inv.TotalAmt),
          balance,
          issue_date: inv.TxnDate || null,
          due_date: inv.DueDate || null,
          status: balance === 0 ? "paid" : isOverdue ? "overdue" : "sent",
          memo: inv.PrivateNote || null,
          synced_at: new Date().toISOString(),
        };
      });

      if (mappedInvoices.length > 0) {
        await supabase.from("invoices").upsert(mappedInvoices, { onConflict: "qb_id" });
      }

      // Sync bills
      const bills = (await qbClient.getOpenBills()) as unknown as QBBill[];
      const mappedBills = bills.map((bill) => {
        const balance = parseFloat(bill.Balance);
        const dueDate = bill.DueDate ? new Date(bill.DueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && balance > 0;
        return {
          qb_id: bill.Id,
          vendor_name: bill.VendorRef?.name || "Unknown",
          amount: parseFloat(bill.TotalAmt),
          balance,
          bill_date: bill.TxnDate || null,
          due_date: bill.DueDate || null,
          status: balance === 0 ? "paid" : isOverdue ? "overdue" : "open",
          memo: bill.PrivateNote || null,
          synced_at: new Date().toISOString(),
        };
      });

      if (mappedBills.length > 0) {
        // Get bills with manual_override to exclude from sync
        const { data: overriddenBills } = await supabase
          .from("bills")
          .select("qb_id")
          .eq("manual_override", true);

        const overriddenQbIds = new Set((overriddenBills || []).map((b: { qb_id: string }) => b.qb_id));
        const billsToSync = mappedBills.filter((b) => !overriddenQbIds.has(b.qb_id));

        if (billsToSync.length > 0) {
          await supabase.from("bills").upsert(billsToSync, { onConflict: "qb_id" });
        }
      }

      // Log sync
      await supabase.from("sync_log").insert({
        source: "quickbooks",
        status: "completed",
        records_synced: invoices.length + bills.length,
        completed_at: new Date().toISOString(),
      });

      results.quickbooks = { success: true, invoices: invoices.length, bills: bills.length, error: null };
    }
  } catch (error) {
    results.quickbooks.error = error instanceof Error ? error.message : "Unknown error";
    await supabase.from("sync_log").insert({
      source: "quickbooks",
      status: "failed",
      error_message: results.quickbooks.error,
      completed_at: new Date().toISOString(),
    });
  }

  // Sync Google Drive Projects (skip if source filter is set to quickbooks only)
  if (!sourceFilter || sourceFilter === "google_drive") try {
    const { data: googleToken } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("provider", "google")
      .single();

    if (googleToken) {
      driveClient.setTokens({
        accessToken: googleToken.access_token,
        refreshToken: googleToken.refresh_token,
        expiresAt: new Date(googleToken.expires_at),
      });

      // Get client mappings
      const { data: clientMappings } = await supabase
        .from("client_mappings")
        .select("code, display_name");
      const clientNameMap = new Map(
        (clientMappings || []).map((m) => [m.code, m.display_name])
      );

      // List and process folders
      const folders = await driveClient.listProjectFolders();
      const projects = await Promise.all(
        folders.map(async (folder) => {
          const parsed = parseProjectFolder(folder.name);
          if (!parsed) return null;
          const hasEstimate = await driveClient.hasEstimateFolder(folder.id);
          const hasPBS = await driveClient.hasPBSFile(folder.id);
          const clientName = clientNameMap.get(parsed.clientCode) || parsed.clientCode;
          return {
            drive_id: folder.id,
            code: parsed.code,
            client_code: parsed.clientCode,
            client_name: clientName,
            description: parsed.description,
            status: "active",
            has_pbs: hasPBS,
            estimate_drive_id: hasEstimate ? folder.id : null,
          };
        })
      );

      const validProjects = projects.filter((p) => p !== null);
      if (validProjects.length > 0) {
        await supabase.from("projects").upsert(validProjects, { onConflict: "drive_id" });
      }

      // Log sync
      await supabase.from("sync_log").insert({
        source: "google_drive",
        status: "completed",
        records_synced: validProjects.length,
        completed_at: new Date().toISOString(),
      });

      results.googleDrive = { success: true, projects: validProjects.length, error: null };
    }
  } catch (error) {
    results.googleDrive.error = error instanceof Error ? error.message : "Unknown error";
    await supabase.from("sync_log").insert({
      source: "google_drive",
      status: "failed",
      error_message: results.googleDrive.error,
      completed_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

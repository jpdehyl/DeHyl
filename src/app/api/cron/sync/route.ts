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

interface SyncConflict {
  source: string;
  entity_type: string;
  entity_id: string;
  external_id: string;
  field_name: string;
  app_value: string | null;
  external_value: string | null;
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
    quickbooks: { success: false, invoices: 0, bills: 0, conflicts: 0, error: null as string | null },
    googleDrive: { success: false, projects: 0, conflicts: 0, error: null as string | null },
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

      const conflicts: SyncConflict[] = [];

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
        // Get invoices with manual_override to handle separately
        const { data: overriddenInvoices } = await supabase
          .from("invoices")
          .select("id, qb_id, project_id, client_name, amount")
          .eq("manual_override", true);

        const overriddenInvoiceMap = new Map(
          (overriddenInvoices || []).map((inv) => [inv.qb_id, inv])
        );

        // Split into overridden vs normal
        const invoicesToUpsert = mappedInvoices.filter(
          (inv) => !overriddenInvoiceMap.has(inv.qb_id)
        );
        const overriddenInvoiceUpdates = mappedInvoices.filter(
          (inv) => overriddenInvoiceMap.has(inv.qb_id)
        );

        // For overridden invoices: update financial fields only, detect conflicts
        for (const inv of overriddenInvoiceUpdates) {
          const existing = overriddenInvoiceMap.get(inv.qb_id)!;

          if (
            existing.client_name &&
            inv.client_name.toLowerCase() !== existing.client_name.toLowerCase()
          ) {
            conflicts.push({
              source: "quickbooks",
              entity_type: "invoice",
              entity_id: existing.id,
              external_id: inv.qb_id,
              field_name: "client_name",
              app_value: existing.client_name,
              external_value: inv.client_name,
            });
          }

          if (existing.amount !== null && inv.amount !== existing.amount) {
            conflicts.push({
              source: "quickbooks",
              entity_type: "invoice",
              entity_id: existing.id,
              external_id: inv.qb_id,
              field_name: "amount",
              app_value: String(existing.amount),
              external_value: String(inv.amount),
            });
          }

          await supabase
            .from("invoices")
            .update({
              invoice_number: inv.invoice_number,
              amount: inv.amount,
              balance: inv.balance,
              issue_date: inv.issue_date,
              due_date: inv.due_date,
              status: inv.status,
              memo: inv.memo,
              synced_at: inv.synced_at,
            })
            .eq("qb_id", inv.qb_id);
        }

        if (invoicesToUpsert.length > 0) {
          await supabase.from("invoices").upsert(invoicesToUpsert, { onConflict: "qb_id" });
        }
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
        // Get bills with manual_override to handle separately
        const { data: overriddenBills } = await supabase
          .from("bills")
          .select("id, qb_id, project_id, vendor_name, amount")
          .eq("manual_override", true);

        const overriddenBillMap = new Map(
          (overriddenBills || []).map((b: { qb_id: string; id: string; project_id: string | null; vendor_name: string; amount: number }) => [b.qb_id, b])
        );

        // Split into overridden vs normal
        const billsToUpsert = mappedBills.filter(
          (b) => !overriddenBillMap.has(b.qb_id)
        );
        const overriddenBillUpdates = mappedBills.filter(
          (b) => overriddenBillMap.has(b.qb_id)
        );

        // For overridden bills: update financial fields only, detect conflicts
        for (const bill of overriddenBillUpdates) {
          const existing = overriddenBillMap.get(bill.qb_id)!;

          if (
            existing.vendor_name &&
            bill.vendor_name.toLowerCase() !== existing.vendor_name.toLowerCase()
          ) {
            conflicts.push({
              source: "quickbooks",
              entity_type: "bill",
              entity_id: existing.id,
              external_id: bill.qb_id,
              field_name: "vendor_name",
              app_value: existing.vendor_name,
              external_value: bill.vendor_name,
            });
          }

          if (existing.amount !== null && bill.amount !== existing.amount) {
            conflicts.push({
              source: "quickbooks",
              entity_type: "bill",
              entity_id: existing.id,
              external_id: bill.qb_id,
              field_name: "amount",
              app_value: String(existing.amount),
              external_value: String(bill.amount),
            });
          }

          await supabase
            .from("bills")
            .update({
              amount: bill.amount,
              balance: bill.balance,
              bill_date: bill.bill_date,
              due_date: bill.due_date,
              status: bill.status,
              memo: bill.memo,
              synced_at: bill.synced_at,
            })
            .eq("qb_id", bill.qb_id);
        }

        if (billsToUpsert.length > 0) {
          await supabase.from("bills").upsert(billsToUpsert, { onConflict: "qb_id" });
        }
      }

      // Log any detected conflicts
      if (conflicts.length > 0) {
        await supabase.from("sync_conflicts").insert(conflicts);
      }

      // Log sync
      await supabase.from("sync_log").insert({
        source: "quickbooks",
        status: "completed",
        records_synced: invoices.length + bills.length,
        completed_at: new Date().toISOString(),
      });

      results.quickbooks = {
        success: true,
        invoices: invoices.length,
        bills: bills.length,
        conflicts: conflicts.length,
        error: null,
      };
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

      // Persist refreshed tokens back to database
      driveClient.setOnTokenRefresh(async (tokens) => {
        await supabase.from("oauth_tokens").update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("provider", "google");
      });

      // Get client mappings with aliases
      const { data: clientMappings } = await supabase
        .from("client_mappings")
        .select("code, display_name, aliases");
      const clientNameMap = new Map(
        (clientMappings || []).map((m) => [m.code, m.display_name])
      );
      // Build alias → canonical code lookup
      const aliasToCode = new Map<string, string>();
      for (const m of clientMappings || []) {
        aliasToCode.set(m.code.toLowerCase(), m.code);
        for (const alias of (m.aliases || []) as string[]) {
          aliasToCode.set(alias.toLowerCase(), m.code);
        }
      }

      // List and process folders
      const folders = await driveClient.listProjectFolders();
      const projects = await Promise.all(
        folders.map(async (folder) => {
          const parsed = parseProjectFolder(folder.name);
          if (!parsed) return null;
          const hasEstimate = await driveClient.hasEstimateFolder(folder.id);
          const hasPBS = await driveClient.hasPBSFile(folder.id);
          const canonicalCode = aliasToCode.get(parsed.clientCode.toLowerCase()) || parsed.clientCode;
          const clientName = clientNameMap.get(canonicalCode) || parsed.clientCode;
          return {
            drive_id: folder.id,
            code: parsed.code,
            client_code: canonicalCode,
            client_name: clientName,
            description: parsed.description,
            status: "active",
            has_pbs: hasPBS,
            estimate_drive_id: hasEstimate ? folder.id : null,
          };
        })
      );

      const validProjects = projects.filter((p) => p !== null);

      // Detect conflicts for projects that have been modified in the app
      const driveConflicts: SyncConflict[] = [];
      if (validProjects.length > 0) {
        // Get existing projects that may have user modifications
        const driveIds = validProjects.map((p) => p.drive_id);
        const { data: existingProjects } = await supabase
          .from("projects")
          .select("id, drive_id, status, client_name, description")
          .in("drive_id", driveIds);

        const existingMap = new Map(
          (existingProjects || []).map((p) => [p.drive_id, p])
        );

        // Check for status conflicts (user may have closed a project)
        for (const proj of validProjects) {
          const existing = existingMap.get(proj.drive_id);
          if (!existing) continue;

          // If user set project to 'closed' in app but Drive still shows it, don't reopen
          if (existing.status === "closed" && proj.status === "active") {
            proj.status = "closed"; // Preserve user's closed status
            driveConflicts.push({
              source: "google_drive",
              entity_type: "project",
              entity_id: existing.id,
              external_id: proj.drive_id,
              field_name: "status",
              app_value: "closed",
              external_value: "active",
            });
          }
        }

        await supabase.from("projects").upsert(validProjects, { onConflict: "drive_id" });

        if (driveConflicts.length > 0) {
          await supabase.from("sync_conflicts").insert(driveConflicts);
        }
      }

      // Log sync
      await supabase.from("sync_log").insert({
        source: "google_drive",
        status: "completed",
        records_synced: validProjects.length,
        completed_at: new Date().toISOString(),
      });

      results.googleDrive = {
        success: true,
        projects: validProjects.length,
        conflicts: driveConflicts.length,
        error: null,
      };
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

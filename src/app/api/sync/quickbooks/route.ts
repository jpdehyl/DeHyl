import { NextResponse } from "next/server";
import { qbClient, QBTokens } from "@/lib/quickbooks/client";
import { createClient } from "@/lib/supabase/server";

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

export async function POST() {
  const supabase = await createClient();
  let syncLogId: string | null = null;
  const conflicts: SyncConflict[] = [];

  try {
    // Log sync start
    const { data: syncLog } = await supabase
      .from("sync_log")
      .insert({
        source: "quickbooks",
        status: "started",
      })
      .select("id")
      .single();
    syncLogId = syncLog?.id || null;

    // Get tokens from Supabase
    const { data: tokenData, error: tokenError } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("provider", "quickbooks")
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "QuickBooks not connected. Please connect in Settings." },
        { status: 401 }
      );
    }

    // Initialize QB client with stored tokens
    qbClient.setTokens({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(tokenData.expires_at),
      realmId: tokenData.realm_id,
    });

    // Set up callback to persist refreshed tokens
    // QuickBooks uses rotating refresh tokens, so we must save new tokens after each refresh
    qbClient.setOnTokenRefresh(async (tokens: QBTokens) => {
      const { error } = await supabase.from("oauth_tokens").update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
      }).eq("provider", "quickbooks");

      if (error) {
        console.error("Failed to persist refreshed QuickBooks tokens:", error);
        throw new Error("Failed to save refreshed tokens");
      }
      console.log("QuickBooks tokens refreshed and persisted successfully");
    });

    // Sync ALL invoices (not just open) so paid invoices get status/balance updated
    const invoices = (await qbClient.getAllInvoices()) as unknown as QBInvoice[];
    const now = new Date();
    const mappedInvoices = invoices.map((inv) => {
      const balance = parseFloat(inv.Balance);
      const amount = parseFloat(inv.TotalAmt);
      const dueDate = inv.DueDate ? new Date(inv.DueDate) : null;
      const isOverdue = dueDate && dueDate < now && balance > 0;

      return {
        qb_id: inv.Id,
        invoice_number: inv.DocNumber || null,
        client_name: inv.CustomerRef?.name || "Unknown",
        amount,
        balance,
        issue_date: inv.TxnDate || null,
        due_date: inv.DueDate || null,
        status: balance === 0 ? "paid" : isOverdue ? "overdue" : "sent",
        memo: inv.PrivateNote || null,
        synced_at: now.toISOString(),
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

      // Split invoices into overridden vs normal
      const invoicesToUpsert = mappedInvoices.filter(
        (inv) => !overriddenInvoiceMap.has(inv.qb_id)
      );
      const overriddenInvoiceUpdates = mappedInvoices.filter(
        (inv) => overriddenInvoiceMap.has(inv.qb_id)
      );

      // For overridden invoices: update financial fields only, preserve project_id
      // Also detect conflicts (e.g. client_name changed in QB)
      for (const inv of overriddenInvoiceUpdates) {
        const existing = overriddenInvoiceMap.get(inv.qb_id)!;

        // Detect client_name discrepancy
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

        // Detect amount discrepancy
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

        // Update only financial/status fields, preserve project_id and manual_override
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
            // NOTE: project_id, match_confidence, manual_override are NOT touched
          })
          .eq("qb_id", inv.qb_id);
      }

      // Upsert non-overridden invoices normally (in batches)
      for (let i = 0; i < invoicesToUpsert.length; i += 500) {
        const batch = invoicesToUpsert.slice(i, i + 500);
        const { error: invoiceError } = await supabase
          .from("invoices")
          .upsert(batch, { onConflict: "qb_id" });

        if (invoiceError) {
          console.error("Failed to upsert invoices batch:", invoiceError);
        }
      }
    }

    // Sync ALL bills (not just open) so paid bills get status/balance updated
    const bills = (await qbClient.getAllBills()) as unknown as QBBill[];
    const mappedBills = bills.map((bill) => {
      const balance = parseFloat(bill.Balance);
      const amount = parseFloat(bill.TotalAmt);
      const dueDate = bill.DueDate ? new Date(bill.DueDate) : null;
      const isOverdue = dueDate && dueDate < now && balance > 0;

      return {
        qb_id: bill.Id,
        vendor_name: bill.VendorRef?.name || "Unknown",
        amount,
        balance,
        bill_date: bill.TxnDate || null,
        due_date: bill.DueDate || null,
        status: balance === 0 ? "paid" : isOverdue ? "overdue" : "open",
        memo: bill.PrivateNote || null,
        synced_at: now.toISOString(),
      };
    });

    if (mappedBills.length > 0) {
      // Get bills with manual_override to handle separately
      const { data: overriddenBills } = await supabase
        .from("bills")
        .select("id, qb_id, project_id, vendor_name, amount")
        .eq("manual_override", true);

      const overriddenBillMap = new Map(
        (overriddenBills || []).map((b) => [b.qb_id, b])
      );

      // Split bills into overridden vs normal
      const billsToUpsert = mappedBills.filter(
        (b) => !overriddenBillMap.has(b.qb_id)
      );
      const overriddenBillUpdates = mappedBills.filter(
        (b) => overriddenBillMap.has(b.qb_id)
      );

      // For overridden bills: update financial fields only, preserve project_id
      // Also detect conflicts (e.g. vendor_name changed in QB)
      for (const bill of overriddenBillUpdates) {
        const existing = overriddenBillMap.get(bill.qb_id)!;

        // Detect vendor_name discrepancy
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

        // Detect amount discrepancy
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

        // Update only financial/status fields, preserve project_id and manual_override
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
            // NOTE: project_id, manual_override are NOT touched
          })
          .eq("qb_id", bill.qb_id);
      }

      // Upsert non-overridden bills normally (in batches)
      for (let i = 0; i < billsToUpsert.length; i += 500) {
        const batch = billsToUpsert.slice(i, i + 500);
        const { error: billError } = await supabase
          .from("bills")
          .upsert(batch, { onConflict: "qb_id" });

        if (billError) {
          console.error("Failed to upsert bills batch:", billError);
        }
      }
    }

    // Log any detected conflicts
    if (conflicts.length > 0) {
      const { error: conflictError } = await supabase
        .from("sync_conflicts")
        .insert(conflicts);

      if (conflictError) {
        console.error("Failed to log sync conflicts:", conflictError);
      }
    }

    // Update sync log with success
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          records_synced: invoices.length + bills.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json({
      success: true,
      invoices_synced: invoices.length,
      bills_synced: bills.length,
      conflicts_detected: conflicts.length,
    });
  } catch (error) {
    console.error("QuickBooks sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log failed sync
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json(
      {
        error: "Failed to sync QuickBooks data",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

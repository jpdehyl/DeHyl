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

export async function POST() {
  const supabase = await createClient();
  let syncLogId: string | null = null;

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
      // Get invoices with manual_override to exclude from sync
      const { data: overriddenInvoices } = await supabase
        .from("invoices")
        .select("qb_id")
        .eq("manual_override", true);

      const overriddenInvQbIds = new Set((overriddenInvoices || []).map((i) => i.qb_id));
      const invoicesToSync = mappedInvoices.filter((i) => !overriddenInvQbIds.has(i.qb_id));

      // Upsert in batches to avoid payload limits
      for (let i = 0; i < invoicesToSync.length; i += 500) {
        const batch = invoicesToSync.slice(i, i + 500);
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
      // Get bills with manual_override to exclude from sync
      const { data: overriddenBills } = await supabase
        .from("bills")
        .select("qb_id")
        .eq("manual_override", true);

      const overriddenQbIds = new Set((overriddenBills || []).map((b) => b.qb_id));

      // Filter out manually overridden bills before upserting
      const billsToSync = mappedBills.filter((b) => !overriddenQbIds.has(b.qb_id));

      // Upsert in batches
      for (let i = 0; i < billsToSync.length; i += 500) {
        const batch = billsToSync.slice(i, i + 500);
        const { error: billError } = await supabase
          .from("bills")
          .upsert(batch, { onConflict: "qb_id" });

        if (billError) {
          console.error("Failed to upsert bills batch:", billError);
        }
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

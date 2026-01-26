import { NextResponse } from "next/server";
import { qbClient } from "@/lib/quickbooks/client";
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
  Line?: Array<{ Description?: string }>;
}

interface QBBill {
  Id: string;
  VendorRef?: { name?: string; value?: string };
  TotalAmt: string;
  Balance: string;
  TxnDate: string;
  DueDate: string;
  PrivateNote?: string;
  Line?: Array<{ Description?: string }>;
}

// Extract project code from text (format: 7 digits starting with year, e.g., 2601007)
function extractProjectCode(text: string | null | undefined): string | null {
  if (!text) return null;
  // Match 7-digit codes that start with 2 (for 2020s) followed by 2 digits for year
  const match = text.match(/\b(2[0-9]{6})\b/);
  return match ? match[1] : null;
}

// Find project code in invoice/bill data
function findProjectCodeInDocument(doc: QBInvoice | QBBill): string | null {
  // Check memo/private note first
  const fromMemo = extractProjectCode(doc.PrivateNote);
  if (fromMemo) return fromMemo;
  
  // Check line item descriptions
  if (doc.Line) {
    for (const line of doc.Line) {
      const fromLine = extractProjectCode(line.Description);
      if (fromLine) return fromLine;
    }
  }
  
  return null;
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

    // Get all projects for code matching
    const { data: projects } = await supabase
      .from("projects")
      .select("id, code");
    
    const projectCodeMap = new Map(
      (projects || []).map((p) => [p.code, p.id])
    );

    // Sync invoices
    const invoices = (await qbClient.getOpenInvoices()) as unknown as QBInvoice[];
    let invoicesMatched = 0;
    let invoicesUnmatched = 0;
    
    const mappedInvoices = invoices.map((inv) => {
      const balance = parseFloat(inv.Balance);
      const dueDate = inv.DueDate ? new Date(inv.DueDate) : null;
      const isOverdue = dueDate && dueDate < new Date() && balance > 0;

      // Find project by code in memo or line items
      const projectCode = findProjectCodeInDocument(inv);
      const projectId = projectCode ? projectCodeMap.get(projectCode) || null : null;
      
      if (projectId) {
        invoicesMatched++;
      } else {
        invoicesUnmatched++;
      }

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
        project_id: projectId,
        match_confidence: projectId ? "high" : null,
        synced_at: new Date().toISOString(),
      };
    });

    if (mappedInvoices.length > 0) {
      const { error: invoiceError } = await supabase
        .from("invoices")
        .upsert(mappedInvoices, { onConflict: "qb_id" });

      if (invoiceError) {
        console.error("Failed to upsert invoices:", invoiceError);
      }
    }

    // Sync bills
    const bills = (await qbClient.getOpenBills()) as unknown as QBBill[];
    let billsMatched = 0;
    let billsUnmatched = 0;
    
    const mappedBills = bills.map((bill) => {
      const balance = parseFloat(bill.Balance);
      const dueDate = bill.DueDate ? new Date(bill.DueDate) : null;
      const isOverdue = dueDate && dueDate < new Date() && balance > 0;

      // Find project by code in memo or line items
      const projectCode = findProjectCodeInDocument(bill);
      const projectId = projectCode ? projectCodeMap.get(projectCode) || null : null;
      
      if (projectId) {
        billsMatched++;
      } else {
        billsUnmatched++;
      }

      return {
        qb_id: bill.Id,
        vendor_name: bill.VendorRef?.name || "Unknown",
        amount: parseFloat(bill.TotalAmt),
        balance,
        bill_date: bill.TxnDate || null,
        due_date: bill.DueDate || null,
        status: balance === 0 ? "paid" : isOverdue ? "overdue" : "open",
        memo: bill.PrivateNote || null,
        project_id: projectId,
        synced_at: new Date().toISOString(),
      };
    });

    if (mappedBills.length > 0) {
      const { error: billError } = await supabase
        .from("bills")
        .upsert(mappedBills, { onConflict: "qb_id" });

      if (billError) {
        console.error("Failed to upsert bills:", billError);
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
      invoices_matched: invoicesMatched,
      invoices_unmatched: invoicesUnmatched,
      bills_synced: bills.length,
      bills_matched: billsMatched,
      bills_unmatched: billsUnmatched,
    });
  } catch (error) {
    console.error("QuickBooks sync error:", error);

    // Log failed sync
    if (syncLogId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json(
      { error: "Failed to sync QuickBooks data" },
      { status: 500 }
    );
  }
}

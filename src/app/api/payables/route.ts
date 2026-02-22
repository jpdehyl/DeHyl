import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PayablesResponse, Bill } from "@/types";
import { getDaysOverdue, getDaysUntilDue } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();

  // Fetch open bills from Supabase
  const { data: billsData, error: billsError } = await supabase
    .from("bills")
    .select(`
      id,
      qb_id,
      vendor_name,
      amount,
      balance,
      bill_date,
      due_date,
      status,
      project_id,
      memo,
      manual_override,
      synced_at
    `)
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  if (billsError) {
    console.error("Failed to fetch bills:", billsError);
    return NextResponse.json(
      { error: "Failed to fetch payables" },
      { status: 500 }
    );
  }

  // Get last sync time
  const { data: syncLog } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "quickbooks")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Transform to Bill type
  const openBills: Bill[] = (billsData || []).map((bill) => ({
    id: bill.id,
    qbId: bill.qb_id,
    vendorName: bill.vendor_name,
    amount: Number(bill.amount),
    balance: Number(bill.balance),
    billDate: new Date(bill.bill_date),
    dueDate: new Date(bill.due_date),
    status: bill.status as Bill["status"],
    projectId: bill.project_id,
    memo: bill.memo,
    manualOverride: bill.manual_override ?? false,
    syncedAt: new Date(bill.synced_at),
  }));

  const totals = openBills.reduce(
    (acc, bill) => {
      const daysOverdue = getDaysOverdue(bill.dueDate);
      const daysUntil = getDaysUntilDue(bill.dueDate);

      acc.outstanding += bill.balance;

      if (daysOverdue > 0) {
        acc.overdue += bill.balance;
      } else if (daysUntil <= 7) {
        acc.dueThisWeek += bill.balance;
      }

      return acc;
    },
    { outstanding: 0, overdue: 0, dueThisWeek: 0 }
  );

  const response: PayablesResponse = {
    bills: openBills,
    totals,
    lastSyncedAt: syncLog?.completed_at ? new Date(syncLog.completed_at) : null,
  };

  return NextResponse.json(response);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isWithinInterval, parseISO } from "date-fns";

export interface CashFlowPeriod {
  label: string;
  startDate: string;
  endDate: string;
  inflows: number;
  outflows: number;
  net: number;
  inflowItems: Array<{
    id: string;
    type: "invoice";
    description: string;
    amount: number;
    dueDate: string;
    clientName: string;
  }>;
  outflowItems: Array<{
    id: string;
    type: "bill";
    description: string;
    amount: number;
    dueDate: string;
    vendorName: string;
  }>;
}

export interface CashFlowProjection {
  days30: { inflows: number; outflows: number; net: number };
  days60: { inflows: number; outflows: number; net: number };
  days90: { inflows: number; outflows: number; net: number };
}

export interface CashFlowResponse {
  currentBalance: number;
  weeklyPeriods: CashFlowPeriod[];
  monthlyPeriods: CashFlowPeriod[];
  projection: CashFlowProjection;
  totals: {
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
  };
  lastSyncedAt: string | null;
}

export async function GET() {
  const supabase = await createClient();
  const today = new Date();

  // Fetch open invoices (inflows)
  const { data: invoicesData, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, balance, due_date")
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  if (invoicesError) {
    console.error("Failed to fetch invoices:", invoicesError);
    return NextResponse.json({ error: "Failed to fetch cash flow data" }, { status: 500 });
  }

  // Fetch open bills (outflows)
  const { data: billsData, error: billsError } = await supabase
    .from("bills")
    .select("id, vendor_name, balance, due_date, memo")
    .gt("balance", 0)
    .order("due_date", { ascending: true });

  if (billsError) {
    console.error("Failed to fetch bills:", billsError);
    return NextResponse.json({ error: "Failed to fetch cash flow data" }, { status: 500 });
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

  const invoices = invoicesData || [];
  const bills = billsData || [];

  // Helper function to check if a date falls within a period
  function isInPeriod(dateStr: string | null, start: Date, end: Date): boolean {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start, end });
  }

  // Generate weekly periods (next 12 weeks)
  const weeklyPeriods: CashFlowPeriod[] = [];
  for (let i = 0; i < 12; i++) {
    const weekStart = startOfWeek(addDays(today, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(addDays(today, i * 7), { weekStartsOn: 1 });

    const periodInvoices = invoices.filter((inv) => isInPeriod(inv.due_date, weekStart, weekEnd));
    const periodBills = bills.filter((bill) => isInPeriod(bill.due_date, weekStart, weekEnd));

    const inflows = periodInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    const outflows = periodBills.reduce((sum, bill) => sum + Number(bill.balance), 0);

    weeklyPeriods.push({
      label: `Week ${i + 1}: ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd"),
      inflows,
      outflows,
      net: inflows - outflows,
      inflowItems: periodInvoices.map((inv) => ({
        id: inv.id,
        type: "invoice" as const,
        description: inv.invoice_number || "Invoice",
        amount: Number(inv.balance),
        dueDate: inv.due_date,
        clientName: inv.client_name,
      })),
      outflowItems: periodBills.map((bill) => ({
        id: bill.id,
        type: "bill" as const,
        description: bill.memo || "Bill",
        amount: Number(bill.balance),
        dueDate: bill.due_date,
        vendorName: bill.vendor_name,
      })),
    });
  }

  // Generate monthly periods (next 6 months)
  const monthlyPeriods: CashFlowPeriod[] = [];
  for (let i = 0; i < 6; i++) {
    const monthStart = startOfMonth(addDays(today, i * 30));
    const monthEnd = endOfMonth(monthStart);

    const periodInvoices = invoices.filter((inv) => isInPeriod(inv.due_date, monthStart, monthEnd));
    const periodBills = bills.filter((bill) => isInPeriod(bill.due_date, monthStart, monthEnd));

    const inflows = periodInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    const outflows = periodBills.reduce((sum, bill) => sum + Number(bill.balance), 0);

    monthlyPeriods.push({
      label: format(monthStart, "MMMM yyyy"),
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd"),
      inflows,
      outflows,
      net: inflows - outflows,
      inflowItems: periodInvoices.map((inv) => ({
        id: inv.id,
        type: "invoice" as const,
        description: inv.invoice_number || "Invoice",
        amount: Number(inv.balance),
        dueDate: inv.due_date,
        clientName: inv.client_name,
      })),
      outflowItems: periodBills.map((bill) => ({
        id: bill.id,
        type: "bill" as const,
        description: bill.memo || "Bill",
        amount: Number(bill.balance),
        dueDate: bill.due_date,
        vendorName: bill.vendor_name,
      })),
    });
  }

  // Calculate projections for 30/60/90 days
  function calculateProjection(days: number) {
    const endDate = addDays(today, days);
    const periodInvoices = invoices.filter((inv) => isInPeriod(inv.due_date, today, endDate));
    const periodBills = bills.filter((bill) => isInPeriod(bill.due_date, today, endDate));
    
    const inflows = periodInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    const outflows = periodBills.reduce((sum, bill) => sum + Number(bill.balance), 0);
    
    return { inflows, outflows, net: inflows - outflows };
  }

  const projection: CashFlowProjection = {
    days30: calculateProjection(30),
    days60: calculateProjection(60),
    days90: calculateProjection(90),
  };

  // Calculate totals
  const totalInflows = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
  const totalOutflows = bills.reduce((sum, bill) => sum + Number(bill.balance), 0);

  const response: CashFlowResponse = {
    currentBalance: totalInflows - totalOutflows, // Net position
    weeklyPeriods,
    monthlyPeriods,
    projection,
    totals: {
      totalInflows,
      totalOutflows,
      netCashFlow: totalInflows - totalOutflows,
    },
    lastSyncedAt: syncLog?.completed_at || null,
  };

  return NextResponse.json(response);
}

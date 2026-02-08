import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Shop project ID for internal overhead (should not be counted as unbilled)
const SHOP_PROJECT_ID = '8649bd23-6948-4ec6-8dc8-4c58c8a25016';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get count and total amount of expenses assigned to projects (not Shop) that have no invoice linked
    const { data: unbilledStats, error: statsError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('status', 'unlinked')
      .neq('project_id', SHOP_PROJECT_ID); // Exclude Shop project (internal overhead)

    if (statsError) {
      console.error('Error fetching unbilled stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch unbilled expense stats' },
        { status: 500 }
      );
    }

    const totalEntries = unbilledStats.length;
    const totalAmount = unbilledStats.reduce((sum, entry) => sum + Number(entry.amount), 0);

    // Get detailed list of unbilled expenses
    const { data: unbilledExpenses, error: listError } = await supabase
      .from('expenses')
      .select(`
        *,
        projects:project_id (
          id,
          code,
          client_name,
          description
        ),
        invoices:invoice_id (
          id,
          invoice_number,
          status
        )
      `)
      .eq('status', 'unlinked')
      .neq('project_id', SHOP_PROJECT_ID) // Exclude Shop project
      .order('expense_date', { ascending: false })
      .order('amount', { ascending: false });

    if (listError) {
      console.error('Error fetching unbilled expenses:', listError);
      return NextResponse.json(
        { error: 'Failed to fetch unbilled expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stats: {
        totalEntries,
        totalAmount
      },
      expenses: unbilledExpenses
    });
  } catch (error) {
    console.error('Unbilled expenses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Shop project ID for internal overhead (should not be counted as unbilled)
const SHOP_PROJECT_ID = '8649bd23-6948-4ec6-8dc8-4c58c8a25016';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get count and total amount of costs assigned to projects (not Shop) that have no invoice linked
    const { data: unbilledStats, error: statsError } = await supabase
      .from('project_costs')
      .select('amount')
      .eq('status', 'unlinked')
      .neq('project_id', SHOP_PROJECT_ID);

    if (statsError) {
      if (statsError.code === 'PGRST205') {
        return NextResponse.json({ stats: { totalEntries: 0, totalAmount: 0 }, expenses: [] });
      }
      console.error('Error fetching unbilled stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch unbilled expense stats' },
        { status: 500 }
      );
    }

    const totalEntries = unbilledStats.length;
    const totalAmount = unbilledStats.reduce((sum, entry) => sum + Number(entry.amount), 0);

    // Get detailed list of unbilled costs
    const { data: unbilledExpenses, error: listError } = await supabase
      .from('project_costs')
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
      .neq('project_id', SHOP_PROJECT_ID)
      .order('cost_date', { ascending: false })
      .order('amount', { ascending: false });

    if (listError) {
      console.error('Error fetching unbilled expenses:', listError);
      return NextResponse.json(
        { error: 'Failed to fetch unbilled expenses' },
        { status: 500 }
      );
    }

    // Map cost_date to expense_date for backwards compat
    const mapped = (unbilledExpenses || []).map((e) => ({
      ...e,
      expense_date: e.cost_date,
    }));

    return NextResponse.json({
      stats: {
        totalEntries,
        totalAmount
      },
      expenses: mapped
    });
  } catch (error) {
    console.error('Unbilled expenses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

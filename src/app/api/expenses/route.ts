import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Extract filters from search params
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const projectId = searchParams.get('project_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = searchParams.get('limit');

    // Build query against project_costs (consolidated from expenses)
    let query = supabase
      .from('project_costs')
      .select(`
        *,
        projects:project_id (
          id,
          code,
          client_name,
          description
        )
      `)
      .order('cost_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (startDate) {
      query = query.gte('cost_date', startDate);
    }
    if (endDate) {
      query = query.lte('cost_date', endDate);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: expenses, error } = await query;

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('project_costs table not found - returning empty expenses. Run the migration to create it.');
        return NextResponse.json({ expenses: [] });
      }
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    // Map cost_date to expense_date for backwards compatibility with the UI
    const mapped = (expenses || []).map((e) => ({
      ...e,
      expense_date: e.cost_date,
    }));

    return NextResponse.json({ expenses: mapped });
  } catch (error) {
    console.error('Expenses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      description,
      amount,
      expense_date,
      cost_date,
      category = 'materials',
      project_id,
      vendor,
      receipt_url,
      notes,
      submitted_by
    } = body;

    const dateValue = cost_date || expense_date;

    // Validation
    if (!description || !amount || !dateValue || !project_id) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, date, project_id' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['labor', 'materials', 'equipment', 'disposal', 'fuel', 'rental', 'subcontractor', 'permits', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, code')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Invalid project_id' },
        { status: 400 }
      );
    }

    // Create cost entry in project_costs
    const { data: expense, error } = await supabase
      .from('project_costs')
      .insert({
        description,
        amount: parseFloat(amount),
        cost_date: dateValue,
        category,
        project_id,
        vendor,
        receipt_url,
        notes,
        submitted_by,
        status: 'unlinked'
      })
      .select(`
        *,
        projects:project_id (
          id,
          code,
          client_name,
          description
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          { error: 'Cost tracking table not set up. Please run the database migration first.' },
          { status: 503 }
        );
      }
      console.error('Error creating expense:', error);
      return NextResponse.json(
        { error: 'Failed to create expense entry' },
        { status: 500 }
      );
    }

    // Map for backwards compat
    const mapped = { ...expense, expense_date: expense.cost_date };

    return NextResponse.json({ expense: mapped }, { status: 201 });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

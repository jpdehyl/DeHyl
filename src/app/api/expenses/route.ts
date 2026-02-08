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

    // Build query with filters
    let query = supabase
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
      .order('expense_date', { ascending: false })
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
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    return NextResponse.json({ expenses });
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
      category = 'materials',
      project_id,
      vendor,
      receipt_url,
      notes,
      submitted_by
    } = body;

    // Validation
    if (!description || !amount || !expense_date || !project_id) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, expense_date, project_id' },
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
    const validCategories = ['materials', 'equipment', 'disposal', 'fuel', 'rental', 'subcontractor', 'permits', 'other'];
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

    // Create expense entry
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        description,
        amount: parseFloat(amount),
        expense_date,
        category,
        project_id,
        vendor,
        receipt_url,
        notes,
        submitted_by,
        status: 'unlinked' // All new expenses start as unlinked
      })
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
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json(
        { error: 'Failed to create expense entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
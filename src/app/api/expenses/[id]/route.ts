import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id } = await params;

    const {
      description,
      amount,
      expense_date,
      cost_date,
      category,
      project_id,
      invoice_id,
      vendor,
      receipt_url,
      status,
      notes
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        );
      }
      updateData.amount = parseFloat(amount);
    }
    // Accept both expense_date and cost_date
    const dateValue = cost_date || expense_date;
    if (dateValue !== undefined) updateData.cost_date = dateValue;
    if (category !== undefined) {
      const validCategories = ['labor', 'materials', 'equipment', 'disposal', 'fuel', 'rental', 'subcontractor', 'permits', 'other'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.category = category;
    }
    if (project_id !== undefined) updateData.project_id = project_id;
    if (invoice_id !== undefined) {
      updateData.invoice_id = invoice_id;
      // If linking to invoice, update status to invoiced
      if (invoice_id && !status) {
        updateData.status = 'invoiced';
      }
    }
    if (vendor !== undefined) updateData.vendor = vendor;
    if (receipt_url !== undefined) updateData.receipt_url = receipt_url;
    if (status !== undefined) {
      const validStatuses = ['unlinked', 'invoiced', 'collected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (notes !== undefined) updateData.notes = notes;

    const { data: expense, error } = await supabase
      .from('project_costs')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating expense:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update expense' },
        { status: 500 }
      );
    }

    // Map for backwards compat
    const mapped = { ...expense, expense_date: expense.cost_date };
    return NextResponse.json({ expense: mapped });
  } catch (error) {
    console.error('Expense PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from('project_costs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to delete expense' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Expense DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

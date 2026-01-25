import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/projects/[id]/timeline/sync
// Syncs invoices and bills for this project into the timeline
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const supabase = await createClient();

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, code")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    let invoicesSynced = 0;
    let billsSynced = 0;

    // Sync invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .eq("project_id", projectId);

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
    } else if (invoices) {
      for (const inv of invoices) {
        // Upsert activity (use source_id + source_type as unique key)
        const { error: upsertError } = await supabase
          .from("project_activities")
          .upsert(
            {
              project_id: projectId,
              activity_type: "invoice",
              title: `Invoice ${inv.invoice_number || inv.qb_id}`,
              description: `$${Number(inv.amount).toLocaleString()} - ${inv.status}`,
              activity_date: inv.issue_date || inv.synced_at,
              metadata: {
                amount: inv.amount,
                balance: inv.balance,
                status: inv.status,
                invoiceNumber: inv.invoice_number,
                clientName: inv.client_name,
                dueDate: inv.due_date,
              },
              source_id: inv.id,
              source_type: "invoice",
            },
            {
              onConflict: "source_id,source_type",
              ignoreDuplicates: false,
            }
          );

        if (upsertError) {
          // If conflict handling fails, try insert with existence check
          const { data: existing } = await supabase
            .from("project_activities")
            .select("id")
            .eq("source_id", inv.id)
            .eq("source_type", "invoice")
            .single();

          if (existing) {
            // Update existing
            await supabase
              .from("project_activities")
              .update({
                title: `Invoice ${inv.invoice_number || inv.qb_id}`,
                description: `$${Number(inv.amount).toLocaleString()} - ${inv.status}`,
                activity_date: inv.issue_date || inv.synced_at,
                metadata: {
                  amount: inv.amount,
                  balance: inv.balance,
                  status: inv.status,
                  invoiceNumber: inv.invoice_number,
                  clientName: inv.client_name,
                  dueDate: inv.due_date,
                },
              })
              .eq("id", existing.id);
          } else {
            // Insert new
            await supabase.from("project_activities").insert({
              project_id: projectId,
              activity_type: "invoice",
              title: `Invoice ${inv.invoice_number || inv.qb_id}`,
              description: `$${Number(inv.amount).toLocaleString()} - ${inv.status}`,
              activity_date: inv.issue_date || inv.synced_at,
              metadata: {
                amount: inv.amount,
                balance: inv.balance,
                status: inv.status,
                invoiceNumber: inv.invoice_number,
                clientName: inv.client_name,
                dueDate: inv.due_date,
              },
              source_id: inv.id,
              source_type: "invoice",
            });
          }
        }
        invoicesSynced++;
      }
    }

    // Sync bills
    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select("*")
      .eq("project_id", projectId);

    if (billsError) {
      console.error("Error fetching bills:", billsError);
    } else if (bills) {
      for (const bill of bills) {
        // Check if activity already exists
        const { data: existing } = await supabase
          .from("project_activities")
          .select("id")
          .eq("source_id", bill.id)
          .eq("source_type", "bill")
          .single();

        if (existing) {
          // Update existing
          await supabase
            .from("project_activities")
            .update({
              title: `Bill from ${bill.vendor_name}`,
              description: `$${Number(bill.amount).toLocaleString()} - ${bill.status}`,
              activity_date: bill.bill_date || bill.synced_at,
              metadata: {
                amount: bill.amount,
                balance: bill.balance,
                status: bill.status,
                vendorName: bill.vendor_name,
                dueDate: bill.due_date,
              },
            })
            .eq("id", existing.id);
        } else {
          // Insert new
          await supabase.from("project_activities").insert({
            project_id: projectId,
            activity_type: "bill",
            title: `Bill from ${bill.vendor_name}`,
            description: `$${Number(bill.amount).toLocaleString()} - ${bill.status}`,
            activity_date: bill.bill_date || bill.synced_at,
            metadata: {
              amount: bill.amount,
              balance: bill.balance,
              status: bill.status,
              vendorName: bill.vendor_name,
              dueDate: bill.due_date,
            },
            source_id: bill.id,
            source_type: "bill",
          });
        }
        billsSynced++;
      }
    }

    return NextResponse.json({
      success: true,
      synced: {
        invoices: invoicesSynced,
        bills: billsSynced,
      },
    });
  } catch (error) {
    console.error("Timeline sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

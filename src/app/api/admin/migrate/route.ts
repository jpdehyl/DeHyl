import { NextResponse } from "next/server";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS project_costs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      description text NOT NULL,
      amount numeric(12,2) NOT NULL,
      cost_date date NOT NULL DEFAULT CURRENT_DATE,
      category text NOT NULL DEFAULT 'materials'
        CHECK (category IN ('labor', 'materials', 'equipment', 'subcontractor', 'disposal', 'permits', 'fuel', 'rental', 'other')),
      vendor text,
      notes text,
      invoice_id uuid,
      receipt_url text,
      status text NOT NULL DEFAULT 'unlinked',
      submitted_by text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_project_costs_project ON project_costs(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_costs_date ON project_costs(cost_date);
    CREATE INDEX IF NOT EXISTS idx_project_costs_category ON project_costs(category);
    CREATE INDEX IF NOT EXISTS idx_project_costs_status ON project_costs(status);

    ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'project_costs' AND policyname = 'Allow all for project_costs'
      ) THEN
        CREATE POLICY "Allow all for project_costs" ON project_costs FOR ALL USING (true);
      END IF;
    END $$;
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sql_text: sql }),
    });

    if (!response.ok) {
      const projectId = "00000000-0000-0000-0000-000000000000";
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        db: { schema: "public" },
      });

      const checkResult = await supabase.from("project_costs").select("id").limit(1);

      if (checkResult.error && checkResult.error.code === "PGRST205") {
        return NextResponse.json({
          status: "migration_needed",
          message: "The project_costs table does not exist. Please apply migration 00020_project_costs.sql in the Supabase SQL editor.",
          sql: sql.trim(),
        });
      }

      return NextResponse.json({
        status: "table_exists",
        message: "The project_costs table already exists.",
      });
    }

    return NextResponse.json({ status: "success", message: "Migration applied successfully" });
  } catch (err) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: "public" },
    });

    const checkResult = await supabase.from("project_costs").select("id").limit(1);

    if (checkResult.error && checkResult.error.code === "PGRST205") {
      return NextResponse.json({
        status: "migration_needed",
        message: "The project_costs table does not exist. Please apply the following SQL in the Supabase SQL editor to enable cost tracking.",
        sql: sql.trim(),
      });
    }

    return NextResponse.json({
      status: "table_exists",
      message: "The project_costs table already exists. Cost tracking is operational.",
    });
  }
}

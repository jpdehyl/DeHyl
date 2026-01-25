import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface ProjectProfitability {
  id: string;
  code: string;
  description: string;
  clientCode: string;
  clientName: string;
  status: string;
  estimateAmount: number | null;
  totalInvoiced: number;
  totalCollected: number;
  outstandingReceivables: number;
  totalCosts: number;
  grossProfit: number;
  profitMarginPct: number;
}

export interface ClientProfitability {
  clientCode: string;
  clientName: string;
  projectCount: number;
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
}

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  avgProfitMargin: number;
  mostProfitableProject: string;
  leastProfitableProject: string;
}

export interface ProfitabilityResponse {
  projects: ProjectProfitability[];
  summary: ProfitabilitySummary;
  byClient: ClientProfitability[];
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const statusFilter = searchParams.get("status");
  const clientFilter = searchParams.get("client");
  const sortBy = searchParams.get("sortBy") || "gross_profit";

  // Fetch all projects with their invoices and bills
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, code, description, client_code, client_name, status, estimate_amount");

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  // Fetch all invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, project_id, amount, balance");

  // Fetch all bills
  const { data: bills } = await supabase
    .from("bills")
    .select("id, project_id, amount");

  // Calculate profitability for each project
  let projectProfitability: ProjectProfitability[] = (projects || []).map((project) => {
    const projectInvoices = (invoices || []).filter((inv) => inv.project_id === project.id);
    const projectBills = (bills || []).filter((bill) => bill.project_id === project.id);

    const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalCollected = projectInvoices.reduce(
      (sum, inv) => sum + (Number(inv.amount) - Number(inv.balance)),
      0
    );
    const outstandingReceivables = projectInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    const totalCosts = projectBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
    const grossProfit = totalInvoiced - totalCosts;
    const profitMarginPct =
      totalInvoiced > 0 ? Math.round((grossProfit / totalInvoiced) * 1000) / 10 : 0;

    return {
      id: project.id,
      code: project.code,
      description: project.description || "",
      clientCode: project.client_code,
      clientName: project.client_name || project.client_code,
      status: project.status,
      estimateAmount: project.estimate_amount ? Number(project.estimate_amount) : null,
      totalInvoiced,
      totalCollected,
      outstandingReceivables,
      totalCosts,
      grossProfit,
      profitMarginPct,
    };
  });

  // Apply filters
  if (statusFilter) {
    projectProfitability = projectProfitability.filter((p) => p.status === statusFilter);
  }
  if (clientFilter) {
    projectProfitability = projectProfitability.filter((p) => p.clientCode === clientFilter);
  }

  // Apply sorting
  projectProfitability.sort((a, b) => {
    switch (sortBy) {
      case "profit_margin":
        return b.profitMarginPct - a.profitMarginPct;
      case "gross_profit":
        return b.grossProfit - a.grossProfit;
      case "total_invoiced":
        return b.totalInvoiced - a.totalInvoiced;
      case "total_costs":
        return b.totalCosts - a.totalCosts;
      case "code":
        return a.code.localeCompare(b.code);
      default:
        return b.grossProfit - a.grossProfit;
    }
  });

  // Calculate summary
  const totalRevenue = projectProfitability.reduce((sum, p) => sum + p.totalInvoiced, 0);
  const totalCosts = projectProfitability.reduce((sum, p) => sum + p.totalCosts, 0);
  const totalProfit = totalRevenue - totalCosts;
  const avgProfitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  // Find most and least profitable projects (with revenue > 0)
  const projectsWithRevenue = projectProfitability.filter((p) => p.totalInvoiced > 0);
  const mostProfitable = projectsWithRevenue.reduce(
    (max, p) => (p.profitMarginPct > max.profitMarginPct ? p : max),
    { profitMarginPct: -Infinity, code: "N/A" }
  );
  const leastProfitable = projectsWithRevenue.reduce(
    (min, p) => (p.profitMarginPct < min.profitMarginPct ? p : min),
    { profitMarginPct: Infinity, code: "N/A" }
  );

  const summary: ProfitabilitySummary = {
    totalRevenue,
    totalCosts,
    totalProfit,
    avgProfitMargin,
    mostProfitableProject: mostProfitable.code,
    leastProfitableProject: leastProfitable.code,
  };

  // Calculate by client
  const clientMap = new Map<string, { clientName: string; projects: ProjectProfitability[] }>();
  for (const project of projectProfitability) {
    const key = project.clientCode;
    if (!clientMap.has(key)) {
      clientMap.set(key, { clientName: project.clientName, projects: [] });
    }
    clientMap.get(key)!.projects.push(project);
  }

  const byClient: ClientProfitability[] = Array.from(clientMap.entries()).map(([clientCode, data]) => {
    const clientTotalRevenue = data.projects.reduce((sum, p) => sum + p.totalInvoiced, 0);
    const clientTotalProfit = data.projects.reduce((sum, p) => sum + p.grossProfit, 0);
    const avgMargin =
      clientTotalRevenue > 0 ? Math.round((clientTotalProfit / clientTotalRevenue) * 1000) / 10 : 0;

    return {
      clientCode,
      clientName: data.clientName,
      projectCount: data.projects.length,
      totalRevenue: clientTotalRevenue,
      totalProfit: clientTotalProfit,
      avgMargin,
    };
  });

  // Sort clients by total profit descending
  byClient.sort((a, b) => b.totalProfit - a.totalProfit);

  const response: ProfitabilityResponse = {
    projects: projectProfitability,
    summary,
    byClient,
  };

  return NextResponse.json(response);
}

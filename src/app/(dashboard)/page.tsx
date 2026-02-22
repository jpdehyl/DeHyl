import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { formatCurrency, getDaysOverdue, getRelativeTime } from "@/lib/utils";
import Link from "next/link";

async function getWeather(): Promise<string> {
  try {
    const response = await fetch("http://wttr.in/Vancouver?format=%C+%t", {
      next: { revalidate: 3600 },
    });
    return await response.text();
  } catch {
    return "Weather unavailable";
  }
}

async function getTodayActiveProjects(supabase: any): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_logs')
    .select('project_id')
    .eq('log_date', today)
    .gte('total_hours', 0.1);
  return new Set(data?.map((log: any) => log.project_id) || []).size;
}

async function getOverdueInvoicesGrouped(supabase: any) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('client_name, balance, due_date')
    .gt('balance', 0)
    .order('due_date', { ascending: true });

  if (!invoices) return { urgent: [], warning: [] };

  const clientMap = new Map();
  invoices.forEach((invoice: any) => {
    const daysOverdue = getDaysOverdue(invoice.due_date);
    if (daysOverdue <= 0) return;
    const client = invoice.client_name;
    if (!clientMap.has(client)) {
      clientMap.set(client, { name: client, totalOverdue: 0, invoiceCount: 0, oldestDays: 0, maxDays: 0 });
    }
    const clientData = clientMap.get(client);
    clientData.totalOverdue += Number(invoice.balance);
    clientData.invoiceCount += 1;
    clientData.maxDays = Math.max(clientData.maxDays, daysOverdue);
    if (clientData.oldestDays === 0 || daysOverdue > clientData.oldestDays) {
      clientData.oldestDays = daysOverdue;
    }
  });

  const clientsArray = Array.from(clientMap.values());
  return {
    urgent: clientsArray.filter(c => c.maxDays > 60).sort((a, b) => b.totalOverdue - a.totalOverdue),
    warning: clientsArray.filter(c => c.maxDays > 30 && c.maxDays <= 60).sort((a, b) => b.totalOverdue - a.totalOverdue),
  };
}

async function getActiveProjects(supabase: any) {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, code, client_name, client_code, description, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (!projects) return [];

  const projectsWithActivity = await Promise.all(
    projects.map(async (project: any) => {
      const { data: activity } = await supabase
        .from('project_activities')
        .select('title, activity_date, description')
        .eq('project_id', project.id)
        .order('activity_date', { ascending: false })
        .limit(1)
        .single();

      const { data: dailyLog } = await supabase
        .from('daily_logs')
        .select('log_date, work_summary')
        .eq('project_id', project.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .single();

      let lastUpdate = project.updated_at;
      let updateSnippet = "No recent updates";

      if (activity && (!dailyLog || new Date(activity.activity_date) > new Date(dailyLog.log_date))) {
        lastUpdate = activity.activity_date;
        updateSnippet = activity.title || activity.description || "Activity logged";
      } else if (dailyLog) {
        lastUpdate = dailyLog.log_date + "T23:59:59Z";
        updateSnippet = dailyLog.work_summary || "Work logged";
      }

      const daysSinceUpdate = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));
      let status = "fresh";
      if (daysSinceUpdate > 7) status = "stale";
      else if (daysSinceUpdate > 3) status = "aging";

      return {
        ...project,
        lastUpdate,
        updateSnippet: updateSnippet.substring(0, 80) + (updateSnippet.length > 80 ? "..." : ""),
        daysSinceUpdate,
        status,
      };
    })
  );

  return projectsWithActivity;
}

async function getARAging(supabase: any) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('balance, due_date')
    .gt('balance', 0);

  const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 };
  if (!invoices) return aging;

  invoices.forEach((invoice: any) => {
    const daysOverdue = getDaysOverdue(invoice.due_date);
    const amount = Number(invoice.balance);
    if (daysOverdue <= 0) aging.current += amount;
    else if (daysOverdue <= 30) aging.days1to30 += amount;
    else if (daysOverdue <= 60) aging.days31to60 += amount;
    else if (daysOverdue <= 90) aging.days61to90 += amount;
    else aging.days90plus += amount;
  });

  return aging;
}

async function getUnassignedHours(supabase: any) {
  try {
    const { data: unassignedStats } = await supabase
      .from('timesheets')
      .select('hours_worked')
      .eq('status', 'unassigned');
    return {
      totalEntries: unassignedStats?.length || 0,
      totalHours: unassignedStats?.reduce((sum: number, entry: any) => sum + Number(entry.hours_worked), 0) || 0,
    };
  } catch {
    return { totalEntries: 0, totalHours: 0 };
  }
}

async function getUnbilledExpenses(supabase: any) {
  try {
    const SHOP_PROJECT_ID = '8649bd23-6948-4ec6-8dc8-4c58c8a25016';
    const { data: unbilledStats } = await supabase
      .from('project_costs')
      .select('amount')
      .eq('status', 'unlinked')
      .neq('project_id', SHOP_PROJECT_ID);
    return {
      totalEntries: unbilledStats?.length || 0,
      totalAmount: unbilledStats?.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0) || 0,
    };
  } catch {
    return { totalEntries: 0, totalAmount: 0 };
  }
}

async function getCashPosition(supabase: any) {
  const [receivablesResult, payablesResult] = await Promise.all([
    supabase.from('invoices').select('balance').gt('balance', 0),
    supabase.from('bills').select('balance').gt('balance', 0),
  ]);
  const totalReceivables = receivablesResult.data?.reduce((sum: number, inv: any) => sum + Number(inv.balance), 0) || 0;
  const totalPayables = payablesResult.data?.reduce((sum: number, bill: any) => sum + Number(bill.balance), 0) || 0;
  return { totalReceivables, totalPayables, netPosition: totalReceivables - totalPayables };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    weather,
    activeProjectsToday,
    overdueData,
    activeProjects,
    arAging,
    cashPosition,
    unassignedHours,
    unbilledExpenses,
  ] = await Promise.all([
    getWeather(),
    getTodayActiveProjects(supabase),
    getOverdueInvoicesGrouped(supabase),
    getActiveProjects(supabase),
    getARAging(supabase),
    getCashPosition(supabase),
    getUnassignedHours(supabase),
    getUnbilledExpenses(supabase),
  ]);

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalOutstanding = arAging.current + arAging.days1to30 + arAging.days31to60 + arAging.days61to90 + arAging.days90plus;
  const hasAlerts = overdueData.urgent.length > 0 || overdueData.warning.length > 0 || unassignedHours.totalEntries > 0 || unbilledExpenses.totalEntries > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Command Center" description="DeHyl Demolition" />

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-12">

        <section>
          <p className="text-muted-foreground text-sm">{today}</p>
          <div className="flex items-baseline gap-6 mt-1">
            <p className="text-sm">
              <span className="font-medium">{activeProjectsToday}</span>
              <span className="text-muted-foreground"> crew deployed</span>
            </p>
            <p className="text-sm text-muted-foreground">{weather.trim()}</p>
          </div>
        </section>

        {hasAlerts && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Needs attention</h2>
            <div className="space-y-3">
              {unassignedHours.totalEntries > 0 && (
                <div className="flex items-baseline justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium">
                      {unassignedHours.totalHours.toFixed(1)} hours unassigned
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {unassignedHours.totalEntries} timesheet {unassignedHours.totalEntries === 1 ? 'entry needs' : 'entries need'} project assignment
                    </p>
                  </div>
                  <Link href="/timesheets?status=unassigned" className="text-xs font-medium text-foreground hover:underline">
                    Assign
                  </Link>
                </div>
              )}
              {unbilledExpenses.totalEntries > 0 && (
                <div className="flex items-baseline justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium">
                      {formatCurrency(unbilledExpenses.totalAmount)} unbilled
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {unbilledExpenses.totalEntries} expenses not yet on an invoice
                    </p>
                  </div>
                  <Link href="/expenses?status=unlinked" className="text-xs font-medium text-foreground hover:underline">
                    Link
                  </Link>
                </div>
              )}
              {overdueData.urgent.map((client: any) => (
                <div key={client.name} className="flex items-baseline justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(client.totalOverdue)} overdue &middot; {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''} &middot; {client.oldestDays} days
                    </p>
                  </div>
                  <span className="text-xs font-medium text-destructive">Urgent</span>
                </div>
              ))}
              {overdueData.warning.map((client: any) => (
                <div key={client.name} className="flex items-baseline justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(client.totalOverdue)} overdue &middot; {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''} &middot; {client.oldestDays} days
                    </p>
                  </div>
                  <span className="text-xs text-warning">Watch</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold">Active projects</h2>
            <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">
              All projects
            </Link>
          </div>
          <div className="space-y-0">
            {activeProjects.slice(0, 8).map((project: any) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-baseline justify-between py-3 border-b border-border group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-medium">{project.code}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {project.client_name || project.client_code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {project.updateSnippet}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {getRelativeTime(project.lastUpdate)}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      project.status === 'fresh' ? 'bg-green-500' :
                      project.status === 'aging' ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                  />
                </div>
              </Link>
            ))}
          </div>
          {activeProjects.length > 8 && (
            <p className="text-xs text-muted-foreground mt-3">
              +{activeProjects.length - 8} more
            </p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Collections</h2>
          <div className="grid grid-cols-5 gap-px bg-border rounded-lg overflow-hidden">
            {[
              { label: "Current", amount: arAging.current },
              { label: "1-30 d", amount: arAging.days1to30 },
              { label: "31-60 d", amount: arAging.days31to60 },
              { label: "61-90 d", amount: arAging.days61to90 },
              { label: "90+ d", amount: arAging.days90plus },
            ].map((bucket) => (
              <div key={bucket.label} className="bg-background p-3 text-center">
                <p className="text-sm font-medium tabular-nums">{formatCurrency(bucket.amount)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bucket.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between mt-3 text-xs text-muted-foreground">
            <span>Total outstanding: {formatCurrency(totalOutstanding)}</span>
            <Link href="/receivables" className="hover:text-foreground">View all</Link>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Cash position</h2>
          <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
            <div className="bg-background p-4 text-center">
              <p className="text-lg font-medium tabular-nums">{formatCurrency(cashPosition.totalReceivables)}</p>
              <p className="text-xs text-muted-foreground mt-1">Receivables</p>
            </div>
            <div className="bg-background p-4 text-center">
              <p className="text-lg font-medium tabular-nums">{formatCurrency(cashPosition.totalPayables)}</p>
              <p className="text-xs text-muted-foreground mt-1">Payables</p>
            </div>
            <div className="bg-background p-4 text-center">
              <p className={`text-lg font-medium tabular-nums ${cashPosition.netPosition >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(cashPosition.netPosition)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Net</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

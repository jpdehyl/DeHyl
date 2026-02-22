import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatCurrency, getDaysOverdue } from "@/lib/utils";
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
  const totalOverdue = arAging.days1to30 + arAging.days31to60 + arAging.days61to90 + arAging.days90plus;
  const allAttentionItems = [
    ...overdueData.urgent.map((c: any) => ({ ...c, severity: 'urgent' as const })),
    ...overdueData.warning.map((c: any) => ({ ...c, severity: 'warning' as const })),
  ];

  const briefingParts: string[] = [];
  if (activeProjectsToday > 0) {
    briefingParts.push(`${activeProjectsToday} crew${activeProjectsToday !== 1 ? 's' : ''} deployed today`);
  } else {
    briefingParts.push("No crews deployed today");
  }
  if (totalOverdue > 0) {
    briefingParts.push(`${formatCurrency(totalOverdue)} overdue`);
  }
  if (unbilledExpenses.totalEntries > 0) {
    briefingParts.push(`${formatCurrency(unbilledExpenses.totalAmount)} in unbilled expenses`);
  }
  if (unassignedHours.totalEntries > 0) {
    briefingParts.push(`${unassignedHours.totalHours.toFixed(0)}h unassigned`);
  }
  const briefingSummary = briefingParts.join(". ") + ".";

  const hasAttention = allAttentionItems.length > 0 || unassignedHours.totalEntries > 0 || unbilledExpenses.totalEntries > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Command Center" description="DeHyl Demolition" />

      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-24">

        {/* Date + Weather — Centered */}
        <div className="text-center mb-10">
          <p className="text-sm tracking-wide text-muted-foreground">{today}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">{weather.trim()}</p>
        </div>

        {/* Top Row — Money (left) + Attention (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 mb-16">

          {/* Left — Money */}
          <div className="space-y-8">
            <div>
              <p className={`font-serif text-5xl font-semibold tracking-tight tabular-nums leading-none ${cashPosition.netPosition >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(cashPosition.netPosition)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">net position</p>
            </div>

            <div className="flex gap-10">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Receivables</p>
                <p className="font-serif text-2xl font-semibold tabular-nums tracking-tight mt-1">
                  {formatCurrency(cashPosition.totalReceivables)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payables</p>
                <p className="font-serif text-2xl font-semibold tabular-nums tracking-tight mt-1">
                  {formatCurrency(cashPosition.totalPayables)}
                </p>
              </div>
            </div>

            {totalOutstanding > 0 && (
              <div className="space-y-3">
                <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted/30">
                  {[
                    { amount: arAging.current, color: 'bg-emerald-400/70' },
                    { amount: arAging.days1to30, color: 'bg-amber-300/70' },
                    { amount: arAging.days31to60, color: 'bg-amber-400/70' },
                    { amount: arAging.days61to90, color: 'bg-red-300/70' },
                    { amount: arAging.days90plus, color: 'bg-red-500/70' },
                  ].map((bucket, i) => {
                    const pct = totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0;
                    if (pct < 0.5) return null;
                    return (
                      <div
                        key={i}
                        className={`${bucket.color} rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(arAging.current)} current</span>
                  <Link href="/receivables" className="hover:text-foreground transition-colors">
                    {totalOverdue > 0 ? `${formatCurrency(totalOverdue)} overdue` : 'View all'}
                  </Link>
                </div>
              </div>
            )}

            <p className="text-sm leading-relaxed text-muted-foreground">
              {briefingSummary}
            </p>
          </div>

          {/* Right — Attention */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {hasAttention && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                {hasAttention ? 'Needs attention' : 'All clear'}
              </h2>
            </div>

            {!hasAttention && (
              <p className="text-sm text-muted-foreground">Nothing urgent right now.</p>
            )}

            {allAttentionItems.map((client: any) => (
              <Link
                key={client.name}
                href="/receivables"
                className="block group"
              >
                <div className="pl-5 border-l-2 border-red-200 dark:border-red-900 py-1">
                  <p className="font-medium group-hover:underline decoration-1 underline-offset-4">
                    {client.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatCurrency(client.totalOverdue)} &middot; {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''} &middot; {client.oldestDays}d overdue
                  </p>
                </div>
              </Link>
            ))}

            {unassignedHours.totalEntries > 0 && (
              <Link href="/timesheets?status=unassigned" className="block group">
                <div className="pl-5 border-l-2 border-amber-200 dark:border-amber-900 py-1">
                  <p className="font-medium group-hover:underline decoration-1 underline-offset-4">
                    {unassignedHours.totalHours.toFixed(0)} hours unassigned
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {unassignedHours.totalEntries} timesheet {unassignedHours.totalEntries === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              </Link>
            )}

            {unbilledExpenses.totalEntries > 0 && (
              <Link href="/expenses?status=unlinked" className="block group">
                <div className="pl-5 border-l-2 border-amber-200 dark:border-amber-900 py-1">
                  <p className="font-medium group-hover:underline decoration-1 underline-offset-4">
                    {formatCurrency(unbilledExpenses.totalAmount)} unbilled
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {unbilledExpenses.totalEntries} expense{unbilledExpenses.totalEntries !== 1 ? 's' : ''} to link
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Projects — Full Width Editorial Feed */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-xl font-semibold tracking-tight">Projects</h2>
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
            {activeProjects.slice(0, 6).map((project: any) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium group-hover:underline decoration-1 underline-offset-4 line-clamp-1">
                      {project.description || project.client_name || project.client_code}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {project.updateSnippet}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <RelativeTime
                      date={project.lastUpdate}
                      className="text-xs text-muted-foreground/60"
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${
                        project.status === 'fresh' ? 'bg-emerald-400' :
                        project.status === 'aging' ? 'bg-amber-300' : 'bg-red-300'
                      }`}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

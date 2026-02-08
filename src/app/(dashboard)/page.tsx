import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getDaysOverdue, getRelativeTime } from "@/lib/utils";
import {
  CalendarDays,
  Users,
  CloudRain,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertCircle,
  Receipt,
} from "lucide-react";
import Link from "next/link";

// Fetch weather from wttr.in
async function getWeather(): Promise<string> {
  try {
    const response = await fetch("http://wttr.in/Vancouver?format=%C+%t", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    return await response.text();
  } catch {
    return "Weather unavailable";
  }
}

// Get current active projects with crew deployed today
async function getTodayActiveProjects(supabase: any): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('daily_logs')
    .select('project_id')
    .eq('log_date', today)
    .gte('total_hours', 0.1); // Projects with crew time logged
  
  return new Set(data?.map((log: any) => log.project_id) || []).size;
}

// Get overdue invoices grouped by client
async function getOverdueInvoicesGrouped(supabase: any) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('client_name, balance, due_date')
    .gt('balance', 0)
    .order('due_date', { ascending: true });

  if (!invoices) return { urgent: [], warning: [] };

  const clientMap = new Map();
  const today = new Date();

  invoices.forEach((invoice: any) => {
    const daysOverdue = getDaysOverdue(invoice.due_date);
    if (daysOverdue <= 0) return;

    const client = invoice.client_name;
    if (!clientMap.has(client)) {
      clientMap.set(client, {
        name: client,
        totalOverdue: 0,
        invoiceCount: 0,
        oldestDays: 0,
        maxDays: 0,
      });
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
  const urgent = clientsArray.filter(c => c.maxDays > 60).sort((a, b) => b.totalOverdue - a.totalOverdue);
  const warning = clientsArray.filter(c => c.maxDays > 30 && c.maxDays <= 60).sort((a, b) => b.totalOverdue - a.totalOverdue);

  return { urgent, warning };
}

// Get active projects with latest updates
async function getActiveProjects(supabase: any) {
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      code,
      client_name,
      client_code,
      description,
      updated_at
    `)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (!projects) return [];

  // Get latest activity for each project
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
      let updateType = "project";

      // Use most recent between activity and daily log
      if (activity && (!dailyLog || new Date(activity.activity_date) > new Date(dailyLog.log_date))) {
        lastUpdate = activity.activity_date;
        updateSnippet = activity.title || activity.description || "Activity logged";
        updateType = "activity";
      } else if (dailyLog) {
        lastUpdate = dailyLog.log_date + "T23:59:59Z";
        updateSnippet = dailyLog.work_summary || "Work logged";
        updateType = "work";
      }

      // Calculate status based on recency
      const daysSinceUpdate = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));
      let status = "green";
      if (daysSinceUpdate > 7) status = "red";
      else if (daysSinceUpdate > 3) status = "yellow";

      return {
        ...project,
        lastUpdate,
        updateSnippet: updateSnippet.substring(0, 80) + (updateSnippet.length > 80 ? "..." : ""),
        daysSinceUpdate,
        status,
        updateType,
      };
    })
  );

  return projectsWithActivity;
}

// Get AR aging data
async function getARAging(supabase: any) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('balance, due_date')
    .gt('balance', 0);

  if (!invoices) return {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
  };

  const aging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
  };

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

// Get unassigned timesheet hours
async function getUnassignedHours(supabase: any) {
  try {
    const { data: unassignedStats } = await supabase
      .from('timesheets')
      .select('hours_worked')
      .eq('status', 'unassigned');

    const totalEntries = unassignedStats?.length || 0;
    const totalHours = unassignedStats?.reduce((sum: number, entry: any) => sum + Number(entry.hours_worked), 0) || 0;

    return {
      totalEntries,
      totalHours
    };
  } catch (error) {
    // If timesheets table doesn't exist yet, return zeros
    return {
      totalEntries: 0,
      totalHours: 0
    };
  }
}

// Get unbilled project expenses (excludes Shop internal expenses)
async function getUnbilledExpenses(supabase: any) {
  try {
    // Shop project ID for internal overhead (should not be counted as unbilled)
    const SHOP_PROJECT_ID = '8649bd23-6948-4ec6-8dc8-4c58c8a25016';
    
    const { data: unbilledStats } = await supabase
      .from('expenses')
      .select('amount')
      .eq('status', 'unlinked')
      .neq('project_id', SHOP_PROJECT_ID); // Exclude Shop project (internal overhead)

    const totalEntries = unbilledStats?.length || 0;
    const totalAmount = unbilledStats?.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0) || 0;

    return {
      totalEntries,
      totalAmount
    };
  } catch (error) {
    // If expenses table doesn't exist yet, return zeros
    return {
      totalEntries: 0,
      totalAmount: 0
    };
  }
}

// Get cash position
async function getCashPosition(supabase: any) {
  const [receivablesResult, payablesResult, lastSyncResult] = await Promise.all([
    supabase.from('invoices').select('balance').gt('balance', 0),
    supabase.from('bills').select('balance').gt('balance', 0),
    supabase
      .from('sync_log')
      .select('completed_at')
      .eq('source', 'quickbooks')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  const totalReceivables = receivablesResult.data?.reduce((sum: number, inv: any) => sum + Number(inv.balance), 0) || 0;
  const totalPayables = payablesResult.data?.reduce((sum: number, bill: any) => sum + Number(bill.balance), 0) || 0;
  const netPosition = totalReceivables - totalPayables;

  const lastSyncedAt = lastSyncResult.data?.completed_at;
  const isStale = !lastSyncedAt || (Date.now() - new Date(lastSyncedAt).getTime()) > (7 * 24 * 60 * 60 * 1000);

  return {
    totalReceivables,
    totalPayables,
    netPosition,
    lastSyncedAt,
    isStale,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch all data in parallel
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

  return (
    <div className="min-h-screen bg-background">
      <Header title="Command Center" description="CEO Dashboard for DeHyl Demolition" />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* 1. TODAY Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <CalendarDays className="h-5 w-5" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-lg font-medium text-blue-800 dark:text-blue-200">
              {today}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeProjectsToday}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Active projects with crew deployed
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg">
                <CloudRain className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {weather.trim()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Vancouver weather
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. NEEDS ATTENTION Section */}
        {(overdueData.urgent.length > 0 || overdueData.warning.length > 0 || unassignedHours.totalEntries > 0 || unbilledExpenses.totalEntries > 0) && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-orange-900 dark:text-orange-100">
                <AlertTriangle className="h-5 w-5" />
                Needs Attention
                <Badge variant="destructive" className="ml-2">
                  {overdueData.urgent.length + overdueData.warning.length + (unassignedHours.totalEntries > 0 ? 1 : 0) + (unbilledExpenses.totalEntries > 0 ? 1 : 0)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Unassigned Hours Alert */}
              {unassignedHours.totalEntries > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-900 dark:text-red-100">
                        ⏰ {unassignedHours.totalHours.toFixed(1)} hours unassigned
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        {unassignedHours.totalEntries} timesheet {unassignedHours.totalEntries === 1 ? 'entry needs' : 'entries need'} project assignment
                      </div>
                    </div>
                  </div>
                  <Link 
                    href="/timesheets?status=unassigned" 
                    className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Assign Now
                  </Link>
                </div>
              )}

              {/* Unbilled Expenses Alert */}
              {unbilledExpenses.totalEntries > 0 && (
                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="font-semibold text-amber-900 dark:text-amber-100">
                        💰 ${unbilledExpenses.totalAmount.toLocaleString()} unbilled expenses
                      </div>
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        {unbilledExpenses.totalEntries} {unbilledExpenses.totalEntries === 1 ? 'expense needs' : 'expenses need'} invoice linking
                      </div>
                    </div>
                  </div>
                  <Link 
                    href="/expenses?status=unlinked" 
                    className="inline-flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    Link to Invoices
                  </Link>
                </div>
              )}
              {/* Urgent (>60 days) */}
              {overdueData.urgent.map((client: any) => (
                <div
                  key={client.name}
                  className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-900 dark:text-red-100">
                        {client.name}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        {formatCurrency(client.totalOverdue)} overdue ({client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}, oldest: {client.oldestDays} days)
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive">URGENT</Badge>
                </div>
              ))}

              {/* Warning (30-60 days) */}
              {overdueData.warning.map((client: any) => (
                <div
                  key={client.name}
                  className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                        {client.name}
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        {formatCurrency(client.totalOverdue)} overdue ({client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}, oldest: {client.oldestDays} days)
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                    WARNING
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 3. ACTIVE PROJECTS Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Active Projects
              <Badge variant="outline" className="ml-2">
                {activeProjects.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {activeProjects.slice(0, 9).map((project: any) => (
                <div
                  key={project.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold">{project.code}</span>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        project.status === 'green' ? 'bg-green-500' :
                        project.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      title={`Last update: ${project.daysSinceUpdate} days ago`}
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {project.client_name || project.client_code}
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium text-foreground mb-1">
                      {getRelativeTime(project.lastUpdate)}
                    </div>
                    <div className="text-muted-foreground line-clamp-2">
                      {project.updateSnippet}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {activeProjects.length > 9 && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  + {activeProjects.length - 9} more projects
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. COLLECTIONS Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Collections (AR Aging)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(arAging.current)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Current (not due)
                  </div>
                </div>
                
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(arAging.days1to30)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    1-30 days
                  </div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                    {formatCurrency(arAging.days31to60)}
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    31-60 days
                  </div>
                </div>
                
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {formatCurrency(arAging.days61to90)}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400">
                    61-90 days
                  </div>
                </div>
                
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(arAging.days90plus)}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    90+ days
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. CASH POSITION Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Cash Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cashPosition.isStale && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    ⚠️ QuickBooks data is stale ({cashPosition.lastSyncedAt ? `last sync: ${getRelativeTime(cashPosition.lastSyncedAt)}` : 'never synced'})
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(cashPosition.totalReceivables)}
                </div>
                <div className="text-sm text-muted-foreground">Total Receivables</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <CreditCard className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(cashPosition.totalPayables)}
                </div>
                <div className="text-sm text-muted-foreground">Total Payables</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className={`text-2xl font-bold ${
                  cashPosition.netPosition >= 0 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {formatCurrency(cashPosition.netPosition)}
                </div>
                <div className="text-sm text-muted-foreground">Net Position</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
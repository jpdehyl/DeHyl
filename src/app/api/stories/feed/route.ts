import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDaysOverdue, getDaysUntilDue } from "@/lib/utils";
import type { FeedCard, FeedPriority, UpcomingProject, SmartFeedResponse } from "@/types/stories";

/**
 * GET /api/stories/feed
 *
 * Assembles a ranked "smart feed" of actionable items across all projects.
 * Items are scored by priority tiers (critical > high > medium > info)
 * and sorted by recency within each tier.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // --- Parallel queries ---
    const [
      invoicesRes,
      billsRes,
      projectsRes,
      dailyLogsRes,
      photosRes,
      costsRes,
      bidsRes,
      safetyRes,
      stalenessRes,
    ] = await Promise.all([
      // 1. Open invoices (overdue + aging + unassigned)
      supabase
        .from("invoices")
        .select("id, invoice_number, client_name, amount, balance, due_date, issue_date, status, project_id")
        .gt("balance", 0),

      // 2. Open bills due within 7 days
      supabase
        .from("bills")
        .select("id, vendor_name, amount, balance, due_date, status, project_id")
        .gt("balance", 0),

      // 3. Active projects with financials
      supabase
        .from("projects")
        .select("id, code, client_code, client_name, description, status, estimate_amount, has_pbs, created_at, updated_at"),

      // 4. Recent daily logs (last 3 days)
      supabase
        .from("daily_logs")
        .select("id, project_id, log_date, work_summary, weather, total_hours, daily_log_crew(worker_name)")
        .gte("log_date", threeDaysAgo.toISOString().split("T")[0])
        .order("log_date", { ascending: false })
        .limit(20),

      // 5. Recent photos (last 3 days)
      supabase
        .from("project_photos")
        .select("id, project_id, filename, category, created_at")
        .gte("created_at", threeDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),

      // 6. Recent costs (last 3 days)
      supabase
        .from("project_costs")
        .select("id, project_id, description, amount, cost_date, category, vendor")
        .gte("cost_date", threeDaysAgo.toISOString().split("T")[0])
        .order("cost_date", { ascending: false })
        .limit(20),

      // 7. Active bids (draft/submitted)
      supabase
        .from("bids")
        .select("id, name, client_code, client_name, due_date, estimated_value, status, location, created_at")
        .in("status", ["draft", "submitted"])
        .order("due_date", { ascending: true }),

      // 8. Recent safety checklists (last 3 days)
      supabase
        .from("safety_checklists")
        .select("id, project_id, checklist_date, status, created_at")
        .gte("checklist_date", threeDaysAgo.toISOString().split("T")[0])
        .order("checklist_date", { ascending: false })
        .limit(10),

      // 9. Project staleness — last daily log per active project
      supabase
        .from("daily_logs")
        .select("project_id, log_date")
        .order("log_date", { ascending: false }),
    ]);

    const cards: FeedCard[] = [];

    // --- Build project code lookup ---
    const projects = projectsRes.data || [];
    const projectMap = new Map(
      projects.map((p) => [p.id, { code: p.code || "", clientName: p.client_name || "", description: p.description || "" }])
    );
    const activeProjects = projects.filter((p) => p.status === "active");

    const getProjectCode = (projectId: string | null) => projectMap.get(projectId || "")?.code || "";
    const getClientName = (projectId: string | null) => projectMap.get(projectId || "")?.clientName || "";

    // ========================================
    // TIER 1 — CRITICAL (red)
    // ========================================

    // Overdue invoices
    const invoices = invoicesRes.data || [];
    const overdueInvoices = invoices.filter((inv) => {
      const daysOverdue = getDaysOverdue(inv.due_date);
      return daysOverdue > 0;
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
      const clients = [...new Set(overdueInvoices.map((inv) => inv.client_name).filter(Boolean))];
      cards.push({
        id: "overdue-invoices",
        type: "overdue_invoice",
        priority: "critical",
        title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length !== 1 ? "s" : ""}`,
        description: `$${totalOverdue.toLocaleString()} outstanding. ${clients.slice(0, 3).join(", ")}${clients.length > 3 ? ` +${clients.length - 3} more` : ""}`,
        timestamp: now.toISOString(),
        amount: totalOverdue,
        metadata: {
          count: overdueInvoices.length,
          invoiceNumbers: overdueInvoices.map((inv) => inv.invoice_number),
          clients,
        },
        actionUrl: "/receivables",
        actionLabel: "View Invoices",
      });
    }

    // Negative profit projects — need project totals
    // Sum costs + invoices per project to compute profit
    const { data: projectCostsAll } = await supabase
      .from("project_costs")
      .select("project_id, amount");
    const { data: projectInvoicesAll } = await supabase
      .from("invoices")
      .select("project_id, amount")
      .not("project_id", "is", null);

    const costsByProject = new Map<string, number>();
    for (const c of projectCostsAll || []) {
      costsByProject.set(c.project_id, (costsByProject.get(c.project_id) || 0) + Number(c.amount));
    }
    const revenueByProject = new Map<string, number>();
    for (const inv of projectInvoicesAll || []) {
      if (inv.project_id) {
        revenueByProject.set(inv.project_id, (revenueByProject.get(inv.project_id) || 0) + Number(inv.amount));
      }
    }

    for (const p of activeProjects) {
      const revenue = revenueByProject.get(p.id) || 0;
      const costs = costsByProject.get(p.id) || 0;
      const profit = revenue - costs;
      if (profit < 0 && (revenue > 0 || costs > 0)) {
        cards.push({
          id: `negative-profit-${p.id}`,
          type: "negative_profit",
          priority: "critical",
          title: `Negative Profit: ${p.code || p.description}`,
          description: `Loss of $${Math.abs(profit).toLocaleString()}. Revenue: $${revenue.toLocaleString()}, Costs: $${costs.toLocaleString()}.`,
          timestamp: now.toISOString(),
          projectId: p.id,
          projectCode: p.code || "",
          clientName: p.client_name || "",
          amount: profit,
          metadata: { revenue, costs, profit },
          actionUrl: `/stories/${p.id}`,
          actionLabel: "View Story",
        });
      }
    }

    // Bills due within 48 hours
    const bills = billsRes.data || [];
    const billsDue48h = bills.filter((bill) => {
      const daysUntil = getDaysUntilDue(bill.due_date);
      return daysUntil >= 0 && daysUntil <= 2;
    });

    if (billsDue48h.length > 0) {
      const totalDue = billsDue48h.reduce((sum, bill) => sum + Number(bill.balance), 0);
      cards.push({
        id: "bills-due-48h",
        type: "bill_due_soon",
        priority: "critical",
        title: `${billsDue48h.length} Bill${billsDue48h.length !== 1 ? "s" : ""} Due in 48hrs`,
        description: `$${totalDue.toLocaleString()} due. ${billsDue48h.map((b) => b.vendor_name).slice(0, 3).join(", ")}`,
        timestamp: now.toISOString(),
        amount: totalDue,
        metadata: { count: billsDue48h.length, vendors: billsDue48h.map((b) => b.vendor_name) },
        actionUrl: "/payables",
        actionLabel: "View Bills",
      });
    }

    // ========================================
    // TIER 2 — HIGH (amber)
    // ========================================

    // Bills due within 7 days (but not 48h — those are critical)
    const billsDue7d = bills.filter((bill) => {
      const daysUntil = getDaysUntilDue(bill.due_date);
      return daysUntil > 2 && daysUntil <= 7;
    });

    if (billsDue7d.length > 0) {
      const totalDue = billsDue7d.reduce((sum, bill) => sum + Number(bill.balance), 0);
      cards.push({
        id: "bills-due-7d",
        type: "bill_due_soon",
        priority: "high",
        title: `${billsDue7d.length} Bill${billsDue7d.length !== 1 ? "s" : ""} Due This Week`,
        description: `$${totalDue.toLocaleString()} upcoming. ${billsDue7d.map((b) => b.vendor_name).slice(0, 3).join(", ")}`,
        timestamp: now.toISOString(),
        amount: totalDue,
        metadata: { count: billsDue7d.length },
        actionUrl: "/payables",
        actionLabel: "View Bills",
      });
    }

    // Aging receivables > 30 days
    const agingReceivables = invoices.filter((inv) => {
      if (!inv.issue_date) return false;
      const issueDate = new Date(inv.issue_date);
      return issueDate < thirtyDaysAgo && !overdueInvoices.includes(inv);
    });

    if (agingReceivables.length > 0) {
      const totalAging = agingReceivables.reduce((sum, inv) => sum + Number(inv.balance), 0);
      cards.push({
        id: "aging-receivables",
        type: "aging_receivable",
        priority: "high",
        title: `${agingReceivables.length} Aging Receivable${agingReceivables.length !== 1 ? "s" : ""}`,
        description: `$${totalAging.toLocaleString()} outstanding for 30+ days.`,
        timestamp: now.toISOString(),
        amount: totalAging,
        metadata: { count: agingReceivables.length },
        actionUrl: "/receivables",
        actionLabel: "View Receivables",
      });
    }

    // Stalled projects (no daily log in 3+ days)
    const lastLogByProject = new Map<string, string>();
    for (const log of stalenessRes.data || []) {
      if (!lastLogByProject.has(log.project_id)) {
        lastLogByProject.set(log.project_id, log.log_date);
      }
    }

    for (const p of activeProjects) {
      const lastLog = lastLogByProject.get(p.id);
      if (!lastLog) continue; // No logs ever — separate check
      const lastLogDate = new Date(lastLog);
      const daysSinceLog = Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLog >= 3) {
        cards.push({
          id: `stalled-${p.id}`,
          type: "stalled_project",
          priority: "high",
          title: `No Activity: ${p.code || p.description}`,
          description: `${daysSinceLog} days since last daily log.`,
          timestamp: lastLogDate.toISOString(),
          projectId: p.id,
          projectCode: p.code || "",
          clientName: p.client_name || "",
          metadata: { daysSinceLog, lastLogDate: lastLog },
          actionUrl: `/stories/${p.id}`,
          actionLabel: "View Story",
        });
      }
    }

    // Missing estimates on active projects
    const missingEstimate = activeProjects.filter((p) => !p.estimate_amount);
    if (missingEstimate.length > 0) {
      cards.push({
        id: "missing-estimates",
        type: "missing_estimate",
        priority: "high",
        title: `${missingEstimate.length} Project${missingEstimate.length !== 1 ? "s" : ""} Missing Estimate`,
        description: `${missingEstimate.map((p) => p.code).filter(Boolean).join(", ")}`,
        timestamp: now.toISOString(),
        metadata: { projects: missingEstimate.map((p) => p.code) },
        actionUrl: "/projects",
        actionLabel: "View Projects",
      });
    }

    // Unassigned invoices
    const unassignedInvoices = invoices.filter((inv) => !inv.project_id);
    if (unassignedInvoices.length > 0) {
      const totalUnassigned = unassignedInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
      cards.push({
        id: "unassigned-invoices",
        type: "unassigned_invoice",
        priority: "high",
        title: `${unassignedInvoices.length} Unassigned Invoice${unassignedInvoices.length !== 1 ? "s" : ""}`,
        description: `$${totalUnassigned.toLocaleString()} not linked to a project.`,
        timestamp: now.toISOString(),
        amount: totalUnassigned,
        metadata: { count: unassignedInvoices.length, invoiceNumbers: unassignedInvoices.map((inv) => inv.invoice_number) },
        actionUrl: "/receivables",
        actionLabel: "Assign Invoices",
      });
    }

    // ========================================
    // TIER 3 — MEDIUM (blue, "today's updates")
    // ========================================

    // Recent daily logs
    const dailyLogs = dailyLogsRes.data || [];
    for (const log of dailyLogs) {
      const crewCount = Array.isArray(log.daily_log_crew) ? log.daily_log_crew.length : 0;
      const projCode = getProjectCode(log.project_id);
      const projDesc = projectMap.get(log.project_id)?.description || "";
      cards.push({
        id: `daily-log-${log.id}`,
        type: "daily_log",
        priority: "medium",
        title: `Daily Log: ${projCode || projDesc}`,
        description: `${crewCount > 0 ? `${crewCount} crew` : ""}${log.total_hours ? `, ${log.total_hours}h logged` : ""}. ${log.weather ? `${log.weather}. ` : ""}${log.work_summary?.slice(0, 100) || ""}`,
        timestamp: new Date(log.log_date).toISOString(),
        projectId: log.project_id,
        projectCode: projCode,
        clientName: getClientName(log.project_id),
        metadata: {
          crewCount,
          totalHours: log.total_hours,
          weather: log.weather,
        },
        actionUrl: `/stories/${log.project_id}`,
        actionLabel: "Read More",
      });
    }

    // Recent photos (grouped by project + date)
    const photos = photosRes.data || [];
    const photoGroups = new Map<string, typeof photos>();
    for (const photo of photos) {
      const key = photo.project_id;
      if (!photoGroups.has(key)) photoGroups.set(key, []);
      photoGroups.get(key)!.push(photo);
    }
    for (const [projectId, projectPhotos] of photoGroups) {
      const projCode = getProjectCode(projectId);
      const projDesc = projectMap.get(projectId)?.description || "";
      cards.push({
        id: `photos-${projectId}-${projectPhotos[0].id}`,
        type: "new_photos",
        priority: "medium",
        title: `${projectPhotos.length} New Photo${projectPhotos.length !== 1 ? "s" : ""}: ${projCode || projDesc}`,
        description: `${projectPhotos.map((p) => p.category).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")} photos uploaded.`,
        timestamp: projectPhotos[0].created_at,
        projectId,
        projectCode: projCode,
        clientName: getClientName(projectId),
        metadata: { count: projectPhotos.length, categories: [...new Set(projectPhotos.map((p) => p.category))] },
        actionUrl: `/stories/${projectId}`,
        actionLabel: "View Gallery",
      });
    }

    // Recent costs
    const costs = costsRes.data || [];
    for (const cost of costs.slice(0, 5)) {
      const projCode = getProjectCode(cost.project_id);
      cards.push({
        id: `cost-${cost.id}`,
        type: "cost_entry",
        priority: "medium",
        title: `Cost Entry: ${projCode || cost.description}`,
        description: `$${Number(cost.amount).toLocaleString()} — ${cost.category}${cost.vendor ? ` (${cost.vendor})` : ""}`,
        timestamp: new Date(cost.cost_date).toISOString(),
        projectId: cost.project_id,
        projectCode: projCode,
        amount: Number(cost.amount),
        metadata: { category: cost.category, vendor: cost.vendor },
        actionUrl: `/stories/${cost.project_id}`,
        actionLabel: "View Costs",
      });
    }

    // Safety checklists
    const safetyItems = safetyRes.data || [];
    for (const item of safetyItems) {
      const projCode = getProjectCode(item.project_id);
      cards.push({
        id: `safety-${item.id}`,
        type: "safety_checklist",
        priority: "medium",
        title: `Safety Checklist: ${projCode}`,
        description: `Checklist ${item.status || "completed"} on ${new Date(item.checklist_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}.`,
        timestamp: item.created_at,
        projectId: item.project_id,
        projectCode: projCode,
        metadata: { status: item.status },
        actionUrl: `/stories/${item.project_id}`,
        actionLabel: "View Details",
      });
    }

    // ========================================
    // TIER 4 — INFO (neutral, "project highlights")
    // ========================================

    // Project progress estimates
    for (const p of activeProjects) {
      const revenue = revenueByProject.get(p.id) || 0;
      const costs = costsByProject.get(p.id) || 0;
      const estimate = p.estimate_amount ? Number(p.estimate_amount) : 0;
      if (estimate > 0 && costs > 0) {
        const progress = Math.round((costs / estimate) * 100);
        cards.push({
          id: `progress-${p.id}`,
          type: "project_progress",
          priority: "info",
          title: `${p.code || p.description} — ${Math.min(progress, 100)}% through estimate`,
          description: `$${costs.toLocaleString()} spent of $${estimate.toLocaleString()} estimated. Revenue: $${revenue.toLocaleString()}.`,
          timestamp: p.updated_at,
          projectId: p.id,
          projectCode: p.code || "",
          clientName: p.client_name || "",
          metadata: { progress: Math.min(progress, 100), estimate, costs, revenue },
          actionUrl: `/stories/${p.id}`,
          actionLabel: "Read Story",
        });
      }
    }

    // Upcoming bid deadlines
    const bids = bidsRes.data || [];
    for (const bid of bids.slice(0, 5)) {
      if (bid.due_date) {
        const daysUntil = getDaysUntilDue(bid.due_date);
        cards.push({
          id: `bid-${bid.id}`,
          type: "upcoming_bid",
          priority: daysUntil <= 3 ? "high" : "info",
          title: `Bid: ${bid.name}`,
          description: `${bid.client_name ? `${bid.client_name} — ` : ""}Due ${new Date(bid.due_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}${bid.estimated_value ? `. Est: $${Number(bid.estimated_value).toLocaleString()}` : ""}`,
          timestamp: bid.created_at,
          projectCode: bid.client_code || "",
          clientName: bid.client_name || "",
          amount: bid.estimated_value ? Number(bid.estimated_value) : undefined,
          metadata: { daysUntil, status: bid.status, location: bid.location },
          actionUrl: "/bids",
          actionLabel: "View Bid",
        });
      }
    }

    // ========================================
    // SORT: priority tier → recency
    // ========================================

    const priorityOrder: Record<FeedPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      info: 3,
    };

    cards.sort((a, b) => {
      const tierDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (tierDiff !== 0) return tierDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // ========================================
    // UPCOMING BIDS (separate section)
    // ========================================

    const upcomingBids: UpcomingProject[] = bids.map((bid) => ({
      id: bid.id,
      name: bid.name,
      clientCode: bid.client_code || null,
      clientName: bid.client_name || null,
      dueDate: bid.due_date || null,
      estimatedValue: bid.estimated_value ? Number(bid.estimated_value) : null,
      status: bid.status,
      location: bid.location || null,
    }));

    const response: SmartFeedResponse = {
      cards,
      generatedAt: now.toISOString(),
      upcomingBids,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Smart Feed API error:", error);
    return NextResponse.json(
      { error: "Failed to assemble smart feed" },
      { status: 500 }
    );
  }
}

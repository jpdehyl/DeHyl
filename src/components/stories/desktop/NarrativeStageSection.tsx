"use client";

import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getStageConfig } from "@/lib/stories/stage-config";
import type { StoryStage, StorySubstep } from "@/types/stories";

interface NarrativeStageSectionProps {
  stage: StoryStage;
  isLast: boolean;
  stageNumber: number;
}

export function NarrativeStageSection({ stage, isLast, stageNumber }: NarrativeStageSectionProps) {
  const config = getStageConfig(stage.slug);

  return (
    <section className={cn("relative pb-12", !isLast && "border-b border-border/50 mb-12")}>
      <div className="flex items-start gap-4 mb-6">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0 mt-0.5">
          {stageNumber}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground leading-tight">
            {stage.label}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        {stage.completedAt && (
          <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full shrink-0">
            Completed
          </span>
        )}
        {stage.isCurrent && !stage.completedAt && (
          <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-full shrink-0">
            Current
          </span>
        )}
      </div>

      <div className="pl-12 space-y-6">
        {stage.substeps.map((substep) => (
          <NarrativeSubstep key={substep.id} substep={substep} stageSlug={stage.slug} />
        ))}
      </div>
    </section>
  );
}

function NarrativeSubstep({ substep, stageSlug }: { substep: StorySubstep; stageSlug: string }) {
  switch (stageSlug) {
    case "estimate":
      return <EstimateNarrative substep={substep} />;
    case "crew":
      return <CrewNarrative substep={substep} />;
    case "daily_logs":
      return <DailyLogNarrative substep={substep} />;
    case "completion":
      return <CompletionNarrative substep={substep} />;
    case "invoicing":
      return <InvoicingNarrative substep={substep} />;
    default:
      return (
        <div className="text-sm text-muted-foreground">
          {substep.title}
        </div>
      );
  }
}

function EstimateNarrative({ substep }: { substep: StorySubstep }) {
  const data = substep.data as Record<string, unknown>;

  if (substep.type === "metric") {
    const totalAmount = data.totalAmount as number;
    const status = data.status as string;
    const name = data.name as string;
    return (
      <div className="bg-muted/30 rounded-lg p-5 border border-border/40">
        {name && <p className="text-sm font-medium text-foreground mb-1">{name}</p>}
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {formatCurrency(totalAmount ?? 0)}
        </p>
        {status && (
          <p className="text-xs text-muted-foreground mt-1.5 capitalize">{status}</p>
        )}
      </div>
    );
  }

  if (substep.type === "chart") {
    const categoryTotals = (data.categoryTotals ?? {}) as Record<string, number>;
    const entries = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
    const total = entries.reduce((sum, [, val]) => sum + val, 0);

    return (
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          Cost Breakdown
        </p>
        <div className="space-y-2">
          {entries.map(([category, amount]) => {
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-2 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/20"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-foreground/70 capitalize truncate">{category}</span>
                </div>
                <span className="text-foreground font-medium tabular-nums ml-3">
                  {formatCurrency(amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function CrewNarrative({ substep }: { substep: StorySubstep }) {
  const data = substep.data as Record<string, unknown>;
  const totalCrew = data.totalCrew as number;
  const roleGroups = (data.roleGroups ?? {}) as Record<string, string[]>;
  const members = (data.members ?? []) as Array<{
    id: string; name: string; role: string; company: string; employmentType: string;
  }>;

  const roleSummary = Object.entries(roleGroups)
    .map(([role, names]) => `${names.length} ${role}`)
    .join(", ");

  return (
    <div>
      <p className="text-sm text-foreground/80 leading-relaxed mb-4">
        {totalCrew} crew member{totalCrew !== 1 ? "s" : ""} assigned{roleSummary ? ` -- ${roleSummary}` : ""}.
      </p>

      {members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.role}
                  {m.company ? ` · ${m.company}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyLogNarrative({ substep }: { substep: StorySubstep }) {
  const data = substep.data as Record<string, unknown>;
  const dateStr = data.date as string;
  const workSummary = data.workSummary as string;
  const weather = data.weather as string;
  const totalHours = data.totalHours as number;
  const crewCount = data.crewCount as number;
  const notes = data.notes as string;
  const areasWorked = (data.areasWorked ?? []) as string[];
  const crew = (data.crew ?? []) as Array<{ name: string; hours: number; role: string }>;

  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : substep.title;

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground">{formattedDate}</h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {weather && <span>{weather}</span>}
          {totalHours > 0 && <span>{totalHours}h</span>}
          {crewCount > 0 && <span>{crewCount} crew</span>}
        </div>
      </div>

      {workSummary && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-2">{workSummary}</p>
      )}

      {areasWorked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {areasWorked.map((area) => (
            <span
              key={area}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {area}
            </span>
          ))}
        </div>
      )}

      {crew.length > 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Crew: {crew.map((c) => `${c.name} (${c.hours}h)`).join(", ")}
        </p>
      )}

      {notes && (
        <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{notes}</p>
      )}
    </div>
  );
}

function CompletionNarrative({ substep }: { substep: StorySubstep }) {
  const data = substep.data as Record<string, unknown>;

  if (substep.type === "photo_grid") {
    const before = (data.before ?? []) as Array<{ url: string; thumbnail: string; caption?: string }>;
    const after = (data.after ?? []) as Array<{ url: string; thumbnail: string; caption?: string }>;
    const all = (data.all ?? []) as Array<{ url: string; thumbnail: string; caption?: string; category?: string }>;
    const totalPhotos = data.totalPhotos as number;
    const photos = all.length > 0 ? all : [...before, ...after];

    return (
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""} documented
        </p>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
            {photos.slice(0, 6).map((photo, i) => (
              <div key={i} className="aspect-square bg-muted rounded-md overflow-hidden">
                <img
                  src={photo.thumbnail || photo.url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
        {photos.length > 6 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{photos.length - 6} more
          </p>
        )}
      </div>
    );
  }

  if (substep.type === "metric") {
    const estimateAmount = data.estimateAmount as number;
    const finalCost = data.finalCost as number;
    const finalRevenue = data.finalRevenue as number;
    const profitMargin = data.profitMargin as number;
    const status = data.status as string;

    return (
      <div className="bg-muted/30 rounded-lg p-5 border border-border/40">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-foreground">Project Summary</p>
          {status && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full capitalize",
              status === "closed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
            )}>
              {status}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {estimateAmount != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Estimate</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(estimateAmount)}</p>
            </div>
          )}
          {finalCost != null && finalCost > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Actual Cost</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(finalCost)}</p>
            </div>
          )}
          {finalRevenue != null && finalRevenue > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Revenue</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(finalRevenue)}</p>
            </div>
          )}
          {profitMargin != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Margin</p>
              <p className={cn(
                "text-sm font-semibold",
                profitMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function InvoicingNarrative({ substep }: { substep: StorySubstep }) {
  const data = substep.data as Record<string, unknown>;

  if (data.totalInvoiced !== undefined) {
    const totalInvoiced = data.totalInvoiced as number;
    const totalPaid = data.totalPaid as number;
    const totalOutstanding = data.totalOutstanding as number;
    const invoiceCount = data.invoiceCount as number;
    const overdueCount = data.overdueCount as number;
    const paidPercentage = data.paidPercentage as number;

    return (
      <div className="bg-muted/30 rounded-lg p-5 border border-border/40">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {formatCurrency(totalInvoiced)}
          </p>
          <p className="text-xs text-muted-foreground">
            {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              paidPercentage >= 100 ? "bg-emerald-500" : paidPercentage >= 50 ? "bg-blue-500" : "bg-amber-500"
            )}
            style={{ width: `${Math.min(paidPercentage, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Collection</p>
            <p className="text-sm font-semibold text-foreground">{paidPercentage}%</p>
          </div>
        </div>

        {overdueCount > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-3 pt-3 border-t border-border/30">
            {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""} -- follow up needed
          </p>
        )}
      </div>
    );
  }

  if (data.invoiceNumber !== undefined) {
    const invoiceNumber = data.invoiceNumber as string;
    const amount = data.amount as number;
    const balance = data.balance as number;
    const status = data.status as string;
    const dueDate = data.dueDate as string;

    return (
      <div className="flex items-center justify-between py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">#{invoiceNumber}</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full capitalize",
            status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : status === "overdue" ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          )}>
            {status}
          </span>
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground">{formatCurrency(amount)}</p>
          {balance > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(balance)} remaining
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

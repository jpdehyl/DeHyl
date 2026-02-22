"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  FileQuestion,
  ClipboardList,
  ChevronRight,
  Link2Off,
  Lightbulb,
  CalendarClock,
  TrendingDown,
  CreditCard,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { Alert, AlertType, AlertSeverity } from "@/types";

interface AlertsPanelProps {
  alerts: Alert[];
}

interface AlertConfig {
  icon: typeof AlertTriangle;
  title: string;
  href: string;
  color: string;
  bgColor: string;
  severity: AlertSeverity;
}

const alertConfig: Record<AlertType, AlertConfig> = {
  overdue_invoice: {
    icon: AlertTriangle,
    title: "Overdue Invoices",
    href: "/receivables?filter=overdue",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    severity: "critical",
  },
  bills_due_soon: {
    icon: Clock,
    title: "Bills Due This Week",
    href: "/payables?filter=due-soon",
    color: "text-warning",
    bgColor: "bg-warning/10",
    severity: "warning",
  },
  missing_estimate: {
    icon: FileQuestion,
    title: "Missing Estimates",
    href: "/projects?filter=missing-estimate",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    severity: "info",
  },
  missing_pbs: {
    icon: ClipboardList,
    title: "Missing PBS",
    href: "/projects?filter=missing-pbs",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    severity: "info",
  },
  unassigned_invoices: {
    icon: Link2Off,
    title: "Unassigned Invoices",
    href: "/receivables?filter=unassigned",
    color: "text-warning",
    bgColor: "bg-warning/10",
    severity: "warning",
  },
  invoice_suggestions: {
    icon: Lightbulb,
    title: "Invoice Match Suggestions",
    href: "/receivables?filter=unassigned",
    color: "text-primary",
    bgColor: "bg-primary/10",
    severity: "info",
  },
  aging_receivables: {
    icon: CalendarClock,
    title: "Aging Receivables (30+ days)",
    href: "/receivables?filter=overdue",
    color: "text-warning",
    bgColor: "bg-warning/10",
    severity: "warning",
  },
  negative_profit: {
    icon: TrendingDown,
    title: "Projects with Negative Profit",
    href: "/projects?filter=has-issues",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    severity: "critical",
  },
  amex_statement_due: {
    icon: CreditCard,
    title: "Amex Statement Update Due",
    href: "/cash-flow",
    color: "text-warning",
    bgColor: "bg-warning/10",
    severity: "warning",
  },
};

const severityOrder: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  // Sort alerts by severity
  const sortedAlerts = [...alerts].sort((a, b) => {
    const aConfig = alertConfig[a.type];
    const bConfig = alertConfig[b.type];
    const aSeverity = a.severity || aConfig.severity;
    const bSeverity = b.severity || bConfig.severity;
    return severityOrder[aSeverity] - severityOrder[bSeverity];
  });

  // Count by severity
  const criticalCount = sortedAlerts.filter(
    (a) => (a.severity || alertConfig[a.type].severity) === "critical"
  ).length;
  const warningCount = sortedAlerts.filter(
    (a) => (a.severity || alertConfig[a.type].severity) === "warning"
  ).length;

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>Action items requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-success/10 p-3 mb-3">
              <svg
                className="h-6 w-6 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              No alerts at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Action items requiring attention</CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="gap-1">
                <Clock className="h-3 w-3" />
                {warningCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {sortedAlerts.map((alert, index) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          const severity = alert.severity || config.severity;

          return (
            <Link
              key={index}
              href={config.href}
              className={cn(
                "group flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                severity === "critical" && "border-destructive/50",
                severity === "warning" && "border-warning/50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  config.bgColor
                )}
              >
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">
                    {config.title}
                  </p>
                  {severity === "critical" && (
                    <Badge variant="destructive" className="text-xs py-0 px-1.5">
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {alert.count} {alert.count === 1 ? "item" : "items"}
                  {alert.total && ` - ${formatCurrency(alert.total)}`}
                </p>
                {alert.projects && alert.projects.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Projects: {alert.projects.slice(0, 3).join(", ")}
                    {alert.projects.length > 3 && ` +${alert.projects.length - 3} more`}
                  </p>
                )}
                {alert.invoices && alert.invoices.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Invoices: {alert.invoices.slice(0, 3).join(", ")}
                    {alert.invoices.length > 3 && ` +${alert.invoices.length - 3} more`}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

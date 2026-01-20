"use client";

import React from "react";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Folder,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// -------------------------------------------
// Explicit Type Definitions
// -------------------------------------------
type Variant = "default" | "success" | "warning" | "danger";
type Size = "sm" | "md" | "lg";
type ChartColor = "primary" | "success" | "warning" | "danger";

interface KpiCardComponent {
  component: "kpi-card";
  props: {
    title: string;
    value: number;
    format?: "currency" | "number";
    variant?: Variant;
    subtitle?: string;
    icon?: string;
    trend?: { value: number; isPositive: boolean };
  };
}

interface StatCardComponent {
  component: "stat-card";
  props: {
    label: string;
    value: string;
    description?: string;
    variant?: Variant;
  };
}

interface AlertItemComponent {
  component: "alert-item";
  props: {
    type: string;
    count: number;
    total?: number;
    severity?: "critical" | "warning" | "info";
  };
}

interface DataTableComponent {
  component: "data-table";
  props: {
    title?: string;
    columns: Array<{ key: string; label: string; format?: string }>;
    rows: Array<Record<string, unknown>>;
    emptyMessage?: string;
  };
}

interface LineChartComponent {
  component: "line-chart";
  props: {
    title: string;
    description?: string;
    data: Array<Record<string, unknown>>;
    xKey: string;
    lines: Array<{ dataKey: string; label: string; color?: ChartColor }>;
    yAxisFormat?: "currency" | "number" | "percent";
  };
}

interface BarChartComponent {
  component: "bar-chart";
  props: {
    title: string;
    description?: string;
    data: Array<Record<string, unknown>>;
    xKey: string;
    bars: Array<{ dataKey: string; label: string; color?: ChartColor }>;
    layout?: "vertical" | "horizontal";
  };
}

interface ProgressCardComponent {
  component: "progress-card";
  props: {
    title: string;
    current: number;
    target: number;
    format?: "currency" | "number" | "percent";
    variant?: Variant;
  };
}

interface TextBlockComponent {
  component: "text-block";
  props: {
    content: string;
    variant?: "heading" | "subheading" | "body" | "caption";
  };
}

interface GridComponent {
  component: "grid";
  props: { columns?: number; gap?: Size };
  children?: JsonComponent[];
}

interface StackComponent {
  component: "stack";
  props: {
    direction?: "horizontal" | "vertical";
    gap?: Size;
    align?: "start" | "center" | "end" | "stretch";
  };
  children?: JsonComponent[];
}

interface CardContainerComponent {
  component: "card";
  props: { title?: string; description?: string; padding?: Size };
  children?: JsonComponent[];
}

interface ConditionalComponent {
  component: "conditional";
  props: {
    condition: string;
    operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "exists" | "notExists";
    value?: unknown;
  };
  children?: JsonComponent[];
  fallback?: JsonComponent[];
}

interface ActionButtonComponent {
  component: "action-button";
  props: {
    label: string;
    action: string;
    variant?: "default" | "primary" | "secondary" | "destructive" | "outline" | "ghost";
    size?: Size;
  };
}

interface QuickActionsComponent {
  component: "quick-actions";
  props: {
    actions: Array<{ id: string; label: string; icon?: string; href?: string }>;
  };
}

type JsonComponent =
  | KpiCardComponent
  | StatCardComponent
  | AlertItemComponent
  | DataTableComponent
  | LineChartComponent
  | BarChartComponent
  | ProgressCardComponent
  | TextBlockComponent
  | GridComponent
  | StackComponent
  | CardContainerComponent
  | ConditionalComponent
  | ActionButtonComponent
  | QuickActionsComponent;

export interface Dashboard {
  version: 1;
  title?: string;
  layout: JsonComponent[];
  data?: Record<string, unknown>;
}

// -------------------------------------------
// Icon Mapping
// -------------------------------------------
const iconMap: Record<string, typeof DollarSign> = {
  "dollar-sign": DollarSign,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  folder: Folder,
  "file-text": FileText,
  "alert-triangle": AlertTriangle,
  "check-circle": CheckCircle,
  clock: Clock,
  users: Users,
};

// -------------------------------------------
// Color Mapping
// -------------------------------------------
const variantColors: Record<Variant, string> = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const variantBgColors: Record<Variant, string> = {
  default: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
};

const chartColors: Record<ChartColor, string> = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--destructive))",
};

// -------------------------------------------
// Gap Mapping
// -------------------------------------------
const gapClasses: Record<Size, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

// -------------------------------------------
// Component Renderers
// -------------------------------------------

interface RenderContext {
  data?: Record<string, unknown>;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

function renderKpiCard(component: KpiCardComponent, _ctx: RenderContext) {
  const { title, value, format = "currency", variant = "default", icon = "dollar-sign", subtitle, trend } = component.props;
  const Icon = iconMap[icon] || DollarSign;
  const formattedValue = format === "currency" ? formatCurrency(value) : value.toLocaleString();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", variantColors[variant])}>
              {formattedValue}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn("text-xs", trend.isPositive ? "text-success" : "text-destructive")}>
                {trend.isPositive ? "+" : ""}{trend.value}% from last month
              </p>
            )}
          </div>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", variantBgColors[variant])}>
            <Icon className={cn("h-6 w-6", variantColors[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderStatCard(component: StatCardComponent) {
  const { label, value, description, variant = "default" } = component.props;

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", variantColors[variant])}>{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

function renderAlertItem(component: AlertItemComponent) {
  const { type, count, total, severity = "info" } = component.props;

  const alertConfig: Record<string, { icon: typeof AlertTriangle; label: string; href: string }> = {
    overdue_invoice: { icon: AlertTriangle, label: "Overdue Invoices", href: "/receivables?filter=overdue" },
    bills_due_soon: { icon: Clock, label: "Bills Due Soon", href: "/payables?filter=due-soon" },
    missing_estimate: { icon: FileText, label: "Missing Estimates", href: "/projects?filter=missing-estimate" },
    missing_pbs: { icon: Folder, label: "Missing PBS", href: "/projects?filter=missing-pbs" },
    unassigned_invoices: { icon: FileText, label: "Unassigned Invoices", href: "/receivables?filter=unassigned" },
    invoice_suggestions: { icon: CheckCircle, label: "Invoice Suggestions", href: "/receivables" },
    aging_receivables: { icon: Clock, label: "Aging Receivables", href: "/receivables?filter=overdue" },
    negative_profit: { icon: TrendingDown, label: "Negative Profit Projects", href: "/projects?filter=has-issues" },
  };

  const config = alertConfig[type] || { icon: AlertTriangle, label: type, href: "/" };
  const Icon = config.icon;

  const severityStyles = {
    critical: { border: "border-destructive/50", bg: "bg-destructive/10", text: "text-destructive" },
    warning: { border: "border-warning/50", bg: "bg-warning/10", text: "text-warning" },
    info: { border: "border-muted", bg: "bg-muted", text: "text-muted-foreground" },
  };

  const styles = severityStyles[severity];

  return (
    <Link
      href={config.href}
      className={cn(
        "group flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
        styles.border
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", styles.bg)}>
        <Icon className={cn("h-5 w-5", styles.text)} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-none">{config.label}</p>
          {severity === "critical" && (
            <Badge variant="destructive" className="text-xs py-0 px-1.5">Urgent</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}
          {total && ` - ${formatCurrency(total)}`}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function renderDataTable(component: DataTableComponent) {
  const { title, columns, rows, emptyMessage = "No data available" } = component.props;

  const formatCell = (value: unknown, format?: string) => {
    if (value === null || value === undefined) return "-";
    switch (format) {
      case "currency":
        return formatCurrency(Number(value));
      case "date":
        return formatDate(value as string);
      case "badge":
        return <Badge variant="secondary">{String(value)}</Badge>;
      default:
        return String(value);
    }
  };

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {formatCell(row[col.key], col.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function renderLineChart(component: LineChartComponent) {
  const { title, description, data, xKey, lines, yAxisFormat = "currency" } = component.props;

  const formatYAxis = (value: number) => {
    switch (yAxisFormat) {
      case "currency":
        return `$${(value / 1000).toFixed(0)}k`;
      case "percent":
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const formatTooltip = (value: number) => {
    switch (yAxisFormat) {
      case "currency":
        return formatCurrency(value);
      case "percent":
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                formatter={(value) => formatTooltip(value as number)}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.label}
                  stroke={chartColors[line.color || "primary"]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function renderBarChart(component: BarChartComponent) {
  const { title, description, data, xKey, bars, layout = "vertical" } = component.props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={data}
              layout={layout === "horizontal" ? "vertical" : "horizontal"}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey={layout === "horizontal" ? undefined : xKey} type={layout === "horizontal" ? "number" : "category"} />
              <YAxis dataKey={layout === "horizontal" ? xKey : undefined} type={layout === "horizontal" ? "category" : "number"} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {bars.map((bar) => (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  name={bar.label}
                  fill={chartColors[bar.color || "primary"]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function renderProgressCard(component: ProgressCardComponent) {
  const { title, current, target, format = "currency", variant = "default" } = component.props;
  const percentage = Math.min(100, Math.round((current / target) * 100));

  const formatValue = (v: number) => {
    switch (format) {
      case "currency":
        return formatCurrency(v);
      case "percent":
        return `${v}%`;
      default:
        return v.toLocaleString();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{title}</p>
            <p className={cn("text-sm font-medium", variantColors[variant])}>{percentage}%</p>
          </div>
          <Progress value={percentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatValue(current)}</span>
            <span>of {formatValue(target)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderTextBlock(component: TextBlockComponent) {
  const { content, variant = "body" } = component.props;

  const classes = {
    heading: "text-2xl font-bold",
    subheading: "text-lg font-semibold",
    body: "text-sm",
    caption: "text-xs text-muted-foreground",
  };

  return <p className={classes[variant]}>{content}</p>;
}

function renderGrid(component: GridComponent, ctx: RenderContext) {
  const { columns = 2, gap = "md" } = component.props;
  const colClasses: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid", colClasses[columns] || colClasses[2], gapClasses[gap])}>
      {component.children?.map((child, i) => (
        <div key={i}>{renderComponent(child, ctx)}</div>
      ))}
    </div>
  );
}

function renderStack(component: StackComponent, ctx: RenderContext) {
  const { direction = "vertical", gap = "md", align = "stretch" } = component.props;

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row" : "flex-col",
        gapClasses[gap],
        alignClasses[align]
      )}
    >
      {component.children?.map((child, i) => (
        <div key={i} className={direction === "horizontal" ? "" : "w-full"}>
          {renderComponent(child, ctx)}
        </div>
      ))}
    </div>
  );
}

function renderCardContainer(component: CardContainerComponent, ctx: RenderContext) {
  const { title, description, padding = "md" } = component.props;

  const paddingClasses: Record<Size, string> = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={title || description ? "" : paddingClasses[padding]}>
        <div className="space-y-4">
          {component.children?.map((child, i) => (
            <div key={i}>{renderComponent(child, ctx)}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function renderConditional(component: ConditionalComponent, ctx: RenderContext) {
  const { condition, operator = "exists", value } = component.props;

  const resolveValue = (path: string): unknown => {
    if (!ctx.data) return undefined;
    return path.split(".").reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], ctx.data as unknown);
  };

  const dataValue = resolveValue(condition);

  const evaluateCondition = (): boolean => {
    switch (operator) {
      case "exists":
        return dataValue !== undefined && dataValue !== null;
      case "notExists":
        return dataValue === undefined || dataValue === null;
      case "eq":
        return dataValue === value;
      case "neq":
        return dataValue !== value;
      case "gt":
        return Number(dataValue) > Number(value);
      case "gte":
        return Number(dataValue) >= Number(value);
      case "lt":
        return Number(dataValue) < Number(value);
      case "lte":
        return Number(dataValue) <= Number(value);
      default:
        return false;
    }
  };

  const shouldRender = evaluateCondition();
  const childrenToRender = shouldRender ? component.children : component.fallback;

  return (
    <>
      {childrenToRender?.map((child, i) => (
        <React.Fragment key={i}>{renderComponent(child, ctx)}</React.Fragment>
      ))}
    </>
  );
}

function renderActionButton(component: ActionButtonComponent, ctx: RenderContext) {
  const { label, action, variant = "default", size = "md" } = component.props;

  const sizeClasses: Record<Size, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  };

  const handleClick = () => {
    ctx.onAction?.(action);
  };

  return (
    <Button
      variant={variant === "primary" ? "default" : variant as "default" | "secondary" | "destructive" | "outline" | "ghost"}
      className={sizeClasses[size]}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}

function renderQuickActions(component: QuickActionsComponent) {
  const { actions } = component.props;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        action.href ? (
          <Link key={action.id} href={action.href}>
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          </Link>
        ) : (
          <Button key={action.id} variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        )
      ))}
    </div>
  );
}

// -------------------------------------------
// Main Render Function
// -------------------------------------------
export function renderComponent(component: JsonComponent, ctx: RenderContext = {}): React.ReactNode {
  switch (component.component) {
    case "kpi-card":
      return renderKpiCard(component, ctx);
    case "stat-card":
      return renderStatCard(component);
    case "alert-item":
      return renderAlertItem(component);
    case "data-table":
      return renderDataTable(component);
    case "line-chart":
      return renderLineChart(component);
    case "bar-chart":
      return renderBarChart(component);
    case "progress-card":
      return renderProgressCard(component);
    case "text-block":
      return renderTextBlock(component);
    case "grid":
      return renderGrid(component, ctx);
    case "stack":
      return renderStack(component, ctx);
    case "card":
      return renderCardContainer(component, ctx);
    case "conditional":
      return renderConditional(component, ctx);
    case "action-button":
      return renderActionButton(component, ctx);
    case "quick-actions":
      return renderQuickActions(component);
    default:
      console.warn("Unknown component:", (component as { component: string }).component);
      return null;
  }
}

// -------------------------------------------
// JsonRenderer Component
// -------------------------------------------
interface JsonRendererProps {
  dashboard: Dashboard;
  data?: Record<string, unknown>;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

export function JsonRenderer({ dashboard, data, onAction }: JsonRendererProps) {
  const ctx: RenderContext = { data: { ...dashboard.data, ...data }, onAction };

  return (
    <div className="space-y-6">
      {dashboard.title && (
        <h1 className="text-3xl font-bold">{dashboard.title}</h1>
      )}
      {dashboard.layout.map((component, index) => (
        <React.Fragment key={index}>
          {renderComponent(component, ctx)}
        </React.Fragment>
      ))}
    </div>
  );
}

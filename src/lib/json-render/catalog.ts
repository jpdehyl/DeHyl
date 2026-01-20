import { z } from "zod";

// ===========================================
// DeHyl Financials JSON-Render Component Catalog
// Defines all components available for AI-generated UI
// ===========================================

// -------------------------------------------
// Base Schemas
// -------------------------------------------
const VariantSchema = z.enum(["default", "success", "warning", "danger"]);
const SizeSchema = z.enum(["sm", "md", "lg"]);

// -------------------------------------------
// KPI Card Component
// -------------------------------------------
export const KpiCardSchema = z.object({
  component: z.literal("kpi-card"),
  props: z.object({
    title: z.string().describe("Title of the KPI"),
    value: z.number().describe("Numeric value to display"),
    format: z.enum(["currency", "number"]).optional().default("currency"),
    variant: VariantSchema.optional().default("default"),
    subtitle: z.string().optional(),
    icon: z.enum([
      "dollar-sign",
      "credit-card",
      "trending-up",
      "trending-down",
      "folder",
      "file-text",
      "alert-triangle",
      "check-circle",
      "clock",
      "users",
    ]).optional().default("dollar-sign"),
    trend: z.object({
      value: z.number(),
      isPositive: z.boolean(),
    }).optional(),
  }),
});

// -------------------------------------------
// Stat Card Component
// -------------------------------------------
export const StatCardSchema = z.object({
  component: z.literal("stat-card"),
  props: z.object({
    label: z.string(),
    value: z.string(),
    description: z.string().optional(),
    variant: VariantSchema.optional().default("default"),
  }),
});

// -------------------------------------------
// Alert Item Component
// -------------------------------------------
export const AlertItemSchema = z.object({
  component: z.literal("alert-item"),
  props: z.object({
    type: z.enum([
      "overdue_invoice",
      "bills_due_soon",
      "missing_estimate",
      "missing_pbs",
      "unassigned_invoices",
      "invoice_suggestions",
      "aging_receivables",
      "negative_profit",
    ]),
    count: z.number(),
    total: z.number().optional(),
    severity: z.enum(["critical", "warning", "info"]).optional(),
  }),
});

// -------------------------------------------
// Data Table Component
// -------------------------------------------
export const DataTableSchema = z.object({
  component: z.literal("data-table"),
  props: z.object({
    title: z.string().optional(),
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      format: z.enum(["text", "currency", "date", "badge"]).optional().default("text"),
    })),
    rows: z.array(z.record(z.string(), z.unknown())),
    emptyMessage: z.string().optional().default("No data available"),
  }),
});

// -------------------------------------------
// Line Chart Component
// -------------------------------------------
export const LineChartSchema = z.object({
  component: z.literal("line-chart"),
  props: z.object({
    title: z.string(),
    description: z.string().optional(),
    data: z.array(z.record(z.string(), z.unknown())),
    xKey: z.string().describe("Key for X axis"),
    lines: z.array(z.object({
      dataKey: z.string(),
      label: z.string(),
      color: z.enum(["primary", "success", "warning", "danger"]).optional().default("primary"),
    })),
    yAxisFormat: z.enum(["currency", "number", "percent"]).optional().default("currency"),
  }),
});

// -------------------------------------------
// Bar Chart Component
// -------------------------------------------
export const BarChartSchema = z.object({
  component: z.literal("bar-chart"),
  props: z.object({
    title: z.string(),
    description: z.string().optional(),
    data: z.array(z.record(z.string(), z.unknown())),
    xKey: z.string(),
    bars: z.array(z.object({
      dataKey: z.string(),
      label: z.string(),
      color: z.enum(["primary", "success", "warning", "danger"]).optional().default("primary"),
    })),
    layout: z.enum(["vertical", "horizontal"]).optional().default("vertical"),
  }),
});

// -------------------------------------------
// Progress Card Component
// -------------------------------------------
export const ProgressCardSchema = z.object({
  component: z.literal("progress-card"),
  props: z.object({
    title: z.string(),
    current: z.number(),
    target: z.number(),
    format: z.enum(["currency", "number", "percent"]).optional().default("currency"),
    variant: VariantSchema.optional().default("default"),
  }),
});

// -------------------------------------------
// Text Block Component
// -------------------------------------------
export const TextBlockSchema = z.object({
  component: z.literal("text-block"),
  props: z.object({
    content: z.string(),
    variant: z.enum(["heading", "subheading", "body", "caption"]).optional().default("body"),
  }),
});

// -------------------------------------------
// Grid Layout Component
// -------------------------------------------
export const GridSchema = z.object({
  component: z.literal("grid"),
  props: z.object({
    columns: z.number().min(1).max(4).optional().default(2),
    gap: SizeSchema.optional().default("md"),
  }),
  children: z.array(z.lazy((): z.ZodType => ComponentSchema)),
});

// -------------------------------------------
// Stack Layout Component
// -------------------------------------------
export const StackSchema = z.object({
  component: z.literal("stack"),
  props: z.object({
    direction: z.enum(["horizontal", "vertical"]).optional().default("vertical"),
    gap: SizeSchema.optional().default("md"),
    align: z.enum(["start", "center", "end", "stretch"]).optional().default("stretch"),
  }),
  children: z.array(z.lazy((): z.ZodType => ComponentSchema)),
});

// -------------------------------------------
// Card Container Component
// -------------------------------------------
export const CardContainerSchema = z.object({
  component: z.literal("card"),
  props: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    padding: SizeSchema.optional().default("md"),
  }),
  children: z.array(z.lazy((): z.ZodType => ComponentSchema)).optional(),
});

// -------------------------------------------
// Conditional Component
// -------------------------------------------
export const ConditionalSchema = z.object({
  component: z.literal("conditional"),
  props: z.object({
    condition: z.string().describe("Data path or expression to evaluate"),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "exists", "notExists"]).optional().default("exists"),
    value: z.unknown().optional(),
  }),
  children: z.array(z.lazy((): z.ZodType => ComponentSchema)),
  fallback: z.array(z.lazy((): z.ZodType => ComponentSchema)).optional(),
});

// -------------------------------------------
// Action Button Component
// -------------------------------------------
export const ActionButtonSchema = z.object({
  component: z.literal("action-button"),
  props: z.object({
    label: z.string(),
    action: z.string().describe("Action identifier"),
    variant: z.enum(["default", "primary", "secondary", "destructive", "outline", "ghost"]).optional().default("default"),
    size: SizeSchema.optional().default("md"),
    confirm: z.object({
      title: z.string(),
      description: z.string(),
    }).optional(),
  }),
});

// -------------------------------------------
// Quick Action Grid Component
// -------------------------------------------
export const QuickActionsSchema = z.object({
  component: z.literal("quick-actions"),
  props: z.object({
    actions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string().optional(),
      href: z.string().optional(),
    })),
  }),
});

// -------------------------------------------
// Unified Component Schema
// -------------------------------------------
export const ComponentSchema: z.ZodType = z.discriminatedUnion("component", [
  KpiCardSchema,
  StatCardSchema,
  AlertItemSchema,
  DataTableSchema,
  LineChartSchema,
  BarChartSchema,
  ProgressCardSchema,
  TextBlockSchema,
  GridSchema,
  StackSchema,
  CardContainerSchema,
  ConditionalSchema,
  ActionButtonSchema,
  QuickActionsSchema,
]);

// -------------------------------------------
// Root Dashboard Schema
// -------------------------------------------
export const DashboardSchema = z.object({
  version: z.literal(1),
  title: z.string().optional(),
  layout: z.array(ComponentSchema),
  data: z.record(z.string(), z.unknown()).optional().describe("Runtime data to inject"),
});

// -------------------------------------------
// Type Exports
// -------------------------------------------
export type Component = z.infer<typeof ComponentSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type KpiCard = z.infer<typeof KpiCardSchema>;
export type StatCard = z.infer<typeof StatCardSchema>;
export type AlertItem = z.infer<typeof AlertItemSchema>;
export type DataTable = z.infer<typeof DataTableSchema>;
export type LineChart = z.infer<typeof LineChartSchema>;
export type BarChart = z.infer<typeof BarChartSchema>;
export type ProgressCard = z.infer<typeof ProgressCardSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type Grid = z.infer<typeof GridSchema>;
export type Stack = z.infer<typeof StackSchema>;
export type CardContainer = z.infer<typeof CardContainerSchema>;
export type Conditional = z.infer<typeof ConditionalSchema>;
export type ActionButton = z.infer<typeof ActionButtonSchema>;
export type QuickActions = z.infer<typeof QuickActionsSchema>;

// -------------------------------------------
// Catalog Export for AI Context
// -------------------------------------------
export const catalogDescription = `
DeHyl Financials Component Catalog

Available components for building financial dashboards:

1. kpi-card - Display key performance indicators
   - title, value, format (currency/number), variant, icon, trend

2. stat-card - Simple statistic display
   - label, value, description, variant

3. alert-item - Alert/notification item
   - type (overdue_invoice, bills_due_soon, etc.), count, total, severity

4. data-table - Tabular data display
   - title, columns (key, label, format), rows, emptyMessage

5. line-chart - Time series line chart
   - title, description, data, xKey, lines (dataKey, label, color)

6. bar-chart - Bar/column chart
   - title, description, data, xKey, bars (dataKey, label, color), layout

7. progress-card - Progress toward a goal
   - title, current, target, format, variant

8. text-block - Text content
   - content, variant (heading/subheading/body/caption)

9. grid - Grid layout container
   - columns (1-4), gap, children

10. stack - Flex stack layout
    - direction (horizontal/vertical), gap, align, children

11. card - Card container
    - title, description, padding, children

12. conditional - Conditional rendering
    - condition (data path), operator, value, children, fallback

13. action-button - Interactive button
    - label, action, variant, size, confirm

14. quick-actions - Grid of quick action buttons
    - actions (id, label, icon, href)

Variants: default, success, warning, danger
Sizes: sm, md, lg
`;

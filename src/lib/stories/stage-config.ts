import type { LifecycleStage } from "@/types/stories";

export interface StageConfig {
  slug: LifecycleStage;
  label: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind bg color class
  textColor: string; // Tailwind text color class
  description: string;
  implemented: boolean; // Whether the stage card is built
}

export const STAGE_CONFIGS: StageConfig[] = [
  {
    slug: "bid_invite",
    label: "Bid Invite",
    icon: "FileText",
    color: "bg-purple-500",
    textColor: "text-purple-500",
    description: "Bid received and submitted",
    implemented: false,
  },
  {
    slug: "estimate",
    label: "Estimate",
    icon: "Calculator",
    color: "bg-blue-500",
    textColor: "text-blue-500",
    description: "Cost estimate prepared",
    implemented: true,
  },
  {
    slug: "po_contract",
    label: "Contract",
    icon: "FileCheck",
    color: "bg-indigo-500",
    textColor: "text-indigo-500",
    description: "PO or contract signed",
    implemented: false,
  },
  {
    slug: "pre_planning",
    label: "Pre-Planning",
    icon: "ClipboardList",
    color: "bg-cyan-500",
    textColor: "text-cyan-500",
    description: "Project planning and setup",
    implemented: false,
  },
  {
    slug: "crew",
    label: "Crew",
    icon: "Users",
    color: "bg-teal-500",
    textColor: "text-teal-500",
    description: "Crew assigned to project",
    implemented: true,
  },
  {
    slug: "materials",
    label: "Materials",
    icon: "Package",
    color: "bg-orange-500",
    textColor: "text-orange-500",
    description: "Materials delivered and used",
    implemented: false,
  },
  {
    slug: "equipment",
    label: "Equipment",
    icon: "Truck",
    color: "bg-amber-500",
    textColor: "text-amber-500",
    description: "Equipment on site",
    implemented: false,
  },
  {
    slug: "daily_logs",
    label: "Daily Logs",
    icon: "BookOpen",
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
    description: "Daily field reports",
    implemented: true,
  },
  {
    slug: "safety_docs",
    label: "Safety",
    icon: "ShieldCheck",
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    description: "Safety checklists and reports",
    implemented: false,
  },
  {
    slug: "completion",
    label: "Completion",
    icon: "CheckCircle",
    color: "bg-green-500",
    textColor: "text-green-500",
    description: "Project completion and photos",
    implemented: true,
  },
  {
    slug: "invoicing",
    label: "Invoicing",
    icon: "Receipt",
    color: "bg-sky-500",
    textColor: "text-sky-500",
    description: "Invoices sent and tracked",
    implemented: true,
  },
  {
    slug: "payment",
    label: "Payment",
    icon: "Banknote",
    color: "bg-rose-500",
    textColor: "text-rose-500",
    description: "Payments received",
    implemented: false,
  },
];

export function getStageConfig(slug: LifecycleStage): StageConfig {
  return STAGE_CONFIGS.find((s) => s.slug === slug)!;
}

export function getImplementedStages(): StageConfig[] {
  return STAGE_CONFIGS.filter((s) => s.implemented);
}

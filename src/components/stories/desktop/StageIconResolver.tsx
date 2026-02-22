"use client";

import {
  Calculator,
  Users,
  BookOpen,
  CheckCircle,
  Receipt,
  FileText,
  FileCheck,
  ClipboardList,
  Package,
  Truck,
  ShieldCheck,
  Banknote,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Calculator,
  Users,
  BookOpen,
  CheckCircle,
  Receipt,
  FileText,
  FileCheck,
  ClipboardList,
  Package,
  Truck,
  ShieldCheck,
  Banknote,
};

export function StageIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}

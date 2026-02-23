"use client";

import { cn } from "@/lib/utils";
import { X, List, Receipt, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { ProjectInvoices } from "@/components/projects/project-invoices";
import { ProjectBills } from "@/components/projects/project-bills";
import { ProjectCosts } from "@/components/projects/project-costs";
import type { ProjectWithTotals, Invoice, Bill } from "@/types";

interface DataDrawerProps {
  open: boolean;
  onClose: () => void;
  project: ProjectWithTotals;
  invoices: Invoice[];
  bills: Bill[];
  activeTab: "timeline" | "invoices" | "costs";
  onTabChange: (tab: "timeline" | "invoices" | "costs") => void;
  onRefetch: () => void;
}

const TABS = [
  { key: "timeline" as const, label: "Timeline", icon: List },
  { key: "invoices" as const, label: "Invoices", icon: Receipt },
  { key: "costs" as const, label: "Costs", icon: DollarSign },
];

export function DataDrawer({
  open,
  onClose,
  project,
  invoices,
  bills,
  activeTab,
  onTabChange,
  onRefetch,
}: DataDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Project Data</h2>
            <p className="text-sm text-muted-foreground">
              {project.code} • {project.description}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b bg-muted/30">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
                  activeTab === tab.key
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "timeline" && (
            <ProjectTimeline projectId={project.id} />
          )}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              <ProjectInvoices
                invoices={invoices}
                onInvoiceUpdate={async () => {
                  onRefetch();
                }}
              />
              <ProjectBills
                bills={bills}
                onBillUpdate={async () => {
                  onRefetch();
                }}
              />
            </div>
          )}
          {activeTab === "costs" && <ProjectCosts projectId={project.id} />}
        </div>
      </div>
    </>
  );
}

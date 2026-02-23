"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Calendar,
  FileText,
  Link as LinkIcon,
  Unlink,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDate, getDaysOverdue, cn } from "@/lib/utils";
import type { Invoice, InvoiceLineItem, ProjectWithTotals, MatchSuggestion } from "@/types";

interface InvoiceDetailDrawerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectWithTotals[];
  onAssign: (invoiceId: string, projectId: string | null) => Promise<void>;
  onOpenAssignDialog: (invoice: Invoice) => void;
}

interface InvoiceDetails {
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
  project: {
    id: string;
    code: string;
    clientCode: string;
    clientName: string;
    description: string;
  } | null;
}

export function InvoiceDetailDrawer({
  invoiceId,
  open,
  onOpenChange,
  projects,
  onAssign,
  onOpenAssignDialog,
}: InvoiceDetailDrawerProps) {
  const [details, setDetails] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId || !open) {
      setDetails(null);
      return;
    }

    async function fetchDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/details`);
        if (!res.ok) throw new Error("Failed to fetch invoice details");
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        console.error("Failed to fetch invoice details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [invoiceId, open]);

  const handleUnassign = useCallback(async () => {
    if (!details?.invoice?.id) return;
    await onAssign(details.invoice.id, null);
    // Update local state
    setDetails((prev) =>
      prev ? { ...prev, invoice: { ...prev.invoice, projectId: null }, project: null } : null
    );
  }, [details, onAssign]);

  const handleReassign = useCallback(() => {
    if (!details?.invoice) return;
    onOpenAssignDialog(details.invoice);
  }, [details, onOpenAssignDialog]);

  const inv = details?.invoice;
  const daysOver = inv ? getDaysOverdue(inv.dueDate) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        {loading ? (
          <div className="space-y-6 pt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="space-y-3 mt-8">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : inv ? (
          <>
            <SheetHeader className="pb-4 border-b border-muted/30">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <SheetTitle className="text-xl">
                    Invoice {inv.invoiceNumber}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    {inv.clientName}
                  </SheetDescription>
                </div>
                <Badge
                  variant={
                    inv.status === "paid"
                      ? "success"
                      : inv.status === "overdue"
                      ? "destructive"
                      : "secondary"
                  }
                  className="shrink-0"
                >
                  {inv.status}
                </Badge>
              </div>
            </SheetHeader>

            <div className="space-y-6 pt-6">
              {/* Financial summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Amount
                  </p>
                  <p className="text-2xl font-serif font-semibold tabular-nums mt-0.5">
                    {formatCurrency(inv.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Balance
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-serif font-semibold tabular-nums mt-0.5",
                      inv.balance > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    )}
                  >
                    {inv.balance > 0
                      ? formatCurrency(inv.balance)
                      : "Paid"}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Issued {formatDate(inv.issueDate)}</span>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    daysOver > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Due {formatDate(inv.dueDate)}
                    {daysOver > 0 && ` (${daysOver}d overdue)`}
                  </span>
                </div>
              </div>

              {/* Project assignment */}
              <div className="rounded-lg border border-muted/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Project Assignment
                </p>
                {details?.project ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {details.project.code}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {details.project.clientName} &middot;{" "}
                        {details.project.description}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReassign}
                        className="text-xs"
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Change
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUnassign}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <Unlink className="h-3 w-3 mr-1" />
                        Unassign
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Not assigned to any project
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReassign}
                      className="text-xs"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Assign
                    </Button>
                  </div>
                )}
              </div>

              {/* Memo / Notes */}
              {inv.memo && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                    Memo
                  </p>
                  <p className="text-sm bg-muted/30 rounded-md p-3">
                    {inv.memo}
                  </p>
                </div>
              )}

              {/* Line items */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Line Items
                </p>
                {details?.lineItems && details.lineItems.length > 0 ? (
                  <div className="space-y-1">
                    {details.lineItems.map((li, idx) => (
                      <div
                        key={li.id || idx}
                        className="flex items-start justify-between py-2.5 border-b border-muted/20 last:border-0 text-sm"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="font-medium">
                            {li.description || li.itemName || "Item"}
                          </p>
                          {li.quantity != null && li.unitPrice != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {li.quantity} &times;{" "}
                              {formatCurrency(li.unitPrice)}
                            </p>
                          )}
                        </div>
                        <span className="tabular-nums font-medium shrink-0">
                          {formatCurrency(li.amount)}
                        </span>
                      </div>
                    ))}
                    {/* Total row */}
                    <div className="flex items-center justify-between pt-3 text-sm font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">
                        {formatCurrency(inv.amount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-md p-4 text-center">
                    <FileText className="h-5 w-5 mx-auto mb-2 opacity-40" />
                    <p>No line items synced yet.</p>
                    <p className="text-xs mt-1">
                      Run a QuickBooks sync to pull line item details.
                    </p>
                  </div>
                )}
              </div>

              {/* Sync info */}
              <div className="text-xs text-muted-foreground/60 pt-4 border-t border-muted/20">
                <p>
                  Synced from QuickBooks &middot; Last updated{" "}
                  {formatDate(inv.syncedAt)}
                </p>
                {inv.manualOverride && (
                  <p className="mt-1 text-amber-600 dark:text-amber-400">
                    Manual override active &mdash; QB sync won&apos;t overwrite
                    assignment
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">Invoice not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

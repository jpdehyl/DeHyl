"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  MoreHorizontal,
  Link as LinkIcon,
  ExternalLink,
  Lightbulb,
  Check,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProjectSelectorDialog } from "@/components/shared/project-selector-dialog";
import { EditableAmount } from "@/components/ui/editable-amount";
import { cn, formatCurrency, formatDate, getDaysOverdue } from "@/lib/utils";
import type { InvoiceWithSuggestions, ProjectWithTotals } from "@/types";

interface InvoicesTableProps {
  invoices: InvoiceWithSuggestions[];
  projects?: ProjectWithTotals[];
  onAssign?: (invoiceId: string, projectId: string | null) => Promise<void>;
  onAmountUpdate?: (invoiceId: string, field: string, value: number) => Promise<void>;
}

type SortKey = "invoiceNumber" | "clientName" | "amount" | "dueDate" | "status";
type SortDirection = "asc" | "desc";

export function InvoicesTable({
  invoices,
  projects = [],
  onAssign,
  onAmountUpdate,
}: InvoicesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithSuggestions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    switch (sortKey) {
      case "invoiceNumber":
        aValue = a.invoiceNumber;
        bValue = b.invoiceNumber;
        break;
      case "clientName":
        aValue = a.clientName;
        bValue = b.clientName;
        break;
      case "amount":
        aValue = a.balance;
        bValue = b.balance;
        break;
      case "dueDate":
        aValue = new Date(a.dueDate);
        bValue = new Date(b.dueDate);
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === "asc"
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const getProject = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId);
  };

  const handleAssignClick = (invoice: InvoiceWithSuggestions) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleAssign = async (projectId: string | null) => {
    if (selectedInvoice && onAssign) {
      await onAssign(selectedInvoice.id, projectId);
    }
    setDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleAcceptSuggestion = async (invoice: InvoiceWithSuggestions) => {
    if (invoice.matchSuggestions.length > 0 && onAssign) {
      await onAssign(invoice.id, invoice.matchSuggestions[0].projectId);
    }
  };

  const SortableHeader = ({
    children,
    sortKeyName,
    className,
  }: {
    children: React.ReactNode;
    sortKeyName: SortKey;
    className?: string;
  }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => handleSort(sortKeyName)}
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader sortKeyName="invoiceNumber">Invoice</SortableHeader>
            <SortableHeader sortKeyName="clientName">Client</SortableHeader>
            <TableHead className="hidden md:table-cell">Project</TableHead>
            <SortableHeader sortKeyName="amount" className="text-right">
              Balance
            </SortableHeader>
            <SortableHeader sortKeyName="dueDate" className="hidden sm:table-cell">
              Due
            </SortableHeader>
            <SortableHeader sortKeyName="status">Status</SortableHeader>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => {
            const daysOverdue = getDaysOverdue(invoice.dueDate);
            const project = getProject(invoice.projectId);
            const statusVariant =
              invoice.status === "paid"
                ? "success"
                : invoice.status === "overdue"
                ? "destructive"
                : "secondary";

            return (
              <TableRow
                key={invoice.id}
                className={cn(
                  invoice.status === "overdue" && "bg-destructive/5"
                )}
              >
                <TableCell>
                  <div className="font-medium">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground md:hidden">
                    {formatDate(invoice.dueDate)}
                    {daysOverdue > 0 && (
                      <span className="text-destructive ml-1">
                        ({daysOverdue}d overdue)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate">{invoice.clientName}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {project ? (
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-primary hover:underline font-mono"
                    >
                      {project.code}
                    </Link>
                  ) : invoice.matchSuggestions.length > 0 ? (
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-amber-600 flex items-center gap-1 cursor-help">
                              <Lightbulb className="h-3 w-3" />
                              <span className="font-mono">{invoice.matchSuggestions[0].projectCode}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{invoice.matchSuggestions[0].confidence} confidence</p>
                            <p className="text-xs">{invoice.matchSuggestions[0].reason}</p>
                          </TooltipContent>
                        </Tooltip>
                        {onAssign && (
                          <div className="flex gap-0.5 ml-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleAcceptSuggestion(invoice)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleAssignClick(invoice)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TooltipProvider>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground -ml-2"
                      onClick={() => handleAssignClick(invoice)}
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Assign
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {onAmountUpdate ? (
                    <div>
                      <EditableAmount
                        value={invoice.balance}
                        onSave={(v) => onAmountUpdate(invoice.id, "balance", v)}
                        className={cn("text-sm font-medium", invoice.balance > 0 && "text-warning")}
                        isOverridden={invoice.manualOverride}
                      />
                      <div className="text-xs text-muted-foreground">
                        of {formatCurrency(invoice.amount)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={invoice.balance > 0 ? "text-warning font-medium" : ""}>
                        {formatCurrency(invoice.balance)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        of {formatCurrency(invoice.amount)}
                      </div>
                    </>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div
                    className={cn(
                      daysOverdue > 0 && "text-destructive font-medium"
                    )}
                  >
                    {formatDate(invoice.dueDate)}
                  </div>
                  {daysOverdue > 0 && (
                    <div className="text-xs text-destructive">
                      {daysOverdue} days overdue
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>{invoice.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAssignClick(invoice)}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        {project ? "Change Project" : "Assign to Project"}
                      </DropdownMenuItem>
                      {project && onAssign && (
                        <DropdownMenuItem
                          onClick={() => onAssign(invoice.id, null)}
                          className="text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Unassign
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View in QuickBooks
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>

      {/* Project Selector Dialog */}
      <ProjectSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        currentProjectId={selectedInvoice?.projectId ?? null}
        suggestions={selectedInvoice?.matchSuggestions ?? []}
        onSelect={handleAssign}
        title="Assign Invoice to Project"
        description={
          selectedInvoice
            ? `Link invoice ${selectedInvoice.invoiceNumber} (${formatCurrency(selectedInvoice.amount)}) to a project.`
            : "Select a project to link this invoice to."
        }
      />
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  MoreHorizontal,
  Link as LinkIcon,
  ExternalLink,
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
import { ProjectSelectorDialog } from "@/components/shared/project-selector-dialog";
import { EditableAmount } from "@/components/ui/editable-amount";
import { cn, formatCurrency, formatDate, getDaysOverdue, getDaysUntilDue } from "@/lib/utils";
import type { Bill, ProjectWithTotals } from "@/types";

interface BillsTableProps {
  bills: Bill[];
  projects?: ProjectWithTotals[];
  onAssign?: (billId: string, projectId: string | null) => Promise<void>;
  onAmountUpdate?: (billId: string, field: string, value: number) => Promise<void>;
}

type SortKey = "vendorName" | "amount" | "dueDate" | "status";
type SortDirection = "asc" | "desc";

export function BillsTable({
  bills,
  projects = [],
  onAssign,
  onAmountUpdate,
}: BillsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedBills = [...bills].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    switch (sortKey) {
      case "vendorName":
        aValue = a.vendorName;
        bValue = b.vendorName;
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

  const handleAssignClick = (bill: Bill) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const handleAssign = async (projectId: string | null) => {
    if (selectedBill && onAssign) {
      await onAssign(selectedBill.id, projectId);
    }
    setDialogOpen(false);
    setSelectedBill(null);
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
            <SortableHeader sortKeyName="vendorName">Vendor</SortableHeader>
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
          {sortedBills.map((bill) => {
            const daysOverdue = getDaysOverdue(bill.dueDate);
            const daysUntil = getDaysUntilDue(bill.dueDate);
            const project = getProject(bill.projectId);

            const statusVariant =
              bill.status === "paid"
                ? "success"
                : bill.status === "overdue"
                ? "destructive"
                : daysUntil <= 7
                ? "warning"
                : "secondary";

            return (
              <TableRow
                key={bill.id}
                className={cn(
                  bill.status === "overdue" && "bg-destructive/5",
                  daysUntil <= 7 && daysUntil > 0 && "bg-warning/5"
                )}
              >
                <TableCell>
                  <div className="font-medium">{bill.vendorName}</div>
                  {bill.memo && (
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {bill.memo}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground md:hidden">
                    {formatDate(bill.dueDate)}
                    {daysOverdue > 0 && (
                      <span className="text-destructive ml-1">
                        ({daysOverdue}d overdue)
                      </span>
                    )}
                    {daysUntil <= 7 && daysUntil > 0 && (
                      <span className="text-warning ml-1">({daysUntil}d)</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {project ? (
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-primary hover:underline font-mono"
                    >
                      {project.code}
                    </Link>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground -ml-2"
                      onClick={() => handleAssignClick(bill)}
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
                        value={bill.balance}
                        onSave={(v) => onAmountUpdate(bill.id, "balance", v)}
                        className={cn("text-sm font-medium", bill.balance > 0 && "text-destructive")}
                        isOverridden={bill.manualOverride}
                      />
                      {bill.balance !== bill.amount && (
                        <div className="text-xs text-muted-foreground">
                          of {formatCurrency(bill.amount)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "font-medium",
                          bill.balance > 0 && "text-destructive"
                        )}
                      >
                        {formatCurrency(bill.balance)}
                      </span>
                      {bill.balance !== bill.amount && (
                        <div className="text-xs text-muted-foreground">
                          of {formatCurrency(bill.amount)}
                        </div>
                      )}
                    </>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div
                    className={cn(
                      daysOverdue > 0 && "text-destructive font-medium",
                      daysUntil <= 7 && daysUntil > 0 && "text-warning font-medium"
                    )}
                  >
                    {formatDate(bill.dueDate)}
                  </div>
                  {daysOverdue > 0 && (
                    <div className="text-xs text-destructive">
                      {daysOverdue} days overdue
                    </div>
                  )}
                  {daysUntil <= 7 && daysUntil > 0 && (
                    <div className="text-xs text-warning">
                      Due in {daysUntil} days
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>
                    {bill.status === "open" && daysUntil <= 7
                      ? "due soon"
                      : bill.status}
                  </Badge>
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
                      <DropdownMenuItem onClick={() => handleAssignClick(bill)}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        {project ? "Change Project" : "Assign to Project"}
                      </DropdownMenuItem>
                      {project && onAssign && (
                        <DropdownMenuItem
                          onClick={() => onAssign(bill.id, null)}
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
        currentProjectId={selectedBill?.projectId ?? null}
        onSelect={handleAssign}
        title="Assign Bill to Project"
        description={
          selectedBill
            ? `Link bill from ${selectedBill.vendorName} (${formatCurrency(selectedBill.amount)}) to a project.`
            : "Select a project to link this bill to."
        }
      />
    </>
  );
}

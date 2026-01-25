"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
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
import { cn, formatCurrency } from "@/lib/utils";
import type { ProjectProfitability } from "@/types";

interface ProfitabilityTableProps {
  projects: ProjectProfitability[];
}

type SortKey =
  | "code"
  | "clientName"
  | "totalInvoiced"
  | "totalCosts"
  | "grossProfit"
  | "profitMarginPct";
type SortDirection = "asc" | "desc";

export function ProfitabilityTable({ projects }: ProfitabilityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("grossProfit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortKey) {
      case "code":
        aValue = a.code;
        bValue = b.code;
        break;
      case "clientName":
        aValue = a.clientName;
        bValue = b.clientName;
        break;
      case "totalInvoiced":
        aValue = a.totalInvoiced;
        bValue = b.totalInvoiced;
        break;
      case "totalCosts":
        aValue = a.totalCosts;
        bValue = b.totalCosts;
        break;
      case "grossProfit":
        aValue = a.grossProfit;
        bValue = b.grossProfit;
        break;
      case "profitMarginPct":
        aValue = a.profitMarginPct;
        bValue = b.profitMarginPct;
        break;
      default:
        return 0;
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

  const getMarginColor = (margin: number) => {
    if (margin < 0) return "text-destructive font-medium";
    if (margin < 20) return "text-destructive";
    if (margin < 30) return "text-warning";
    return "text-success";
  };

  const getProfitColor = (profit: number) => {
    if (profit < 0) return "text-destructive font-medium";
    return "text-success";
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader sortKeyName="code">Project</SortableHeader>
            <SortableHeader sortKeyName="clientName" className="hidden md:table-cell">
              Client
            </SortableHeader>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            <SortableHeader sortKeyName="totalInvoiced" className="text-right">
              Revenue
            </SortableHeader>
            <SortableHeader sortKeyName="totalCosts" className="text-right hidden sm:table-cell">
              Costs
            </SortableHeader>
            <SortableHeader sortKeyName="grossProfit" className="text-right">
              Profit
            </SortableHeader>
            <SortableHeader sortKeyName="profitMarginPct" className="text-right">
              Margin
            </SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No projects found
              </TableCell>
            </TableRow>
          ) : (
            sortedProjects.map((project) => (
              <TableRow
                key={project.id}
                className={cn(project.grossProfit < 0 && "bg-destructive/5")}
              >
                <TableCell>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {project.code}
                  </Link>
                  <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {project.description}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="max-w-[150px] truncate">{project.clientName}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={project.status === "active" ? "default" : "secondary"}>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div>{formatCurrency(project.totalInvoiced)}</div>
                  {project.outstandingReceivables > 0 && (
                    <div className="text-xs text-warning">
                      {formatCurrency(project.outstandingReceivables)} outstanding
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  {formatCurrency(project.totalCosts)}
                </TableCell>
                <TableCell className={cn("text-right", getProfitColor(project.grossProfit))}>
                  {formatCurrency(project.grossProfit)}
                </TableCell>
                <TableCell className={cn("text-right", getMarginColor(project.profitMarginPct))}>
                  {project.profitMarginPct}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

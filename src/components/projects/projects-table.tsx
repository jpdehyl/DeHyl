"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronRight,
  AlertTriangle,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import type { ProjectWithTotals } from "@/types";

interface ProjectsTableProps {
  projects: ProjectWithTotals[];
}

type SortKey =
  | "code"
  | "clientName"
  | "estimateAmount"
  | "invoiced"
  | "profit"
  | "status";
type SortDirection = "asc" | "desc";

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("code");
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
      case "estimateAmount":
        aValue = a.estimateAmount ?? 0;
        bValue = b.estimateAmount ?? 0;
        break;
      case "invoiced":
        aValue = a.totals.invoiced;
        bValue = b.totals.invoiced;
        break;
      case "profit":
        aValue = a.totals.profit;
        bValue = b.totals.profit;
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
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
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKeyName="code">Project</SortableHeader>
              <SortableHeader sortKeyName="clientName">Client</SortableHeader>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <SortableHeader sortKeyName="estimateAmount" className="text-right hidden sm:table-cell">
                Estimate
              </SortableHeader>
              <SortableHeader sortKeyName="invoiced" className="text-right hidden lg:table-cell">
                Invoiced
              </SortableHeader>
              <TableHead className="text-right hidden lg:table-cell">Costs</TableHead>
              <SortableHeader sortKeyName="profit" className="text-right">
                Profit
              </SortableHeader>
              <SortableHeader sortKeyName="status">Status</SortableHeader>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.map((project) => {
              const profitMargin = project.totals.invoiced > 0
                ? (project.totals.profit / project.totals.invoiced) * 100
                : 0;

              return (
                <TableRow
                  key={project.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{project.code}</span>
                      {(!project.estimateAmount || !project.hasPBS) && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {!project.estimateAmount && "Missing estimate"}
                            {!project.estimateAmount && !project.hasPBS && ", "}
                            {!project.hasPBS && "Missing PBS"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{project.clientCode}</span>
                      <span className="text-muted-foreground ml-1 hidden sm:inline">
                        - {project.clientName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                    {project.description}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {project.estimateAmount
                      ? formatCurrency(project.estimateAmount)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {formatCurrency(project.totals.invoiced)}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {formatCurrency(project.totals.costs)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        project.totals.profit >= 0
                          ? "text-success"
                          : "text-destructive"
                      )}
                    >
                      {formatCurrency(project.totals.profit)}
                    </span>
                    {project.totals.invoiced > 0 && (
                      <span className="text-xs text-muted-foreground block">
                        {profitMargin.toFixed(0)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={project.status === "active" ? "default" : "secondary"}
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

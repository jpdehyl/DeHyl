"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CostCategory } from "@/types";

interface CostEntry {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  cost_date: string;
  category: CostCategory;
  vendor: string | null;
  notes: string | null;
  created_at: string;
}

interface ProjectCostsProps {
  projectId: string;
}

const COST_CATEGORIES: { value: CostCategory; label: string }[] = [
  { value: "labor", label: "Labor" },
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "disposal", label: "Disposal" },
  { value: "permits", label: "Permits" },
  { value: "fuel", label: "Fuel" },
  { value: "rental", label: "Rental" },
  { value: "other", label: "Other" },
];

const categoryColors: Record<CostCategory, string> = {
  labor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  materials: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  equipment: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  subcontractor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  disposal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  permits: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  fuel: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  rental: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function ProjectCosts({ projectId }: ProjectCostsProps) {
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newCost, setNewCost] = useState({
    description: "",
    amount: "",
    cost_date: new Date().toISOString().split("T")[0],
    category: "materials" as CostCategory,
    vendor: "",
    notes: "",
  });

  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`);
      if (res.ok) {
        const data = await res.json();
        setCosts(data.costs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch project costs:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  async function handleAddCost() {
    if (!newCost.description || !newCost.amount) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newCost.description,
          amount: parseFloat(newCost.amount),
          cost_date: newCost.cost_date,
          category: newCost.category,
          vendor: newCost.vendor || null,
          notes: newCost.notes || null,
        }),
      });

      if (res.ok) {
        setShowAddDialog(false);
        setNewCost({
          description: "",
          amount: "",
          cost_date: new Date().toISOString().split("T")[0],
          category: "materials",
          vendor: "",
          notes: "",
        });
        fetchCosts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add cost");
      }
    } catch (err) {
      console.error("Failed to add cost:", err);
      alert("Failed to add cost entry");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Project Costs</CardTitle>
          <CardDescription>
            {costs.length} {costs.length === 1 ? "entry" : "entries"} totaling{" "}
            {formatCurrency(total)}
          </CardDescription>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Cost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Cost Entry</DialogTitle>
              <DialogDescription>
                Record a cost against this project
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="cost-description">Description</Label>
                <Input
                  id="cost-description"
                  placeholder="What was the cost for?"
                  value={newCost.description}
                  onChange={(e) =>
                    setNewCost({ ...newCost, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cost-amount">Amount</Label>
                  <Input
                    id="cost-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newCost.amount}
                    onChange={(e) =>
                      setNewCost({ ...newCost, amount: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost-date">Date</Label>
                  <Input
                    id="cost-date"
                    type="date"
                    value={newCost.cost_date}
                    onChange={(e) =>
                      setNewCost({ ...newCost, cost_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost-category">Category</Label>
                <Select
                  value={newCost.category}
                  onValueChange={(value) =>
                    setNewCost({ ...newCost, category: value as CostCategory })
                  }
                >
                  <SelectTrigger id="cost-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost-vendor">Vendor (optional)</Label>
                <Input
                  id="cost-vendor"
                  placeholder="Vendor name"
                  value={newCost.vendor}
                  onChange={(e) =>
                    setNewCost({ ...newCost, vendor: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost-notes">Notes (optional)</Label>
                <Textarea
                  id="cost-notes"
                  placeholder="Additional notes..."
                  value={newCost.notes}
                  onChange={(e) =>
                    setNewCost({ ...newCost, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddCost}
                disabled={
                  submitting || !newCost.description || !newCost.amount
                }
              >
                {submitting ? "Adding..." : "Add Cost"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {costs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No costs recorded yet</p>
            <p className="text-sm">
              Add costs to track project profitability
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>{formatDate(cost.cost_date)}</TableCell>
                  <TableCell className="font-medium">
                    {cost.description}
                    {cost.notes && (
                      <p className="text-xs text-muted-foreground">
                        {cost.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        categoryColors[cost.category] || categoryColors.other
                      }
                    >
                      {cost.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {cost.vendor || "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(cost.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

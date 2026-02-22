"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  project_id: string;
  invoice_id?: string;
  vendor?: string;
  receipt_url?: string;
  status: "unlinked" | "invoiced" | "collected";
  notes?: string;
  submitted_by?: string;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    code: string;
    client_name: string;
    description: string;
  };
  invoices?: {
    id: string;
    invoice_number: string;
    status: string;
  };
}

interface Project {
  id: string;
  code: string;
  description: string;
  client_name: string;
  status: string;
}

interface UnbilledStats {
  totalEntries: number;
  totalAmount: number;
}

const EXPENSE_CATEGORIES = [
  'labor', 'materials', 'equipment', 'disposal', 'fuel', 'rental', 'subcontractor', 'permits', 'other'
];

const SHOP_PROJECT_ID = '8649bd23-6948-4ec6-8dc8-4c58c8a25016';

interface ProjectGroup {
  projectId: string;
  projectCode: string;
  clientName: string;
  isShop: boolean;
  total: number;
  unbilled: number;
  expenses: Expense[];
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [unbilledStats, setUnbilledStats] = useState<UnbilledStats>({ totalEntries: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState({
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split('T')[0],
    category: "materials",
    project_id: "",
    vendor: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [expensesRes, projectsRes, unbilledRes] = await Promise.all([
        fetch("/api/expenses?limit=200"),
        fetch("/api/projects"),
        fetch("/api/expenses/unbilled"),
      ]);

      const expensesData = await expensesRes.json();
      const projectsData = await projectsRes.json();
      const unbilledData = await unbilledRes.json();

      setExpenses(expensesData.expenses || []);
      setProjects(projectsData.projects || []);
      setUnbilledStats(unbilledData.stats || { totalEntries: 0, totalAmount: 0 });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEntry() {
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEntry, amount: parseFloat(newEntry.amount) }),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setNewEntry({
          description: "", amount: "",
          expense_date: new Date().toISOString().split('T')[0],
          category: "materials", project_id: "", vendor: "", notes: "",
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create expense entry");
      }
    } catch (error) {
      alert("Failed to create expense entry");
    }
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTotal = useMemo(() =>
    expenses.filter(e => e.expense_date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0),
    [expenses, thisMonth]
  );
  const totalAll = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const shopMonthly = useMemo(() =>
    expenses.filter(e => e.project_id === SHOP_PROJECT_ID && e.expense_date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0),
    [expenses, thisMonth]
  );

  const projectGroups = useMemo(() => {
    const groups = new Map<string, ProjectGroup>();
    expenses.forEach(exp => {
      const pid = exp.project_id;
      if (!groups.has(pid)) {
        groups.set(pid, {
          projectId: pid,
          projectCode: exp.projects?.code || "Unknown",
          clientName: exp.projects?.client_name || "",
          isShop: pid === SHOP_PROJECT_ID,
          total: 0,
          unbilled: 0,
          expenses: [],
        });
      }
      const g = groups.get(pid)!;
      g.total += exp.amount;
      if (exp.status === "unlinked" && pid !== SHOP_PROJECT_ID) g.unbilled += exp.amount;
      g.expenses.push(exp);
    });
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const maxGroupTotal = useMemo(() => Math.max(...projectGroups.map(g => g.total), 1), [projectGroups]);
  const activeProjects = projects.filter(p => p.status === "active");

  const monthName = new Date().toLocaleDateString('en-CA', { month: 'long' });

  if (loading) {
    return (
      <div>
        <Header title="Costs" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 space-y-8">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-4 mt-12">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Costs"
        action={
          <div className="flex gap-2">
            <Link href="/expenses/import">
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import
              </Button>
            </Link>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Expense</DialogTitle>
                  <DialogDescription>Log a new cost entry against a project</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="What was this for?"
                      value={newEntry.description}
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Amount</Label>
                      <Input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={newEntry.amount}
                        onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <Input
                        type="date" value={newEntry.expense_date}
                        onChange={(e) => setNewEntry({ ...newEntry, expense_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select value={newEntry.category} onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Project</Label>
                      <Select value={newEntry.project_id} onValueChange={(v) => setNewEntry({ ...newEntry, project_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SHOP_PROJECT_ID}>
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> SHOP</span>
                          </SelectItem>
                          {activeProjects.filter(p => p.id !== SHOP_PROJECT_ID).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Vendor <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      placeholder="Vendor name"
                      value={newEntry.vendor}
                      onChange={(e) => setNewEntry({ ...newEntry, vendor: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateEntry} disabled={!newEntry.description || !newEntry.amount || !newEntry.project_id}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-24">

        {/* Headline */}
        <div className="mb-2">
          <p className="font-serif text-5xl font-semibold tracking-tight tabular-nums leading-none">
            {formatCurrency(monthlyTotal)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            spent in {monthName}
          </p>
        </div>

        {/* Prose */}
        <p className="text-sm leading-relaxed text-muted-foreground mt-4 mb-12 max-w-lg">
          {expenses.length} total entries across {projectGroups.length} project{projectGroups.length !== 1 ? "s" : ""}.
          {unbilledStats.totalAmount > 0
            ? ` ${formatCurrency(unbilledStats.totalAmount)} in costs haven't been invoiced yet.`
            : " All project costs are accounted for."
          }
          {shopMonthly > 0 && ` ${formatCurrency(shopMonthly)} in shop overhead this month.`}
        </p>

        {/* Unbilled callout */}
        {unbilledStats.totalAmount > 0 && (
          <div className="pl-5 border-l-2 border-amber-300 dark:border-amber-800 py-2 mb-10">
            <p className="font-medium">
              {formatCurrency(unbilledStats.totalAmount)} unbilled
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unbilledStats.totalEntries} expense{unbilledStats.totalEntries !== 1 ? "s" : ""} not yet linked to invoices
            </p>
          </div>
        )}

        {/* Project groups */}
        <div className="space-y-1">
          {projectGroups.map((group) => {
            const isExpanded = expandedProject === group.projectId;
            const barPct = (group.total / maxGroupTotal) * 100;

            return (
              <div key={group.projectId} className="border-b border-muted/30 last:border-0">
                <button
                  onClick={() => setExpandedProject(isExpanded ? null : group.projectId)}
                  className="w-full py-4 -mx-3 px-3 hover:bg-muted/20 rounded-sm transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {group.isShop && <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="font-medium">
                          {group.isShop ? "Shop / Overhead" : (group.clientName || group.projectCode)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {group.projectCode} &middot; {group.expenses.length} entr{group.expenses.length === 1 ? "y" : "ies"}
                        {group.unbilled > 0 && (
                          <span className="text-amber-600 dark:text-amber-400"> &middot; {formatCurrency(group.unbilled)} unbilled</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-serif text-lg font-semibold tabular-nums tracking-tight">
                        {formatCurrency(group.total)}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="mt-3 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        group.isShop ? "bg-gray-400/50" : "bg-emerald-400/50"
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="pb-4 px-3 -mx-3">
                    <div className="ml-4 border-l border-muted/40 pl-4 space-y-2">
                      {group.expenses
                        .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
                        .map(exp => (
                          <div key={exp.id} className="flex items-center justify-between py-1.5 text-sm">
                            <div className="min-w-0 flex-1">
                              <span className="text-foreground">{exp.description}</span>
                              <span className="text-muted-foreground ml-2">
                                {exp.vendor && `${exp.vendor} · `}
                                {exp.category} · {formatDate(exp.expense_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              {exp.status === "unlinked" && !group.isShop && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">unbilled</span>
                              )}
                              <span className="tabular-nums font-medium">{formatCurrency(exp.amount)}</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {projectGroups.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">No expenses recorded yet</p>
              <p className="text-xs mt-1">Add an expense to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

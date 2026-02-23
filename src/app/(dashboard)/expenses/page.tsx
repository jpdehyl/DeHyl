"use client";

import { useEffect, useState, Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Receipt,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Edit,
  CheckCircle,
  Building2,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

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
  'labor',
  'materials',
  'equipment',
  'disposal',
  'fuel',
  'rental',
  'subcontractor',
  'permits',
  'other'
];

// Shop project ID for internal overhead
const SHOP_PROJECT_ID = '8649bd23-6948-4ec6-8dc8-4c58c8a25016';

export default function ExpensesPage() {
  return (
    <Suspense>
      <ExpensesPageContent />
    </Suspense>
  );
}

function ExpensesPageContent() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [unbilledStats, setUnbilledStats] = useState<UnbilledStats>({ totalEntries: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filters
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || "all");
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project_id') || "all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // New entry form
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
  }, [selectedCategory, selectedStatus, selectedProject, dateRange]);

  async function fetchData() {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set('category', selectedCategory);
      if (selectedStatus !== "all") params.set('status', selectedStatus);
      if (selectedProject !== "all") params.set('project_id', selectedProject);
      if (dateRange.start) params.set('start_date', dateRange.start);
      if (dateRange.end) params.set('end_date', dateRange.end);
      params.set('limit', '100');

      const [expensesRes, projectsRes, unbilledRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newEntry,
          amount: parseFloat(newEntry.amount),
        }),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setNewEntry({
          description: "",
          amount: "",
          expense_date: new Date().toISOString().split('T')[0],
          category: "materials",
          project_id: "",
          vendor: "",
          notes: "",
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create expense entry");
      }
    } catch (error) {
      console.error("Error creating entry:", error);
      alert("Failed to create expense entry");
    }
  }

  async function handleUpdateEntry(id: string, updates: Partial<Expense>) {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setEditingExpense(null);
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update expense entry");
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update expense entry");
    }
  }

  const statusColors = {
    unlinked: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    invoiced: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    collected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const categoryColors = {
    materials: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    equipment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    disposal: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    fuel: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    rental: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    subcontractor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    permits: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  // Stats
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyExpenses = expenses
    .filter(exp => exp.expense_date.startsWith(thisMonth))
    .reduce((sum, exp) => sum + exp.amount, 0);
  const shopExpenses = expenses
    .filter(exp => exp.project_id === SHOP_PROJECT_ID && exp.expense_date.startsWith(thisMonth))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const activeProjects = projects.filter(p => p.status === "active");

  if (loading) {
    return (
      <div>
        <Header title="Expenses" description="Project cost tracking and invoice linking" />
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Expenses"
        description="Project cost tracking and invoice linking"
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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense Entry</DialogTitle>
                <DialogDescription>
                  Create a new expense entry for project costs
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Expense description..."
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={newEntry.expense_date}
                    onChange={(e) => setNewEntry({ ...newEntry, expense_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newEntry.category}
                    onValueChange={(value) => setNewEntry({ ...newEntry, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project_id">Project</Label>
                  <Select
                    value={newEntry.project_id}
                    onValueChange={(value) => setNewEntry({ ...newEntry, project_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Shop project at top */}
                      <SelectItem value={SHOP_PROJECT_ID}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          SHOP - Internal Overhead
                        </div>
                      </SelectItem>
                      {activeProjects.filter(p => p.id !== SHOP_PROJECT_ID).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.code} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendor">Vendor (optional)</Label>
                  <Input
                    id="vendor"
                    placeholder="Vendor name..."
                    value={newEntry.vendor}
                    onChange={(e) => setNewEntry({ ...newEntry, vendor: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateEntry}
                  disabled={!newEntry.description || !newEntry.amount || !newEntry.project_id}
                >
                  Create Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Unbilled Expenses Alert */}
        {unbilledStats.totalEntries > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>💰 {formatCurrency(unbilledStats.totalAmount)} in expenses not yet invoiced</strong> — {unbilledStats.totalEntries} entries
              <Link 
                href="/expenses?status=unlinked" 
                className="ml-2 font-medium underline hover:no-underline"
                onClick={() => setSelectedStatus("unlinked")}
              >
                Link to Invoices
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total This Month</p>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unbilled Project</p>
                  <p className="text-2xl font-bold">{formatCurrency(unbilledStats.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shop/Overhead</p>
                  <p className="text-2xl font-bold">{formatCurrency(shopExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{expenses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unlinked">Unlinked</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value={SHOP_PROJECT_ID}>SHOP - Internal</SelectItem>
              {activeProjects.filter(p => p.id !== SHOP_PROJECT_ID).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.code} - {project.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="Start date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-40"
            />
            <Input
              type="date"
              placeholder="End date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-40"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Entries</CardTitle>
            <CardDescription>
              {expenses.length} {expenses.length === 1 ? "entry" : "entries"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expense entries found</p>
                <p className="text-sm">Add an expense to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {formatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.description}
                        {expense.vendor && (
                          <p className="text-xs text-muted-foreground">
                            Vendor: {expense.vendor}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", categoryColors[expense.category as keyof typeof categoryColors])}>
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.projects ? (
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              {expense.project_id === SHOP_PROJECT_ID && (
                                <Building2 className="h-3 w-3" />
                              )}
                              {expense.projects.code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {expense.projects.client_name}
                            </p>
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">UNKNOWN</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.project_id === SHOP_PROJECT_ID ? (
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                            SHOP
                          </Badge>
                        ) : expense.status === 'unlinked' ? (
                          <Badge className={cn("capitalize", statusColors.unlinked)}>
                            UNBILLED
                          </Badge>
                        ) : (
                          <Badge className={cn("capitalize", statusColors[expense.status])}>
                            {expense.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expense Entry</DialogTitle>
              <DialogDescription>
                Update expense details and invoice linking
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={editingExpense.description}
                  onChange={(e) => 
                    setEditingExpense({ ...editingExpense, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingExpense.amount}
                  onChange={(e) => 
                    setEditingExpense({ 
                      ...editingExpense, 
                      amount: parseFloat(e.target.value) || 0 
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={editingExpense.category}
                  onValueChange={(value) => 
                    setEditingExpense({ ...editingExpense, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Project</Label>
                <Select
                  value={editingExpense.project_id}
                  onValueChange={(value) => 
                    setEditingExpense({ ...editingExpense, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SHOP_PROJECT_ID}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        SHOP - Internal Overhead
                      </div>
                    </SelectItem>
                    {activeProjects.filter(p => p.id !== SHOP_PROJECT_ID).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingExpense.project_id !== SHOP_PROJECT_ID && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editingExpense.status}
                    onValueChange={(value) => 
                      setEditingExpense({ ...editingExpense, status: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlinked">Unlinked</SelectItem>
                      <SelectItem value="invoiced">Invoiced</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                onClick={() => handleUpdateEntry(editingExpense.id, {
                  description: editingExpense.description,
                  amount: editingExpense.amount,
                  category: editingExpense.category,
                  project_id: editingExpense.project_id,
                  status: editingExpense.status
                })}
              >
                Update Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
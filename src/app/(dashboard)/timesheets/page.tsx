"use client";

import { useEffect, useState } from "react";
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
  Clock, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  Edit,
  CheckCircle,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface Timesheet {
  id: string;
  worker_name: string;
  work_date: string;
  hours_worked: number;
  project_id?: string;
  description?: string;
  status: "unassigned" | "assigned" | "approved" | "invoiced";
  source: "manual" | "whatsapp" | "daily_log";
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    code: string;
    client_name: string;
    description: string;
  };
}

interface Project {
  id: string;
  code: string;
  description: string;
  client_name: string;
  status: string;
}

interface UnassignedStats {
  totalEntries: number;
  totalHours: number;
}

const KNOWN_WORKERS = ["Oscar", "Pedro", "Mario", "Cathy"];

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [unassignedStats, setUnassignedStats] = useState<UnassignedStats>({ totalEntries: 0, totalHours: 0 });
  const [loading, setLoading] = useState(true);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filters
  const searchParams = useSearchParams();
  const [selectedWorker, setSelectedWorker] = useState<string>(searchParams.get('worker') || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || "all");
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project_id') || "all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // New entry form
  const [newEntry, setNewEntry] = useState({
    worker_name: "",
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: "",
    project_id: "",
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, [selectedWorker, selectedStatus, selectedProject, dateRange]);

  async function fetchData() {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedWorker !== "all") params.set('worker', selectedWorker);
      if (selectedStatus !== "all") params.set('status', selectedStatus);
      if (selectedProject !== "all") params.set('project_id', selectedProject);
      if (dateRange.start) params.set('start_date', dateRange.start);
      if (dateRange.end) params.set('end_date', dateRange.end);
      params.set('limit', '100');

      const [timesheetsRes, projectsRes, unassignedRes] = await Promise.all([
        fetch(`/api/timesheets?${params.toString()}`),
        fetch("/api/projects"),
        fetch("/api/timesheets/unassigned"),
      ]);

      const timesheetsData = await timesheetsRes.json();
      const projectsData = await projectsRes.json();
      const unassignedData = await unassignedRes.json();

      setTimesheets(timesheetsData.timesheets || []);
      setProjects(projectsData.projects || []);
      setUnassignedStats(unassignedData.stats || { totalEntries: 0, totalHours: 0 });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEntry() {
    try {
      const response = await fetch("/api/timesheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newEntry,
          hours_worked: parseFloat(newEntry.hours_worked),
          project_id: newEntry.project_id || null,
        }),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setNewEntry({
          worker_name: "",
          work_date: new Date().toISOString().split('T')[0],
          hours_worked: "",
          project_id: "",
          description: "",
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create timesheet entry");
      }
    } catch (error) {
      console.error("Error creating entry:", error);
      alert("Failed to create timesheet entry");
    }
  }

  async function handleUpdateEntry(id: string, updates: Partial<Timesheet>) {
    try {
      const response = await fetch(`/api/timesheets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setEditingTimesheet(null);
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update timesheet entry");
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update timesheet entry");
    }
  }

  const statusColors = {
    unassigned: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    invoiced: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  // Stats
  const totalHours = timesheets.reduce((sum, ts) => sum + ts.hours_worked, 0);
  const totalEntries = timesheets.length;
  const uniqueWorkers = new Set(timesheets.map(ts => ts.worker_name)).size;
  const approvedHours = timesheets
    .filter(ts => ts.status === 'approved')
    .reduce((sum, ts) => sum + ts.hours_worked, 0);

  const activeProjects = projects.filter(p => p.status === "active");

  if (loading) {
    return (
      <div>
        <Header title="Timesheets" description="Labor tracking and project assignment" />
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
        title="Timesheets"
        description="Labor tracking and project assignment"
        action={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timesheet Entry</DialogTitle>
                <DialogDescription>
                  Create a new timesheet entry for worker hours
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="worker_name">Worker Name</Label>
                  <Select
                    value={newEntry.worker_name}
                    onValueChange={(value) => setNewEntry({ ...newEntry, worker_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOWN_WORKERS.map((worker) => (
                        <SelectItem key={worker} value={worker}>
                          {worker}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="work_date">Date</Label>
                  <Input
                    id="work_date"
                    type="date"
                    value={newEntry.work_date}
                    onChange={(e) => setNewEntry({ ...newEntry, work_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hours_worked">Hours Worked</Label>
                  <Input
                    id="hours_worked"
                    type="number"
                    step="0.25"
                    min="0"
                    value={newEntry.hours_worked}
                    onChange={(e) => setNewEntry({ ...newEntry, hours_worked: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project_id">Project (optional)</Label>
                  <Select
                    value={newEntry.project_id}
                    onValueChange={(value) => setNewEntry({ ...newEntry, project_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project or leave unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {activeProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.code} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Work description..."
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateEntry}
                  disabled={!newEntry.worker_name || !newEntry.hours_worked}
                >
                  Create Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Unassigned Hours Alert */}
        {unassignedStats.totalEntries > 0 && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>⚠️ {unassignedStats.totalHours.toFixed(1)} hours unassigned</strong> ({unassignedStats.totalEntries} entries) — 
              <Link 
                href="/timesheets?status=unassigned" 
                className="ml-2 font-medium underline hover:no-underline"
                onClick={() => setSelectedStatus("unassigned")}
              >
                Assign to projects
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
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{totalEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Workers</p>
                  <p className="text-2xl font-bold">{uniqueWorkers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved Hours</p>
                  <p className="text-2xl font-bold">{approvedHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={selectedWorker} onValueChange={setSelectedWorker}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Workers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              {Array.from(new Set(timesheets.map(ts => ts.worker_name))).sort().map((worker) => (
                <SelectItem key={worker} value={worker}>
                  {worker}
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
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {activeProjects.map((project) => (
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

        {/* Timesheets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Timesheet Entries</CardTitle>
            <CardDescription>
              {timesheets.length} {timesheets.length === 1 ? "entry" : "entries"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timesheets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No timesheet entries found</p>
                <p className="text-sm">Add an entry to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheets.map((timesheet) => (
                    <TableRow key={timesheet.id}>
                      <TableCell className="font-medium">
                        {timesheet.worker_name}
                      </TableCell>
                      <TableCell>
                        {formatDate(timesheet.work_date)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {timesheet.hours_worked}h
                      </TableCell>
                      <TableCell>
                        {timesheet.projects ? (
                          <div>
                            <p className="font-medium">{timesheet.projects.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {timesheet.projects.client_name}
                            </p>
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">UNASSIGNED</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {timesheet.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", statusColors[timesheet.status])}>
                          {timesheet.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTimesheet(timesheet)}
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
      {editingTimesheet && (
        <Dialog open={!!editingTimesheet} onOpenChange={() => setEditingTimesheet(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Timesheet Entry</DialogTitle>
              <DialogDescription>
                Update worker hours and project assignment
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Worker: {editingTimesheet.worker_name}</Label>
                <Label>Date: {formatDate(editingTimesheet.work_date)}</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_project">Project</Label>
                <Select
                  value={editingTimesheet.project_id || ""}
                  onValueChange={(value) => 
                    setEditingTimesheet({ ...editingTimesheet, project_id: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project or leave unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {activeProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_hours">Hours</Label>
                <Input
                  id="edit_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={editingTimesheet.hours_worked}
                  onChange={(e) => 
                    setEditingTimesheet({ 
                      ...editingTimesheet, 
                      hours_worked: parseFloat(e.target.value) || 0 
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select
                  value={editingTimesheet.status}
                  onValueChange={(value) => 
                    setEditingTimesheet({ ...editingTimesheet, status: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => handleUpdateEntry(editingTimesheet.id, {
                  project_id: editingTimesheet.project_id || undefined,
                  hours_worked: editingTimesheet.hours_worked,
                  status: editingTimesheet.status
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
"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Calendar, Clock, Users, CloudSun } from "lucide-react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";

interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  work_summary: string;
  areas_worked: string[];
  weather: string;
  total_hours: number;
  status: "draft" | "submitted" | "approved";
  created_at: string;
  projects: {
    id: string;
    code: string;
    description: string;
    client_name: string;
  };
}

interface Project {
  id: string;
  code: string;
  description: string;
  client_name: string;
  status: string;
}

export default function DailyLogsPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [logsRes, projectsRes] = await Promise.all([
          fetch("/api/daily-logs"),
          fetch("/api/projects"),
        ]);

        const logsData = await logsRes.json();
        const projectsData = await projectsRes.json();

        setLogs(logsData.dailyLogs || []);
        setProjects(projectsData.projects || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedProject !== "all" && log.project_id !== selectedProject) {
      return false;
    }
    if (selectedStatus !== "all" && log.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const statusColors = {
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  // Stats
  const totalLogs = filteredLogs.length;
  const totalHours = filteredLogs.reduce((sum, log) => sum + (log.total_hours || 0), 0);
  const draftCount = filteredLogs.filter((l) => l.status === "draft").length;
  const activeProjects = new Set(filteredLogs.map((l) => l.project_id)).size;

  if (loading) {
    return (
      <div>
        <Header title="Daily Logs" description="Field reports and time tracking" />
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
        title="Daily Logs"
        description="Field reports and time tracking"
        action={
          <Link href="/daily-logs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Log
            </Button>
          </Link>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{totalLogs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Clock className="h-5 w-5 text-success" />
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
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Users className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Draft Logs</p>
                  <p className="text-2xl font-bold">{draftCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <CloudSun className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">{activeProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects
                .filter((p) => p.status === "active")
                .map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.client_name}
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Logs</CardTitle>
            <CardDescription>
              {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No daily logs found</p>
                <p className="text-sm">Create your first log to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Weather</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {formatDate(log.log_date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.projects?.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.projects?.client_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {log.work_summary || "-"}
                      </TableCell>
                      <TableCell>{log.weather || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {log.total_hours?.toFixed(1) || "0"}h
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", statusColors[log.status])}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

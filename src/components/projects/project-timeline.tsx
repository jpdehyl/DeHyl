"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime, formatCurrency } from "@/lib/utils";
import type { Activity, ActivityType, TimelineResponse } from "@/types";

interface ProjectTimelineProps {
  projectId: string;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: string; label: string; color: string }
> = {
  email: { icon: "📧", label: "Email", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  invoice: { icon: "💰", label: "Invoice", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  bill: { icon: "📄", label: "Bill", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  bid: { icon: "📋", label: "Bid", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  note: { icon: "📝", label: "Note", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  status_change: { icon: "🔄", label: "Status", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  file: { icon: "📁", label: "File", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  daily_log: { icon: "📓", label: "Daily Log", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  cost: { icon: "💸", label: "Cost", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  safety_checklist: { icon: "🦺", label: "Safety", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
};

const FILTER_OPTIONS: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "invoice", label: "Invoices" },
  { value: "bill", label: "Bills" },
  { value: "cost", label: "Costs" },
  { value: "daily_log", label: "Daily Logs" },
  { value: "safety_checklist", label: "Safety" },
  { value: "note", label: "Notes" },
];

function TimelineItem({
  activity,
  isLast,
}: {
  activity: Activity;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTIVITY_CONFIG[activity.activityType];
  const metadata = activity.metadata as Record<string, unknown>;

  // Determine status color for invoices/bills
  const getStatusColor = () => {
    const status = metadata?.status as string;
    if (!status) return "";
    if (status === "paid") return "text-green-600 dark:text-green-400";
    if (status === "overdue") return "text-red-600 dark:text-red-400";
    return "text-amber-600 dark:text-amber-400";
  };

  return (
    <div className="relative flex gap-3 sm:gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
            config.color
          )}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <div
          className={cn(
            "rounded-lg border bg-card p-3 sm:p-4 transition-colors cursor-pointer hover:bg-muted/50 active:bg-muted/60",
            expanded && "bg-muted/30"
          )}
          onClick={() => setExpanded(!expanded)}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", config.color)}>
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(activity.activityDate)}
                </span>
              </div>
              <h4 className="font-medium mt-1 truncate">{activity.title}</h4>
            </div>
            {metadata?.amount !== undefined && metadata?.amount !== null && (
              <span className={cn("font-semibold whitespace-nowrap", getStatusColor())}>
                {formatCurrency(Number(metadata.amount))}
              </span>
            )}
          </div>

          {/* Description (always visible) */}
          {activity.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* Email-specific fields */}
          {activity.activityType === "email" && (
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              {activity.emailFrom && (
                <p>
                  <span className="font-medium">From:</span> {activity.emailFrom}
                </p>
              )}
              {activity.emailSubject && (
                <p className="truncate">
                  <span className="font-medium">Subject:</span> {activity.emailSubject}
                </p>
              )}
            </div>
          )}

          {/* Expanded content */}
          {expanded && (
            <div className="mt-4 pt-4 border-t space-y-2">
              {activity.emailSnippet ? (
                <p className="text-sm">{activity.emailSnippet}</p>
              ) : null}
              {typeof metadata?.vendorName === "string" && metadata.vendorName ? (
                <p className="text-sm">
                  <span className="font-medium">Vendor:</span>{" "}
                  {metadata.vendorName}
                </p>
              ) : null}
              {typeof metadata?.clientName === "string" && metadata.clientName ? (
                <p className="text-sm">
                  <span className="font-medium">Client:</span>{" "}
                  {metadata.clientName}
                </p>
              ) : null}
              {typeof metadata?.dueDate === "string" && metadata.dueDate ? (
                <p className="text-sm">
                  <span className="font-medium">Due:</span>{" "}
                  {formatDateTime(metadata.dueDate)}
                </p>
              ) : null}
              {typeof metadata?.status === "string" && metadata.status ? (
                <p className="text-sm">
                  <span className="font-medium">Status:</span>{" "}
                  <span className={getStatusColor()}>
                    {metadata.status}
                  </span>
                </p>
              ) : null}
              {/* Daily log details */}
              {typeof metadata?.weather === "string" && metadata.weather ? (
                <p className="text-sm">
                  <span className="font-medium">Weather:</span>{" "}
                  {metadata.weather}
                </p>
              ) : null}
              {typeof metadata?.totalHours === "number" ? (
                <p className="text-sm">
                  <span className="font-medium">Hours:</span>{" "}
                  {metadata.totalHours}h
                </p>
              ) : null}
              {Array.isArray(metadata?.areasWorked) && (metadata.areasWorked as string[]).length > 0 ? (
                <p className="text-sm">
                  <span className="font-medium">Areas:</span>{" "}
                  {(metadata.areasWorked as string[]).join(", ")}
                </p>
              ) : null}
              {/* Cost details */}
              {typeof metadata?.category === "string" && metadata.category ? (
                <p className="text-sm">
                  <span className="font-medium">Category:</span>{" "}
                  {metadata.category}
                </p>
              ) : null}
              {/* Safety checklist details */}
              {typeof metadata?.templateName === "string" && metadata.templateName ? (
                <p className="text-sm">
                  <span className="font-medium">Template:</span>{" "}
                  {metadata.templateName}
                </p>
              ) : null}
              {typeof metadata?.shift === "string" && metadata.shift ? (
                <p className="text-sm">
                  <span className="font-medium">Shift:</span>{" "}
                  {metadata.shift}
                </p>
              ) : null}
              {typeof metadata?.notes === "string" && metadata.notes ? (
                <p className="text-sm text-muted-foreground italic">
                  {metadata.notes}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("types", filter);
      }
      params.set("order", sortOrder);
      params.set("limit", "50");

      const res = await fetch(
        `/api/projects/${projectId}/timeline?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch timeline");

      const data: TimelineResponse = await res.json();
      setActivities(data.activities);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, [projectId, filter, sortOrder]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/timeline/sync`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to sync timeline");
      await fetchTimeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: "note",
          title: newNote.title,
          description: newNote.description || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to add note");

      setNewNote({ title: "", description: "" });
      setDialogOpen(false);
      await fetchTimeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>
              {total} {total === 1 ? "activity" : "activities"} recorded
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 sm:h-9"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-10 sm:h-9">Add Note</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note</DialogTitle>
                  <DialogDescription>
                    Add a manual note to the project timeline.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Called client about permit"
                      value={newNote.title}
                      onChange={(e) =>
                        setNewNote({ ...newNote, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Additional details..."
                      value={newNote.description}
                      onChange={(e) =>
                        setNewNote({ ...newNote, description: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.title.trim() || submitting}
                  >
                    {submitting ? "Adding..." : "Add Note"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? "default" : "outline"}
                size="sm"
                className="h-9 px-3 text-xs sm:text-sm"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="ml-auto">
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as "desc" | "asc")}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        {error && (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchTimeline}
            >
              Retry
            </Button>
          </div>
        )}

        {loading && <TimelineSkeleton />}

        {!loading && !error && activities.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-medium">No activities yet</p>
            <p className="text-sm mt-1">
              Click &quot;Sync&quot; to import invoices and bills, or add a note
              to get started.
            </p>
          </div>
        )}

        {!loading && !error && activities.length > 0 && (
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <TimelineItem
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="text-center pt-4">
            <Button variant="outline" size="sm">
              Load more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

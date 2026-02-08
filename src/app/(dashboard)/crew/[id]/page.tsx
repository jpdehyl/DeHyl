"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  Award,
  FolderOpen,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  Building,
  User,
  Shield,
} from "lucide-react";
import type { CrewDetailResponse, Certification, CrewRole } from "@/types/crew";

const roleLabels: Record<CrewRole, string> = {
  superintendent: "Superintendent",
  foreman: "Foreman",
  laborer: "Laborer",
  driver: "Driver",
  operator: "Operator",
  admin: "Admin",
};

export default function CrewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { sidebarOpen } = useAppStore();

  const [data, setData] = useState<CrewDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  // Certification dialog
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [newCert, setNewCert] = useState({
    name: "",
    cert_number: "",
    issuing_body: "",
    expiry_date: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/crew/${id}`);
        if (!response.ok) throw new Error("Failed to fetch crew member");

        const result = await response.json();
        setData(result);
        setEditForm(result.crew_member);
      } catch (err) {
        console.error("Error fetching crew member:", err);
        setError(err instanceof Error ? err.message : "Failed to load crew member");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/crew/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to update");

      const updated = await response.json();
      setData((prev) => prev ? { ...prev, crew_member: updated } : null);
      setEditing(false);
    } catch (err) {
      console.error("Error updating:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this crew member?")) return;

    try {
      const response = await fetch(`/api/crew/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      router.push("/crew");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleAddCertification = async () => {
    try {
      // For now, we'd need a separate endpoint for certifications
      // This is a placeholder for the UI
      setCertDialogOpen(false);
      setNewCert({ name: "", cert_number: "", issuing_body: "", expiry_date: "" });
    } catch (err) {
      console.error("Error adding certification:", err);
    }
  };

  if (loading) {
    return (
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <Header title="Loading..." />
        <main className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-1" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <Header title="Error" />
        <main className="p-6">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                <span>{error || "Crew member not found"}</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const member = data.crew_member;

  return (
    <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
      <Header title={member.name} />
      <main className="p-6">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/crew">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Crew
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(!editing)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editForm.name as string}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editForm.phone as string || ""}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editForm.email as string || ""}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={editForm.role as string || ""}
                      onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="superintendent">Superintendent</SelectItem>
                        <SelectItem value="foreman">Foreman</SelectItem>
                        <SelectItem value="laborer">Laborer</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editForm.status as string}
                      onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editForm.notes as string || ""}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        member.status === "active" && "bg-green-500/10 text-green-500",
                        member.status === "inactive" && "bg-gray-500/10 text-gray-500",
                        member.status === "on_leave" && "bg-amber-500/10 text-amber-500"
                      )}
                    >
                      {member.status === "on_leave" ? "On Leave" : member.status}
                    </Badge>
                    {member.role && (
                      <Badge variant="outline">{roleLabels[member.role]}</Badge>
                    )}
                  </div>

                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${member.phone}`} className="hover:underline">
                        {member.phone}
                      </a>
                    </div>
                  )}

                  {member.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${member.email}`} className="hover:underline">
                        {member.email}
                      </a>
                    </div>
                  )}

                  {member.employment_type === "subcontractor" && member.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{member.company}</span>
                    </div>
                  )}

                  {member.hire_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Hired: {new Date(member.hire_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {member.emergency_contact_name && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
                      <p className="font-medium">{member.emergency_contact_name}</p>
                      {member.emergency_contact_phone && (
                        <a
                          href={`tel:${member.emergency_contact_phone}`}
                          className="text-sm hover:underline"
                        >
                          {member.emergency_contact_phone}
                        </a>
                      )}
                    </div>
                  )}

                  {member.notes && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats & Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">This Week</span>
                  </div>
                  <p className="text-2xl font-bold">{data.stats.hours_this_week}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">This Month</span>
                  </div>
                  <p className="text-2xl font-bold">{data.stats.hours_this_month}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Projects</span>
                  </div>
                  <p className="text-2xl font-bold">{data.stats.active_projects}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Expiring Certs</span>
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      data.stats.expiring_certs > 0 && "text-amber-500"
                    )}
                  >
                    {data.stats.expiring_certs}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="time" className="w-full">
              <TabsList>
                <TabsTrigger value="time">Time Entries</TabsTrigger>
                <TabsTrigger value="certs">Certifications</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="time" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Time Entries</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.recent_time_entries.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No time entries recorded
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Task</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.recent_time_entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                {new Date(entry.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {entry.project ? (
                                  <Link
                                    href={`/projects/${entry.project.id}`}
                                    className="hover:underline text-primary"
                                  >
                                    {entry.project.code}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{entry.hours}h</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {entry.task_description || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certs" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Certifications</CardTitle>
                        <CardDescription>Training and safety certificates</CardDescription>
                      </div>
                      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Certification</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label>Certificate Name</Label>
                              <Input
                                value={newCert.name}
                                onChange={(e) =>
                                  setNewCert({ ...newCert, name: e.target.value })
                                }
                                placeholder="e.g., First Aid Level 3"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Certificate #</Label>
                                <Input
                                  value={newCert.cert_number}
                                  onChange={(e) =>
                                    setNewCert({ ...newCert, cert_number: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Expiry Date</Label>
                                <Input
                                  type="date"
                                  value={newCert.expiry_date}
                                  onChange={(e) =>
                                    setNewCert({ ...newCert, expiry_date: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Issuing Body</Label>
                              <Input
                                value={newCert.issuing_body}
                                onChange={(e) =>
                                  setNewCert({ ...newCert, issuing_body: e.target.value })
                                }
                                placeholder="e.g., Red Cross"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setCertDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleAddCertification}>Add</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {data.certifications.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No certifications on file
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Certificate</TableHead>
                            <TableHead>Number</TableHead>
                            <TableHead>Issuer</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.certifications.map((cert) => {
                            const isExpiring =
                              cert.expiry_date &&
                              new Date(cert.expiry_date) <=
                                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                            const isExpired =
                              cert.expiry_date &&
                              new Date(cert.expiry_date) < new Date();

                            return (
                              <TableRow key={cert.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-muted-foreground" />
                                    {cert.name}
                                  </div>
                                </TableCell>
                                <TableCell>{cert.cert_number || "-"}</TableCell>
                                <TableCell>{cert.issuing_body || "-"}</TableCell>
                                <TableCell>
                                  {cert.expiry_date
                                    ? new Date(cert.expiry_date).toLocaleDateString()
                                    : "No expiry"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      isExpired && "bg-red-500/10 text-red-500",
                                      isExpiring &&
                                        !isExpired &&
                                        "bg-amber-500/10 text-amber-500",
                                      !isExpiring &&
                                        !isExpired &&
                                        "bg-green-500/10 text-green-500"
                                    )}
                                  >
                                    {isExpired
                                      ? "Expired"
                                      : isExpiring
                                      ? "Expiring Soon"
                                      : "Valid"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Assignments</CardTitle>
                    <CardDescription>Current and past projects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.assignments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Not assigned to any projects
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.assignments.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell className="font-medium">
                                {assignment.project ? (
                                  <Link
                                    href={`/projects/${assignment.project_id}`}
                                    className="hover:underline text-primary"
                                  >
                                    {assignment.project.code} - {assignment.project.description}
                                  </Link>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>{assignment.role || "-"}</TableCell>
                              <TableCell>
                                {assignment.start_date
                                  ? new Date(assignment.start_date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {assignment.end_date
                                  ? new Date(assignment.end_date).toLocaleDateString()
                                  : "Ongoing"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    assignment.is_active
                                      ? "bg-green-500/10 text-green-500"
                                      : "bg-gray-500/10 text-gray-500"
                                  )}
                                >
                                  {assignment.is_active ? "Active" : "Completed"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  HardHat,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { CrewMemberPublic, CrewRole, CrewStatus } from "@/types/crew";

const roleLabels: Record<CrewRole, string> = {
  superintendent: "Superintendent",
  foreman: "Foreman",
  laborer: "Laborer",
  driver: "Driver",
  operator: "Operator",
  admin: "Admin",
};

const statusColors: Record<CrewStatus, string> = {
  active: "bg-green-500/10 text-green-500",
  inactive: "bg-gray-500/10 text-gray-500",
  on_leave: "bg-amber-500/10 text-amber-500",
};

export default function CrewPage() {
  const { sidebarOpen } = useAppStore();
  const [crew, setCrew] = useState<CrewMemberPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  // New crew member dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    email: "",
    role: "" as CrewRole | "",
    employment_type: "employee" as "employee" | "subcontractor",
    company: "",
  });

  // Fetch crew members
  useEffect(() => {
    async function fetchCrew() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (roleFilter !== "all") params.set("role", roleFilter);
        
        const response = await fetch(`/api/crew?${params}`);
        if (!response.ok) throw new Error("Failed to fetch crew");
        
        const data = await response.json();
        setCrew(data.crew || []);
      } catch (err) {
        console.error("Error fetching crew:", err);
        setError(err instanceof Error ? err.message : "Failed to load crew");
      } finally {
        setLoading(false);
      }
    }

    fetchCrew();
  }, [statusFilter, roleFilter]);

  // Filter by search
  const filteredCrew = useMemo(() => {
    if (!search) return crew;
    const searchLower = search.toLowerCase();
    return crew.filter(
      (member) =>
        member.name.toLowerCase().includes(searchLower) ||
        member.phone?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.company?.toLowerCase().includes(searchLower)
    );
  }, [crew, search]);

  // Stats
  const stats = useMemo(() => {
    const active = crew.filter((m) => m.status === "active").length;
    const onLeave = crew.filter((m) => m.status === "on_leave").length;
    return { active, onLeave, total: crew.length };
  }, [crew]);

  // Handle new member creation
  const handleCreateMember = async () => {
    if (!newMember.name.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMember.name,
          phone: newMember.phone || undefined,
          email: newMember.email || undefined,
          role: newMember.role || undefined,
          employment_type: newMember.employment_type,
          company: newMember.employment_type === "subcontractor" ? newMember.company : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create crew member");

      const created = await response.json();
      setCrew((prev) => [...prev, created]);
      setDialogOpen(false);
      setNewMember({
        name: "",
        phone: "",
        email: "",
        role: "",
        employment_type: "employee",
        company: "",
      });
    } catch (err) {
      console.error("Error creating crew member:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <Header title="Crew" />
        <main className="p-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <Header title="Crew" />
        <main className="p-6">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
      <Header title="Crew" />
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Crew</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onLeave}</div>
              <p className="text-xs text-muted-foreground">Temporarily away</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Crew</CardTitle>
              <HardHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All employees & subs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="superintendent">Superintendent</SelectItem>
              <SelectItem value="foreman">Foreman</SelectItem>
              <SelectItem value="laborer">Laborer</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Crew Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Crew Member</DialogTitle>
                <DialogDescription>
                  Add a new employee or subcontractor to your crew.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      placeholder="+1 604..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(v) => setNewMember({ ...newMember, role: v as CrewRole })}
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
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select
                      value={newMember.employment_type}
                      onValueChange={(v) =>
                        setNewMember({ ...newMember, employment_type: v as "employee" | "subcontractor" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {newMember.employment_type === "subcontractor" && (
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={newMember.company}
                      onChange={(e) => setNewMember({ ...newMember, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMember} disabled={saving || !newMember.name.trim()}>
                  {saving ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Crew Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCrew.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "No crew members match your search" : "No crew members found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCrew.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/crew/${member.id}`}
                        className="hover:underline text-primary"
                      >
                        {member.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {member.role ? (
                        <Badge variant="outline">{roleLabels[member.role]}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {member.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        )}
                        {!member.phone && !member.email && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {member.employment_type === "subcontractor"
                          ? member.company || "Subcontractor"
                          : "Employee"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[member.status]}>
                        {member.status === "on_leave"
                          ? "On Leave"
                          : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/crew/${member.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Project {
  id: string;
  code: string;
  description: string;
  client_name: string;
  status: string;
}

interface CrewMember {
  workerName: string;
  workerType: string;
  hoursWorked: number;
  role: string;
  notes: string;
}

export default function NewDailyLogPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [projectId, setProjectId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [workSummary, setWorkSummary] = useState("");
  const [areasWorked, setAreasWorked] = useState("");
  const [weather, setWeather] = useState("");
  const [weatherImpact, setWeatherImpact] = useState("");
  const [temperatureHigh, setTemperatureHigh] = useState<string>("");
  const [temperatureLow, setTemperatureLow] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [safetyMeetingHeld, setSafetyMeetingHeld] = useState(false);
  const [incidentsReported, setIncidentsReported] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState("");

  // Crew
  const [crew, setCrew] = useState<CrewMember[]>([
    { workerName: "", workerType: "employee", hoursWorked: 8, role: "", notes: "" },
  ]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        setProjects(data.projects?.filter((p: Project) => p.status === "active") || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const addCrewMember = () => {
    setCrew([
      ...crew,
      { workerName: "", workerType: "employee", hoursWorked: 8, role: "", notes: "" },
    ]);
  };

  const removeCrewMember = (index: number) => {
    if (crew.length > 1) {
      setCrew(crew.filter((_, i) => i !== index));
    }
  };

  const updateCrewMember = (index: number, field: keyof CrewMember, value: string | number) => {
    const updated = [...crew];
    updated[index] = { ...updated[index], [field]: value };
    setCrew(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !logDate) {
      toast.warning("Please select a project and date");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          logDate,
          workSummary,
          areasWorked: areasWorked.split(",").map((a) => a.trim()).filter(Boolean),
          weather,
          weatherImpact,
          temperatureHigh: temperatureHigh ? parseInt(temperatureHigh) : null,
          temperatureLow: temperatureLow ? parseInt(temperatureLow) : null,
          notes,
          internalNotes,
          safetyMeetingHeld,
          incidentsReported,
          incidentDetails: incidentsReported ? incidentDetails : null,
          crew: crew.filter((c) => c.workerName.trim()),
        }),
      });

      if (res.ok) {
        router.push("/daily-logs");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create daily log");
      }
    } catch (error) {
      console.error("Error creating daily log:", error);
      toast.error("Failed to create daily log");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="New Daily Log" description="Loading..." />
        <div className="p-4 md:p-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="New Daily Log"
        description="Create a field report for today"
        action={
          <Link href="/daily-logs">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6 max-w-4xl">
        {/* Project & Date */}
        <Card>
          <CardHeader>
            <CardTitle>Project & Date</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.code} - {project.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Work Summary</CardTitle>
            <CardDescription>What was accomplished today?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                placeholder="Describe the work performed today..."
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="areas">Areas Worked (comma separated)</Label>
              <Input
                id="areas"
                placeholder="e.g. Kitchen, Master Bedroom, Garage"
                value={areasWorked}
                onChange={(e) => setAreasWorked(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Weather */}
        <Card>
          <CardHeader>
            <CardTitle>Weather Conditions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weather">Weather</Label>
              <Select value={weather} onValueChange={setWeather}>
                <SelectTrigger>
                  <SelectValue placeholder="Select weather" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunny">☀️ Sunny</SelectItem>
                  <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                  <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                  <SelectItem value="snowy">❄️ Snowy</SelectItem>
                  <SelectItem value="windy">💨 Windy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weatherImpact">Impact on Work</Label>
              <Input
                id="weatherImpact"
                placeholder="e.g. No impact, Delayed start"
                value={weatherImpact}
                onChange={(e) => setWeatherImpact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempHigh">High Temp (°C)</Label>
              <Input
                id="tempHigh"
                type="number"
                placeholder="e.g. 25"
                value={temperatureHigh}
                onChange={(e) => setTemperatureHigh(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempLow">Low Temp (°C)</Label>
              <Input
                id="tempLow"
                type="number"
                placeholder="e.g. 15"
                value={temperatureLow}
                onChange={(e) => setTemperatureLow(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Crew */}
        <Card>
          <CardHeader>
            <CardTitle>Crew & Hours</CardTitle>
            <CardDescription>Who worked on site today?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {crew.map((member, index) => (
              <div key={index} className="flex gap-4 items-start border-b pb-4 last:border-0">
                <div className="flex-1 grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="Worker name"
                      value={member.workerName}
                      onChange={(e) => updateCrewMember(index, "workerName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={member.workerType}
                      onValueChange={(v) => updateCrewMember(index, "workerType", v)}
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
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={member.hoursWorked}
                      onChange={(e) => updateCrewMember(index, "hoursWorked", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      placeholder="e.g. Foreman"
                      value={member.role}
                      onChange={(e) => updateCrewMember(index, "role", e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-7"
                  onClick={() => removeCrewMember(index)}
                  disabled={crew.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addCrewMember}>
              <Plus className="mr-2 h-4 w-4" />
              Add Crew Member
            </Button>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card>
          <CardHeader>
            <CardTitle>Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                id="safetyMeeting"
                checked={safetyMeetingHeld}
                onCheckedChange={setSafetyMeetingHeld}
              />
              <Label htmlFor="safetyMeeting">Safety meeting held</Label>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                id="incidents"
                checked={incidentsReported}
                onCheckedChange={setIncidentsReported}
              />
              <Label htmlFor="incidents">Incidents reported</Label>
            </div>
            {incidentsReported && (
              <div className="space-y-2">
                <Label htmlFor="incidentDetails">Incident Details</Label>
                <Textarea
                  id="incidentDetails"
                  placeholder="Describe the incident..."
                  value={incidentDetails}
                  onChange={(e) => setIncidentDetails(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">General Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes (not visible to clients)</Label>
              <Textarea
                id="internalNotes"
                placeholder="Private notes..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Daily Log"
            )}
          </Button>
          <Link href="/daily-logs">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

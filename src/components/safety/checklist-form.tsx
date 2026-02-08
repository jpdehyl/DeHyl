"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignatureCanvas } from "./signature-canvas";
import { Loader2, Save, AlertTriangle, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateItem {
  id: string;
  question: string;
  type: "checkbox" | "text" | "textarea" | "select" | "multiselect" | "date" | "time";
  required: boolean;
  options?: string[];
}

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  items: TemplateItem[];
}

interface Project {
  id: string;
  code: string;
  description: string;
}

interface ChecklistFormProps {
  template: Template;
  projects: Project[];
  initialData?: {
    project_id?: string;
    responses?: Record<string, string | boolean | string[]>;
    attendees?: string[];
    hazards_identified?: string;
    controls_implemented?: string;
    additional_notes?: string;
    signature_data?: string;
  };
}

export function ChecklistForm({ template, projects, initialData }: ChecklistFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [projectId, setProjectId] = useState(initialData?.project_id || "");
  const [responses, setResponses] = useState<Record<string, string | boolean | string[]>>(
    initialData?.responses || {}
  );
  const [attendees, setAttendees] = useState<string[]>(initialData?.attendees || []);
  const [newAttendee, setNewAttendee] = useState("");
  const [hazardsIdentified, setHazardsIdentified] = useState(initialData?.hazards_identified || "");
  const [controlsImplemented, setControlsImplemented] = useState(initialData?.controls_implemented || "");
  const [additionalNotes, setAdditionalNotes] = useState(initialData?.additional_notes || "");
  const [signatureData, setSignatureData] = useState(initialData?.signature_data || "");
  const [weather, setWeather] = useState("");
  const [location, setLocation] = useState("");

  const updateResponse = (itemId: string, value: string | boolean | string[]) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const addAttendee = () => {
    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
      setAttendees([...attendees, newAttendee.trim()]);
      setNewAttendee("");
    }
  };

  const removeAttendee = (name: string) => {
    setAttendees(attendees.filter(a => a !== name));
  };

  const validateForm = (): boolean => {
    // Check required items
    for (const item of template.items) {
      if (item.required) {
        const response = responses[item.id];
        if (item.type === "checkbox" && response !== true) {
          setError(`Please check: ${item.question}`);
          return false;
        }
        if (item.type !== "checkbox" && (!response || (Array.isArray(response) && response.length === 0))) {
          setError(`Please complete: ${item.question}`);
          return false;
        }
      }
    }

    // Require signature
    if (!signatureData) {
      setError("Please provide your signature");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          project_id: projectId || null,
          date: new Date().toISOString().split("T")[0],
          weather,
          location,
          responses,
          attendees: template.type === "tailgate" ? attendees : undefined,
          hazards_identified: hazardsIdentified || null,
          controls_implemented: controlsImplemented || null,
          additional_notes: additionalNotes || null,
          signature_data: signatureData,
          status: "completed"
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit checklist");
      }

      router.push("/safety?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = (item: TemplateItem) => {
    const value = responses[item.id];

    switch (item.type) {
      case "checkbox":
        return (
          <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
            <Checkbox
              id={item.id}
              checked={value === true}
              onCheckedChange={(checked) => updateResponse(item.id, checked === true)}
              className="mt-0.5 h-5 w-5"
            />
            <Label
              htmlFor={item.id}
              className={cn(
                "text-sm leading-tight cursor-pointer flex-1",
                item.required && "font-medium"
              )}
            >
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {value === true && (
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
            )}
          </div>
        );

      case "select":
        return (
          <div className="py-3 border-b last:border-b-0 space-y-2">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ""}
              onValueChange={(v) => updateResponse(item.id, v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {item.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "multiselect":
        const selectedOptions = (value as string[]) || [];
        return (
          <div className="py-3 border-b last:border-b-0 space-y-2">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="flex flex-wrap gap-2">
              {item.options?.map((option) => {
                const isSelected = selectedOptions.includes(option);
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newSelection = isSelected
                        ? selectedOptions.filter((o) => o !== option)
                        : [...selectedOptions, option];
                      updateResponse(item.id, newSelection);
                    }}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case "textarea":
        return (
          <div className="py-3 border-b last:border-b-0 space-y-2">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              value={(value as string) || ""}
              onChange={(e) => updateResponse(item.id, e.target.value)}
              placeholder="Enter details..."
              rows={3}
            />
          </div>
        );

      case "text":
        return (
          <div className="py-3 border-b last:border-b-0 space-y-2">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              type="text"
              value={(value as string) || ""}
              onChange={(e) => updateResponse(item.id, e.target.value)}
              placeholder="Enter value..."
            />
          </div>
        );

      case "date":
        return (
          <div className="py-3 border-b last:border-b-0 space-y-2">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              type="date"
              value={(value as string) || new Date().toISOString().split("T")[0]}
              onChange={(e) => updateResponse(item.id, e.target.value)}
            />
          </div>
        );

      case "time":
        return (
          <div className="py-3 border-b last:border-b-0 space-y-2">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              type="time"
              value={(value as string) || ""}
              onChange={(e) => updateResponse(item.id, e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Header Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project (Optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weather</Label>
              <Select value={weather} onValueChange={setWeather}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
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
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Site location..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">{template.name}</CardTitle>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </CardHeader>
        <CardContent className="px-4">
          {template.items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </CardContent>
      </Card>

      {/* Tailgate Meeting Attendees */}
      {template.type === "tailgate" && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Meeting Attendees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                placeholder="Enter name..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttendee())}
              />
              <Button type="button" onClick={addAttendee} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {attendees.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeAttendee(name)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {attendees.length === 0 && (
              <p className="text-sm text-muted-foreground">No attendees added yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hazards & Controls (for FLHA) */}
      {template.type === "flha" && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Hazard Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hazards Identified</Label>
              <Textarea
                value={hazardsIdentified}
                onChange={(e) => setHazardsIdentified(e.target.value)}
                placeholder="List all hazards identified..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Controls Implemented</Label>
              <Textarea
                value={controlsImplemented}
                onChange={(e) => setControlsImplemented(e.target.value)}
                placeholder="Describe control measures..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional comments or observations..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Signature */}
      <SignatureCanvas
        onSave={setSignatureData}
        initialValue={signatureData}
      />

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-background pt-4 pb-4 border-t -mx-4 px-4 mt-4">
        <Button
          type="submit"
          className="w-full h-12 text-base"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Submit Checklist
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

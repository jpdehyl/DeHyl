"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuoteEstimateCard } from "@/components/quotes";
import { Loader2, Sparkles, Calculator } from "lucide-react";
import type { Bid, ProjectType, ProjectTypeOption, QuoteResponse } from "@/types";

interface NewBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBidCreated?: (bid: Bid) => void;
  clients?: string[];
}

const DEFAULT_PROJECT_TYPES: ProjectTypeOption[] = [
  { code: 'interior_demo', name: 'Interior Demolition', description: 'Removal of non-structural interior elements', typicalPricePerSqFt: 8.50 },
  { code: 'full_demo', name: 'Full Demolition', description: 'Complete building demolition', typicalPricePerSqFt: 12.00 },
  { code: 'abatement', name: 'Hazardous Material Abatement', description: 'Asbestos, lead, mold removal', typicalPricePerSqFt: 15.00 },
  { code: 'retail_fitout', name: 'Retail Fit-out', description: 'Commercial space renovation', typicalPricePerSqFt: 10.00 },
  { code: 'hazmat', name: 'Hazmat Cleanup', description: 'Hazardous material handling and disposal', typicalPricePerSqFt: 18.00 },
  { code: 'restoration', name: 'Restoration', description: 'Building restoration and repair work', typicalPricePerSqFt: 14.00 },
];

export function NewBidDialog({
  open,
  onOpenChange,
  onBidCreated,
  clients = [],
}: NewBidDialogProps) {
  // Form state
  const [name, setName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [squareFootage, setSquareFootage] = useState("");
  const [location, setLocation] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");

  // Quote state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [projectTypes, setProjectTypes] = useState<ProjectTypeOption[]>(DEFAULT_PROJECT_TYPES);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project types on mount
  useEffect(() => {
    async function fetchProjectTypes() {
      try {
        const response = await fetch("/api/project-types");
        if (response.ok) {
          const data = await response.json();
          if (data.projectTypes?.length > 0) {
            setProjectTypes(data.projectTypes);
          }
        }
      } catch {
        // Use default types if fetch fails
      }
    }

    fetchProjectTypes();
  }, []);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setClientCode("");
      setDescription("");
      setProjectType("");
      setSquareFootage("");
      setLocation("");
      setDueDate("");
      setEstimatedValue("");
      setQuote(null);
      setError(null);
    }
  }, [open]);

  // Generate quote
  async function handleGenerateQuote() {
    if (!projectType || !description) {
      setError("Please fill in project type and description to generate a quote");
      return;
    }

    setLoadingQuote(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientCode: clientCode || undefined,
          projectType,
          description,
          squareFootage: squareFootage ? parseInt(squareFootage) : undefined,
          location: location || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quote");
      }

      const data = await response.json();
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quote");
    } finally {
      setLoadingQuote(false);
    }
  }

  // Use estimate from quote
  function handleUseEstimate(value: number) {
    setEstimatedValue(value.toString());
  }

  // Create bid
  async function handleSubmit() {
    if (!name) {
      setError("Bid name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          clientCode: clientCode || null,
          description: description || null,
          projectType: projectType || null,
          squareFootage: squareFootage ? parseInt(squareFootage) : null,
          location: location || null,
          dueDate: dueDate || null,
          estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
          status: "draft",
          quoteMetadata: quote ? {
            generatedAt: new Date().toISOString(),
            confidence: quote.confidence,
            basedOnProjects: quote.similarProjects.map(p => p.id),
            estimatedRange: quote.estimatedRange,
          } : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create bid");
      }

      const data = await response.json();
      onBidCreated?.(data.bid);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Bid</DialogTitle>
          <DialogDescription>
            Enter bid details and generate an estimate based on similar historical projects.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Row 1: Name and Client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bid Name *</Label>
              <Input
                id="name"
                placeholder="e.g., TD Edgemont Demo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={clientCode} onValueChange={setClientCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  {clients.length === 0 && (
                    <>
                      <SelectItem value="CD">CD - Certified Demolition</SelectItem>
                      <SelectItem value="ADR">ADR - ADR Construction</SelectItem>
                      <SelectItem value="R&S">R&amp;S - Russell &amp; Sons</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Project Type and Square Footage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={projectType}
                onValueChange={(val) => setProjectType(val as ProjectType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="squareFootage">Square Footage</Label>
              <Input
                id="squareFootage"
                type="number"
                placeholder="e.g., 5000"
                value={squareFootage}
                onChange={(e) => setSquareFootage(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Interior demolition of retail space, including ceiling and flooring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Row 4: Location and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Vancouver, BC"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Generate Quote Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGenerateQuote}
            disabled={loadingQuote || !projectType || !description}
          >
            {loadingQuote ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating estimate...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get Estimate from Historical Data
              </>
            )}
          </Button>

          {/* Quote Result */}
          {quote && (
            <QuoteEstimateCard
              quote={quote}
              onUseEstimate={handleUseEstimate}
            />
          )}

          {/* Estimated Value (manual or from quote) */}
          <div className="space-y-2">
            <Label htmlFor="estimatedValue">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Estimated Value
              </span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="estimatedValue"
                type="number"
                className="pl-7"
                placeholder="Enter or use generated estimate"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Bid"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

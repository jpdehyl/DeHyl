"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CostCategory } from "@/types";

interface QuickCostEntryProps {
  projectId: string;
  onCostAdded?: () => void;
}

const CATEGORIES: { value: CostCategory; label: string }[] = [
  { value: "labor", label: "Labor" },
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "disposal", label: "Disposal" },
  { value: "permits", label: "Permits" },
  { value: "fuel", label: "Fuel" },
  { value: "rental", label: "Rental" },
  { value: "other", label: "Other" },
];

export function QuickCostEntry({ projectId, onCostAdded }: QuickCostEntryProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [savedTotal, setSavedTotal] = useState(0);
  const descRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    cost_date: new Date().toISOString().split("T")[0],
    category: "materials" as CostCategory,
    vendor: "",
  });

  // Focus description field when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => descRef.current?.focus(), 100);
    } else {
      // Reset when closing
      setSavedCount(0);
      setSavedTotal(0);
      setJustSaved(false);
    }
  }, [open]);

  function resetForm() {
    setForm({
      description: "",
      amount: "",
      cost_date: new Date().toISOString().split("T")[0],
      category: form.category, // Keep last category
      vendor: form.vendor, // Keep last vendor
    });
  }

  async function handleSave(addAnother: boolean) {
    if (!form.description || !form.amount) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          amount: parseFloat(form.amount),
          cost_date: form.cost_date,
          category: form.category,
          vendor: form.vendor || null,
        }),
      });

      if (res.ok) {
        const amt = parseFloat(form.amount);
        setSavedCount((c) => c + 1);
        setSavedTotal((t) => t + amt);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
        onCostAdded?.();

        if (addAnother) {
          resetForm();
          setTimeout(() => descRef.current?.focus(), 50);
        } else {
          setOpen(false);
          resetForm();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Failed to save cost");
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = form.description.trim() !== "" && form.amount !== "" && parseFloat(form.amount) > 0;

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all md:bottom-8 md:right-8"
        aria-label="Add cost"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Quick Cost Entry</SheetTitle>
            <SheetDescription>
              {savedCount > 0
                ? `${savedCount} saved (${formatCurrency(savedTotal)}) — add more or close`
                : "Add a cost to this project"}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-4">
            {/* Description */}
            <div className="grid gap-1.5">
              <Label htmlFor="qc-desc">What was it for?</Label>
              <Input
                ref={descRef}
                id="qc-desc"
                className="h-11 sm:h-10 text-base sm:text-sm"
                placeholder="e.g., Dumpster rental, concrete saw"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) handleSave(false);
                }}
              />
            </div>

            {/* Amount + Date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="qc-amount">Amount ($)</Label>
                <Input
                  id="qc-amount"
                  className="h-11 sm:h-10 text-base sm:text-sm"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="qc-date">Date</Label>
                <Input
                  id="qc-date"
                  className="h-11 sm:h-10 text-base sm:text-sm"
                  type="date"
                  value={form.cost_date}
                  onChange={(e) => setForm({ ...form, cost_date: e.target.value })}
                />
              </div>
            </div>

            {/* Category + Vendor row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="qc-cat">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as CostCategory })}
                >
                  <SelectTrigger id="qc-cat" className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="qc-vendor">Vendor</Label>
                <Input
                  id="qc-vendor"
                  className="h-11 sm:h-10 text-base sm:text-sm"
                  placeholder="Optional"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pb-safe sm:flex-row-reverse">
            <Button
              onClick={() => handleSave(true)}
              disabled={!isValid || submitting}
              variant="outline"
              className="gap-2 h-12 sm:h-10 text-base sm:text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              {submitting ? "Saving..." : "Save & Add Another"}
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={!isValid || submitting}
              className="gap-2 h-12 sm:h-10 text-base sm:text-sm"
            >
              {justSaved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {submitting ? "Saving..." : justSaved ? "Saved!" : "Save & Close"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

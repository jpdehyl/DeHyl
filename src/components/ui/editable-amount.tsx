"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface EditableAmountProps {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  className?: string;
  isOverridden?: boolean;
  prefix?: string;
  label?: string;
}

export function EditableAmount({
  value,
  onSave,
  className,
  isOverridden,
  prefix,
  label,
}: EditableAmountProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(value.toFixed(2));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [editing, value]);

  async function handleSave() {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) return;

    setSaving(true);
    try {
      await onSave(num);
      setEditing(false);
    } catch {
      // Stay in edit mode on error
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <div className="relative flex items-center">
          <span className="absolute left-2 text-sm text-muted-foreground">$</span>
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!saving) setEditing(false);
            }}
            className="h-8 w-28 rounded border bg-background pl-6 pr-1 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={saving}
          />
        </div>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
          disabled={saving}
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setEditing(false)}
          className="p-1 text-muted-foreground hover:bg-muted rounded"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group inline-flex items-center gap-1">
      {label && (
        <span className="text-xs text-muted-foreground mr-1">{label}</span>
      )}
      <span className={cn("tabular-nums", className)}>
        {formatCurrency(value)}
      </span>
      {isOverridden && (
        <span title="Manually overridden — won't be updated by QB sync">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        </span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-opacity"
        aria-label="Edit amount"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

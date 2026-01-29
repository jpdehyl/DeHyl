"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, Loader2, ArrowRight } from "lucide-react";
import { JsonRenderer, type Dashboard } from "@/lib/json-render/renderer";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  onApply: (dashboard: Dashboard) => void;
}

const SUGGESTIONS = [
  {
    text: "Show receivables aging breakdown",
    icon: "📊",
  },
  {
    text: "Compare this month vs last month revenue",
    icon: "📈",
  },
  {
    text: "Which projects are most profitable?",
    icon: "💰",
  },
  {
    text: "Show overdue invoices by client",
    icon: "⚠️",
  },
  {
    text: "Active projects summary",
    icon: "📁",
  },
];

export function CommandPalette({ onApply }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDashboard, setGeneratedDashboard] = useState<Dashboard | null>(null);

  // Handle Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        if (generatedDashboard) {
          setGeneratedDashboard(null);
        } else {
          setOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [generatedDashboard]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedDashboard(null);

    try {
      const response = await fetch("/api/dashboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: searchQuery.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate dashboard");
      }

      setGeneratedDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  }, [query, handleSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  }, [handleSearch]);

  const handleApply = useCallback(() => {
    if (generatedDashboard) {
      onApply(generatedDashboard);
      setOpen(false);
      setQuery("");
      setGeneratedDashboard(null);
    }
  }, [generatedDashboard, onApply]);

  const handleBack = useCallback(() => {
    setGeneratedDashboard(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setError(null);
    setGeneratedDashboard(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[85vh] overflow-hidden">
        {!generatedDashboard ? (
          <>
            {/* Search Input */}
            <form onSubmit={handleSubmit} className="flex items-center border-b px-4">
              {loading ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-muted-foreground" />
              )}
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your finances..."
                className="flex-1 border-0 focus-visible:ring-0 text-base"
                autoFocus
                disabled={loading}
              />
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </form>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-destructive/10 border-b text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Suggestions */}
            <div className="p-2 max-h-[400px] overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Suggestions
              </div>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  disabled={loading}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left",
                    "hover:bg-muted transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <span className="text-lg">{suggestion.icon}</span>
                  <span className="flex-1 text-sm">{suggestion.text}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))}

              {/* AI Badge */}
              <div className="mt-4 px-3 py-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Powered by AI — describe any view you want</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">AI Generated View</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
                <Button size="sm" onClick={handleApply}>
                  Apply to Dashboard
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 overflow-y-auto max-h-[500px]">
              <JsonRenderer dashboard={generatedDashboard} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

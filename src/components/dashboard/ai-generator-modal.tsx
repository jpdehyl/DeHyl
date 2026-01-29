"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { JsonRenderer, type Dashboard } from "@/lib/json-render/renderer";

interface AIGeneratorModalProps {
  onApply: (dashboard: Dashboard) => void;
}

const EXAMPLE_PROMPTS = [
  "Show receivables aging breakdown with a bar chart",
  "Create an executive summary with just KPIs",
  "Show top 5 overdue invoices with client names",
  "Compare active vs closed projects count",
];

export function AIGeneratorModal({ onApply }: AIGeneratorModalProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDashboard, setGeneratedDashboard] = useState<Dashboard | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedDashboard(null);

    try {
      const response = await fetch("/api/dashboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
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
  }, [prompt]);

  const handleApply = useCallback(() => {
    if (generatedDashboard) {
      onApply(generatedDashboard);
      setOpen(false);
      setPrompt("");
      setGeneratedDashboard(null);
    }
  }, [generatedDashboard, onApply]);

  const handleCancel = useCallback(() => {
    setGeneratedDashboard(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setPrompt("");
    setError(null);
    setGeneratedDashboard(null);
  }, []);

  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Dashboard Generator
          </DialogTitle>
          <DialogDescription>
            Describe the dashboard you want in plain English. AI will generate the layout for you.
          </DialogDescription>
        </DialogHeader>

        {!generatedDashboard ? (
          <div className="space-y-4 py-4">
            {/* Prompt Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="e.g., Show me a summary of overdue invoices with an aging breakdown chart"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
                disabled={loading}
              />
            </div>

            {/* Example Prompts */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleExampleClick(example)}
                    disabled={loading}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <div className="border rounded-lg p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                <JsonRenderer dashboard={generatedDashboard} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Try Again
              </Button>
              <Button onClick={handleApply}>
                Apply to Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DashboardSchema } from "./catalog";
import type { Dashboard } from "./renderer";

interface UseStreamingJsonOptions {
  onError?: (error: Error) => void;
  onComplete?: (dashboard: Dashboard) => void;
}

interface UseStreamingJsonReturn {
  dashboard: Dashboard | null;
  isStreaming: boolean;
  error: Error | null;
  startStreaming: (stream: ReadableStream<Uint8Array>) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for progressively rendering JSON as it streams from an AI model.
 * Validates against the Dashboard schema and updates state as data arrives.
 */
export function useStreamingJson(options: UseStreamingJsonOptions = {}): UseStreamingJsonReturn {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const bufferRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setDashboard(null);
    setIsStreaming(false);
    setError(null);
    bufferRef.current = "";
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const tryParseJson = useCallback((text: string): Dashboard | null => {
    // Try to parse complete JSON
    try {
      const parsed = JSON.parse(text);
      const validated = DashboardSchema.safeParse(parsed);
      if (validated.success) {
        // Cast to Dashboard type - Zod validates the structure
        return validated.data as unknown as Dashboard;
      }
    } catch {
      // Not complete JSON yet, try partial
    }

    // Try to parse partial JSON by closing brackets
    const closers = ["]}", "]}]}", "]}]}"];
    for (const closer of closers) {
      try {
        const partial = text + closer;
        const parsed = JSON.parse(partial);
        const validated = DashboardSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data as unknown as Dashboard;
        }
      } catch {
        continue;
      }
    }

    return null;
  }, []);

  const startStreaming = useCallback(async (stream: ReadableStream<Uint8Array>) => {
    reset();
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (controller.signal.aborted) break;
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        bufferRef.current += chunk;

        // Try to parse on each chunk
        const parsed = tryParseJson(bufferRef.current);
        if (parsed) {
          setDashboard(parsed);
        }
      }

      // Final parse attempt
      const finalDashboard = tryParseJson(bufferRef.current);
      if (finalDashboard) {
        setDashboard(finalDashboard);
        options.onComplete?.(finalDashboard);
      } else {
        throw new Error("Failed to parse complete dashboard JSON");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
    } finally {
      setIsStreaming(false);
      reader.releaseLock();
    }
  }, [reset, tryParseJson, options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    dashboard,
    isStreaming,
    error,
    startStreaming,
    reset,
  };
}

/**
 * Hook for managing dashboard state with action handling
 */
export function useDashboardActions(initialData?: Record<string, unknown>) {
  const [data, setData] = useState<Record<string, unknown>>(initialData || {});

  const handleAction = useCallback((action: string, params?: Record<string, unknown>) => {
    console.log("Dashboard action:", action, params);

    // Common actions
    switch (action) {
      case "refresh":
        // Trigger data refresh
        window.location.reload();
        break;
      case "sync-quickbooks":
        // Trigger QB sync
        fetch("/api/sync/quickbooks", { method: "POST" });
        break;
      case "sync-projects":
        // Trigger Drive sync
        fetch("/api/sync/projects", { method: "POST" });
        break;
      default:
        // Custom action handler
        console.log("Unhandled action:", action);
    }
  }, []);

  const updateData = useCallback((key: string, value: unknown) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    data,
    setData,
    updateData,
    handleAction,
  };
}

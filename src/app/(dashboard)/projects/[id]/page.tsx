"use client";

import { use, useState, useEffect, useCallback } from "react";
import { notFound } from "next/navigation";
import { ProjectStoryView } from "@/components/projects/story";
import { QuickCostEntry } from "@/components/projects";
import { Loader2 } from "lucide-react";
import type { ProjectWithTotals, Invoice, Bill } from "@/types";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

interface ProjectData {
  project: ProjectWithTotals;
  invoices: Invoice[];
  bills: Bill[];
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 404) {
        setError("not_found");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch project");
      }
      const projectData: ProjectData = await res.json();
      setData(projectData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (error === "not_found") {
    notFound();
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Failed to load project"}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchProject();
            }}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { project, invoices, bills } = data;

  return (
    <>
      <ProjectStoryView
        project={project}
        invoices={invoices}
        bills={bills}
        onRefetch={fetchProject}
      />
      <QuickCostEntry projectId={id} />
    </>
  );
}

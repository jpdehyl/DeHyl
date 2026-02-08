"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChecklistForm } from "@/components/safety/checklist-form";
import { ArrowLeft, Loader2 } from "lucide-react";

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

function NewChecklistContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  const [template, setTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, projectsRes] = await Promise.all([
          fetch("/api/safety/templates"),
          fetch("/api/projects"),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data);
          
          // If templateId is provided, find and set that template
          if (templateId) {
            const found = data.find((t: Template) => t.id === templateId);
            if (found) {
              setTemplate(found);
            } else {
              setError("Template not found");
            }
          }
        }

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data.projects || data || []);
        }
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [templateId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/safety">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Safety
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // If no template selected, show template selection
  if (!template) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/safety">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Safety
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">New Safety Checklist</h1>
          <p className="text-muted-foreground">Select a checklist type to begin</p>
        </div>

        <div className="grid gap-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/safety/new?template=${t.id}`}>
              <div className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors cursor-pointer">
                <h3 className="font-medium">{t.name}</h3>
                {t.description && (
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-4">
        <Link href="/safety">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{template.name}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <ChecklistForm template={template} projects={projects} />
    </div>
  );
}

export default function NewChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewChecklistContent />
    </Suspense>
  );
}

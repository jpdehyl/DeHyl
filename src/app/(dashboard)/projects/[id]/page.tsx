"use client";

import { use, useState, useEffect, useCallback } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  ProjectHeader,
  ProjectFinancials,
  ProjectInvoices,
  ProjectBills,
  ProjectCosts,
  ProjectTimeline,
  ProjectPhotos,
  PortalSettings,
  QuickCostEntry,
} from "@/components/projects";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ProjectWithTotals, Invoice, Bill } from "@/types";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

interface ProjectData {
  project: ProjectWithTotals;
  invoices: Invoice[];
  bills: Bill[];
}

function ProjectSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="flex gap-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </CardContent>
      </Card>

      {/* Financials skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { sidebarOpen } = useAppStore();
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Support deep-linking to a specific tab via ?tab= query param
  const initialTab = searchParams.get("tab") || "timeline";
  const validTabs = ["timeline", "photos", "costs", "financials"];
  const defaultTab = validTabs.includes(initialTab) ? initialTab : "timeline";

  useEffect(() => {
    async function fetchProject() {
      setLoading(true);
      setError(null);

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
    }

    fetchProject();
  }, [id]);

  const refetchData = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const projectData: ProjectData = await res.json();
      setData(projectData);
    }
  }, [id]);

  const handleEstimateSave = useCallback(async (newValue: number) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estimate_amount: newValue }),
    });
    if (!res.ok) throw new Error("Failed to update estimate");
    await refetchData();
  }, [id, refetchData]);

  const handleInvoiceUpdate = useCallback(async (invoiceId: string, field: string, value: number) => {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) throw new Error("Failed to update invoice");
    await refetchData();
  }, [refetchData]);

  const handleBillUpdate = useCallback(async (billId: string, field: string, value: number) => {
    const res = await fetch(`/api/bills/${billId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) throw new Error("Failed to update bill");
    await refetchData();
  }, [refetchData]);

  if (error === "not_found") {
    notFound();
  }

  if (loading) {
    return (
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "md:ml-0" : "md:ml-0"
        )}
      >
        <Header title="Loading..." />
        <div className="p-4 md:p-6">
          <ProjectSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "md:ml-0" : "md:ml-0"
        )}
      >
        <Header title="Error" />
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">
                {error || "Failed to load project"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { project, invoices, bills } = data;

  return (
    <div
      className={cn(
        "transition-all duration-300",
        sidebarOpen ? "md:ml-0" : "md:ml-0"
      )}
    >
      <Header
        title={`Project ${project.code}`}
        description={`${project.clientName} - ${project.description}`}
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* Project Header */}
        <ProjectHeader project={project} />

        {/* Financial Summary */}
        <ProjectFinancials project={project} onEstimateSave={handleEstimateSave} />

        {/* Tabs for Timeline, Photos, Costs, and Financials */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 h-auto">
            <TabsTrigger value="timeline" className="py-2.5 text-xs sm:text-sm">Timeline</TabsTrigger>
            <TabsTrigger value="photos" className="py-2.5 text-xs sm:text-sm">Photos</TabsTrigger>
            <TabsTrigger value="costs" className="py-2.5 text-xs sm:text-sm">Costs</TabsTrigger>
            <TabsTrigger value="financials" className="py-2.5 text-xs sm:text-sm">Invoices</TabsTrigger>
          </TabsList>

          {/* Timeline Tab - The Story of the Project */}
          <TabsContent value="timeline" className="mt-6">
            <ProjectTimeline projectId={id} />
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="mt-6">
            <ProjectPhotos projectId={id} />
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="mt-6">
            <ProjectCosts projectId={id} />
          </TabsContent>

          {/* Invoices and Bills Tab */}
          <TabsContent value="financials" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ProjectInvoices invoices={invoices} onInvoiceUpdate={handleInvoiceUpdate} />
              <ProjectBills bills={bills} onBillUpdate={handleBillUpdate} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Client Portal Settings */}
        <PortalSettings projectId={id} projectCode={project.code} />
      </div>

      {/* Floating quick cost entry */}
      <QuickCostEntry projectId={id} />
    </div>
  );
}

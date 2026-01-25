"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  ProjectHeader,
  ProjectFinancials,
  ProjectInvoices,
  ProjectBills,
  ProjectTimeline,
} from "@/components/projects";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  getProjectById,
  getInvoicesByProjectId,
  getBillsByProjectId,
} from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const { sidebarOpen } = useAppStore();

  const project = getProjectById(id);

  if (!project) {
    notFound();
  }

  const invoices = getInvoicesByProjectId(id);
  const bills = getBillsByProjectId(id);

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
        <ProjectFinancials project={project} />

        {/* Tabs for Timeline and Financials */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="financials">Invoices & Bills</TabsTrigger>
          </TabsList>

          {/* Timeline Tab - The Story of the Project */}
          <TabsContent value="timeline" className="mt-6">
            <ProjectTimeline projectId={id} />
          </TabsContent>

          {/* Invoices and Bills Tab */}
          <TabsContent value="financials" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ProjectInvoices invoices={invoices} />
              <ProjectBills bills={bills} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

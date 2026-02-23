"use client";

import { FileText, MapPin, Calendar, DollarSign, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProjectWithTotals } from "@/types";

interface GenesisChapterProps {
  project: ProjectWithTotals;
}

export function GenesisChapter({ project }: GenesisChapterProps) {
  const estimateAmount = project.estimateAmount || 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border p-8">
        <div className="relative z-10">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
            Chapter 1
          </p>
          <h3 className="text-3xl font-bold mb-4">Genesis</h3>
          <p className="text-muted-foreground max-w-lg">
            How this project came to be. The scope, the client, and the commitment.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Estimated Value */}
        <div className="p-6 rounded-xl bg-card border col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Estimate</span>
          </div>
          <p className="text-4xl font-bold tracking-tight">
            {estimateAmount > 0 ? (
              formatCurrency(estimateAmount)
            ) : (
              <span className="text-muted-foreground text-xl">Not set</span>
            )}
          </p>
        </div>

        {/* Client */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Client</span>
          </div>
          <p className="text-xl font-semibold truncate">{project.clientName}</p>
          <p className="text-sm text-muted-foreground">{project.clientCode}</p>
        </div>

        {/* Project Type */}
        <div className="p-6 rounded-xl bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Type</span>
          </div>
          <p className="text-xl font-semibold capitalize">
            {project.projectType?.replace(/_/g, " ") || "Demolition"}
          </p>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="p-6 rounded-xl bg-card border">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Project Description
          </h4>
          <p className="text-lg">{project.description}</p>
          {project.location && (
            <div className="flex items-center gap-2 text-muted-foreground mt-4">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{project.location}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="p-6 rounded-xl bg-card border">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Timeline
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Created</span>
              </div>
              <span className="font-medium">
                {new Date(project.createdAt).toLocaleDateString("en-CA", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Last Activity</span>
              </div>
              <span className="font-medium">
                {new Date(project.updatedAt).toLocaleDateString("en-CA", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Square Footage if available */}
      {project.squareFootage && (
        <div className="p-6 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">
                Project Scope
              </p>
              <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">
                {project.squareFootage.toLocaleString()} sq ft
              </p>
            </div>
            {estimateAmount > 0 && project.squareFootage > 0 && (
              <div className="text-right">
                <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">
                  Rate
                </p>
                <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
                  {formatCurrency(estimateAmount / project.squareFootage)}/sq ft
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

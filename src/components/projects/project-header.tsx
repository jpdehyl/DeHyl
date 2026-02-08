"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { ProjectWithTotals } from "@/types";

interface ProjectHeaderProps {
  project: ProjectWithTotals;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to projects</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight font-mono">
                {project.code}
              </h2>
              <Badge variant={project.status === "active" ? "default" : "secondary"}>
                {project.status}
              </Badge>
              {(!project.estimateAmount || !project.hasPBS) && (
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {!project.estimateAmount && "Missing estimate"}
                    {!project.estimateAmount && !project.hasPBS && ", "}
                    {!project.hasPBS && "Missing PBS"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium">{project.clientName}</span>
              <span className="mx-2">•</span>
              {project.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-12 md:ml-0">
          <Button variant="outline" size="sm" className="gap-2 h-10 sm:h-9 px-4" asChild>
            <Link href={`/projects/${project.id}/estimate`}>
              <FileText className="h-4 w-4" />
              Estimate
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-10 sm:h-9 px-4" asChild>
            <a
              href={`https://drive.google.com/drive/folders/${project.driveId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Drive
            </a>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

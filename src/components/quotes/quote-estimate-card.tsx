"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Building2,
  CircleDollarSign,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuoteResponse, SimilarProject } from "@/types";

interface QuoteEstimateCardProps {
  quote: QuoteResponse;
  onUseEstimate?: (value: number) => void;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const variants = {
    high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const labels = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  };

  return (
    <Badge variant="outline" className={cn("text-xs", variants[confidence])}>
      {labels[confidence]}
    </Badge>
  );
}

function SimilarProjectRow({ project }: { project: SimilarProject }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {project.code}
          </span>
          <span className="text-sm truncate">{project.description}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{project.clientCode}</span>
          {project.squareFootage && (
            <>
              <span>•</span>
              <span>{project.squareFootage.toLocaleString()} sq ft</span>
            </>
          )}
          {project.pricePerSqFt && (
            <>
              <span>•</span>
              <span>${project.pricePerSqFt}/sq ft</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="font-medium text-sm">
          {formatCurrency(project.finalRevenue)}
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(project.similarity * 100)}% match
        </div>
      </div>
    </div>
  );
}

export function QuoteEstimateCard({
  quote,
  onUseEstimate,
  className,
}: QuoteEstimateCardProps) {
  const [showSimilar, setShowSimilar] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { estimatedRange, confidence, basedOn, similarProjects, breakdown, suggestedPricePerSqFt } = quote;

  // Handle case where no estimate could be generated
  if (basedOn === 0 && estimatedRange.average === 0) {
    return (
      <Card className={cn("border-amber-200 dark:border-amber-800", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">No Historical Data</CardTitle>
          </div>
          <CardDescription>
            We don&apos;t have enough completed projects to generate an estimate.
            Add project type, square footage, and final costs to completed projects to improve estimates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("border-blue-200 dark:border-blue-800", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Estimated Value</CardTitle>
          </div>
          <ConfidenceBadge confidence={confidence} />
        </div>
        <CardDescription>
          Based on {basedOn} similar completed project{basedOn !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Range */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Low</div>
            <div className="font-semibold text-lg">
              {formatCurrency(estimatedRange.low)}
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="text-xs text-muted-foreground mb-1">Suggested</div>
            <div className="font-bold text-2xl text-blue-600 dark:text-blue-400">
              {formatCurrency(estimatedRange.average)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">High</div>
            <div className="font-semibold text-lg">
              {formatCurrency(estimatedRange.high)}
            </div>
          </div>
        </div>

        {/* Price Per Sq Ft */}
        {suggestedPricePerSqFt && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Suggested: ${suggestedPricePerSqFt}/sq ft</span>
          </div>
        )}

        {/* Use Estimate Button */}
        {onUseEstimate && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onUseEstimate(estimatedRange.average)}
          >
            <CircleDollarSign className="h-4 w-4 mr-2" />
            Use {formatCurrency(estimatedRange.average)} as estimate
          </Button>
        )}

        {/* Cost Breakdown */}
        {breakdown && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <span>Cost Breakdown</span>
              {showBreakdown ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {showBreakdown && (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Labor (40%)</span>
                  <span>{formatCurrency(breakdown.labor)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Materials (10%)</span>
                  <span>{formatCurrency(breakdown.materials)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Disposal (25%)</span>
                  <span>{formatCurrency(breakdown.disposal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Equipment (15%)</span>
                  <span>{formatCurrency(breakdown.equipment)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Overhead (10%)</span>
                  <span>{formatCurrency(breakdown.overhead)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Similar Projects */}
        {similarProjects.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground"
              onClick={() => setShowSimilar(!showSimilar)}
            >
              <span>Similar Projects ({similarProjects.length})</span>
              {showSimilar ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {showSimilar && (
              <div className="mt-2 max-h-64 overflow-y-auto">
                {similarProjects.map((project) => (
                  <SimilarProjectRow key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

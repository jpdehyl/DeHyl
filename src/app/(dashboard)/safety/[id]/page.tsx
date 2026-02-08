"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Building,
  User,
  MapPin,
  Cloud,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

interface TemplateItem {
  id: string;
  question: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface Checklist {
  id: string;
  date: string;
  shift: string | null;
  weather: string | null;
  temperature: string | null;
  location: string | null;
  status: string;
  responses: Record<string, string | boolean | string[]>;
  attendees: string[] | null;
  hazards_identified: string | null;
  controls_implemented: string | null;
  additional_notes: string | null;
  signature_data: string | null;
  completed_by_name: string | null;
  created_at: string;
  template: {
    id: string;
    name: string;
    type: string;
    description: string;
    items: TemplateItem[];
  } | null;
  project: {
    id: string;
    code: string;
    description: string;
    client_name: string | null;
  } | null;
}

const weatherEmojis: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  snowy: "❄️",
  windy: "💨",
};

export default function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await fetch(`/api/safety/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Checklist not found");
          } else {
            throw new Error("Failed to fetch");
          }
          return;
        }
        const data = await res.json();
        setChecklist(data);
      } catch (err) {
        setError("Failed to load checklist");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChecklist();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="space-y-4">
        <Link href="/safety">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Safety
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-destructive">{error || "Checklist not found"}</p>
        </div>
      </div>
    );
  }

  const renderResponse = (item: TemplateItem) => {
    const response = checklist.responses[item.id];

    if (item.type === "checkbox") {
      return response === true ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    }

    if (item.type === "multiselect" && Array.isArray(response)) {
      return (
        <div className="flex flex-wrap gap-1">
          {response.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">
              {v}
            </Badge>
          ))}
        </div>
      );
    }

    return <span className="text-sm">{response as string || "—"}</span>;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/safety">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Title Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {checklist.template?.name || "Safety Checklist"}
              </CardTitle>
              {checklist.template?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {checklist.template.description}
                </p>
              )}
            </div>
            <Badge variant={checklist.status === "completed" ? "default" : "secondary"}>
              {checklist.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(checklist.date), "MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {format(new Date(checklist.created_at), "h:mm a")}
            </div>
            {checklist.project && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <Building className="h-4 w-4" />
                {checklist.project.code} - {checklist.project.description}
              </div>
            )}
            {checklist.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {checklist.location}
              </div>
            )}
            {checklist.weather && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cloud className="h-4 w-4" />
                {weatherEmojis[checklist.weather] || ""} {checklist.weather}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Responses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Checklist Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {checklist.template?.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between py-3 border-b last:border-b-0"
            >
              <span className="text-sm flex-1 pr-4">{item.question}</span>
              <div className="flex-shrink-0">{renderResponse(item)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Attendees (for Tailgate) */}
      {checklist.attendees && checklist.attendees.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees ({checklist.attendees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {checklist.attendees.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hazards & Controls (for FLHA) */}
      {(checklist.hazards_identified || checklist.controls_implemented) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Hazard Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.hazards_identified && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Hazards Identified
                </p>
                <p className="text-sm whitespace-pre-wrap">{checklist.hazards_identified}</p>
              </div>
            )}
            {checklist.controls_implemented && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Controls Implemented
                </p>
                <p className="text-sm whitespace-pre-wrap">{checklist.controls_implemented}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      {checklist.additional_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{checklist.additional_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {checklist.signature_data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Signature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-white p-2 inline-block">
              <img
                src={checklist.signature_data}
                alt="Signature"
                className="max-h-24"
              />
            </div>
            {checklist.completed_by_name && (
              <p className="text-sm text-muted-foreground mt-2">
                Signed by: {checklist.completed_by_name}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

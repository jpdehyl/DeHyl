"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Plus,
  Calendar,
  FileText,
  User,
  Building,
  Loader2,
  CheckCircle2,
  ClipboardList,
  HardHat,
  Users,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";

interface Template {
  id: string;
  name: string;
  type: string;
}

interface Checklist {
  id: string;
  date: string;
  status: string;
  completed_by_name: string | null;
  weather: string | null;
  location: string | null;
  created_at: string;
  template: {
    id: string;
    name: string;
    type: string;
  } | null;
  project: {
    id: string;
    code: string;
    description: string;
  } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  flha: <ClipboardList className="h-4 w-4" />,
  tailgate: <Users className="h-4 w-4" />,
  ppe: <HardHat className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  flha: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  tailgate: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ppe: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  equipment: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function SafetyPage() {
  return (
    <Suspense>
      <SafetyPageContent />
    </Suspense>
  );
}

function SafetyPageContent() {
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("success") === "true";
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, checklistsRes] = await Promise.all([
          fetch("/api/safety/templates"),
          fetch("/api/safety"),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data);
        }

        if (checklistsRes.ok) {
          const data = await checklistsRes.json();
          setChecklists(data.checklists || []);
        }
      } catch (error) {
        console.error("Error fetching safety data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredChecklists = filterType === "all"
    ? checklists
    : checklists.filter(c => c.template?.type === filterType);

  const todayChecklists = checklists.filter(
    c => c.date === new Date().toISOString().split("T")[0]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            Safety Checklists
          </h1>
          <p className="text-muted-foreground">
            Field safety documentation and compliance
          </p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="py-3 flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            <span>Checklist submitted successfully!</span>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - New Checklist Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {templates.map((template) => (
          <Link key={template.id} href={`/safety/new?template=${template.id}`}>
            <Card className="hover:border-primary cursor-pointer transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-full ${typeColors[template.type] || "bg-gray-100"}`}>
                  {typeIcons[template.type] || <FileText className="h-5 w-5" />}
                </div>
                <span className="text-sm font-medium leading-tight">
                  {template.name.split("(")[0].trim()}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today&apos;s Checklists ({todayChecklists.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayChecklists.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No checklists completed today. Start one above!
            </p>
          ) : (
            <div className="space-y-2">
              {todayChecklists.map((checklist) => (
                <Link key={checklist.id} href={`/safety/${checklist.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${typeColors[checklist.template?.type || ""] || "bg-gray-100"}`}>
                        {typeIcons[checklist.template?.type || ""] || <FileText className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{checklist.template?.name}</p>
                        {checklist.project && (
                          <p className="text-xs text-muted-foreground">
                            {checklist.project.code} - {checklist.project.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Checklist History</CardTitle>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="flha">FLHA</SelectItem>
                <SelectItem value="tailgate">Tailgate</SelectItem>
                <SelectItem value="ppe">PPE</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredChecklists.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No checklists found
            </p>
          ) : (
            <div className="space-y-2">
              {filteredChecklists.map((checklist) => (
                <Link key={checklist.id} href={`/safety/${checklist.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${typeColors[checklist.template?.type || ""] || "bg-gray-100"}`}>
                        {typeIcons[checklist.template?.type || ""] || <FileText className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{checklist.template?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(checklist.date), "MMM d, yyyy")}
                          {checklist.project && (
                            <>
                              <span>•</span>
                              <Building className="h-3 w-3" />
                              {checklist.project.code}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {checklist.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

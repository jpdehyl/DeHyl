"use client";

import { use, useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, Save, FileDown, Send, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineItemEditor, EstimateSummary } from "@/components/estimates";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { EstimateLineItem, EstimateStatus } from "@/types";

interface EstimatePageProps {
  params: Promise<{ id: string }>;
}

interface ProjectData {
  id: string;
  code: string;
  clientName: string;
  description: string;
  totals: {
    invoiced: number;
  };
}

interface EstimateData {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: EstimateStatus;
  lineItems: EstimateLineItem[];
}

export default function EstimatePage({ params }: EstimatePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { sidebarOpen } = useAppStore();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [estimateName, setEstimateName] = useState("");
  const [estimateDescription, setEstimateDescription] = useState("");
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>("draft");
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Load project and estimate data from API
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch project details
        const projectRes = await fetch(`/api/projects/${id}`);
        if (!projectRes.ok) {
          setProject(null);
          setIsLoading(false);
          return;
        }
        const projectData = await projectRes.json();
        setProject(projectData.project);

        // Fetch existing estimate for this project
        const estimateRes = await fetch(`/api/estimates?projectId=${id}`);
        if (estimateRes.ok) {
          const estimateData = await estimateRes.json();
          if (estimateData.estimates && estimateData.estimates.length > 0) {
            const est = estimateData.estimates[0];
            setEstimateId(est.id);
            setEstimateName(est.name || "");
            setEstimateDescription(est.description || "");
            setEstimateStatus(est.status || "draft");
            setLineItems(est.lineItems || []);
          } else {
            // No existing estimate - set defaults from project
            setEstimateName(`${projectData.project.code} - ${projectData.project.description}`);
          }
        }
      } catch (error) {
        console.error("Error loading estimate data:", error);
        toast.error("Failed to load estimate data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className={cn("transition-all duration-300", sidebarOpen ? "md:ml-0" : "md:ml-0")}>
        <Header title="Estimate" description="Loading..." />
        <div className="p-4 md:p-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!project) {
    notFound();
  }

  const actualInvoiced = project.totals.invoiced;

  const handleLineItemsChange = (newLineItems: EstimateLineItem[]) => {
    setLineItems(newLineItems);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (estimateId) {
        // Update existing estimate
        const res = await fetch(`/api/estimates/${estimateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: estimateName,
            description: estimateDescription,
            status: estimateStatus,
            lineItems: lineItems.map((item, index) => ({
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              sortOrder: item.sortOrder ?? index,
              notes: item.notes || null,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to update estimate");
          return;
        }
        toast.success("Estimate saved");
      } else {
        // Create new estimate
        const res = await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: id,
            name: estimateName,
            description: estimateDescription,
            status: estimateStatus,
            lineItems: lineItems.map((item, index) => ({
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              sortOrder: item.sortOrder ?? index,
              notes: item.notes || null,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to create estimate");
          return;
        }
        const data = await res.json();
        setEstimateId(data.estimate?.id || null);
        toast.success("Estimate created");
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving estimate:", error);
      toast.error("Failed to save estimate");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    toast.info("PDF export is not yet available");
  };

  const handleSendToClient = async () => {
    setEstimateStatus("sent");
    setHasChanges(true);
    if (estimateId) {
      try {
        const res = await fetch(`/api/estimates/${estimateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
        if (res.ok) {
          toast.success("Estimate marked as sent");
          setHasChanges(false);
        } else {
          toast.error("Failed to update estimate status");
        }
      } catch {
        toast.error("Failed to update estimate status");
      }
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-300",
        sidebarOpen ? "md:ml-0" : "md:ml-0"
      )}
    >
      <Header
        title={`Estimate - ${project.code}`}
        description={`${project.clientName} - ${project.description}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            {estimateStatus === "draft" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendToClient}
              >
                <Send className="mr-2 h-4 w-4" />
                Send to Client
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="edit">Edit Estimate</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          {/* Edit Tab */}
          <TabsContent value="edit" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Editor - takes 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                {/* Estimate Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Estimate Details</CardTitle>
                    <CardDescription>Basic information about this estimate</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Estimate Name</label>
                        <Input
                          value={estimateName}
                          onChange={(e) => {
                            setEstimateName(e.target.value);
                            setHasChanges(true);
                          }}
                          placeholder="Enter estimate name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select
                          value={estimateStatus}
                          onValueChange={(value) => {
                            setEstimateStatus(value as EstimateStatus);
                            setHasChanges(true);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={estimateDescription}
                        onChange={(e) => {
                          setEstimateDescription(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Brief description of the work"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Line Items</CardTitle>
                    <CardDescription>Add labor, materials, equipment, and other costs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LineItemEditor
                      lineItems={lineItems}
                      onChange={handleLineItemsChange}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Summary Sidebar */}
              <div className="space-y-6">
                <EstimateSummary
                  lineItems={lineItems}
                  status={estimateStatus}
                  actualInvoiced={actualInvoiced > 0 ? actualInvoiced : undefined}
                />
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estimate Preview</CardTitle>
                <CardDescription>How the estimate will appear to the client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">DeHyl Constructors Corp</h2>
                    <p className="text-muted-foreground">Demolition & Restoration Services</p>
                  </div>

                  {/* Estimate Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold">Estimate For:</h3>
                      <p>{project.clientName}</p>
                      <p className="text-muted-foreground">{project.description}</p>
                    </div>
                    <div className="text-right">
                      <p><span className="font-semibold">Project:</span> {project.code}</p>
                      <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Line Items (Read Only) */}
                  <LineItemEditor
                    lineItems={lineItems}
                    onChange={() => {}}
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Existing Estimate</CardTitle>
                <CardDescription>Upload an existing estimate document from your files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Drop your estimate file here</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports PDF, Excel, or CSV files
                  </p>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>
                <div className="mt-6 space-y-2">
                  <h4 className="font-medium">Or import from Google Drive</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect to your Google Drive to import estimate documents directly.
                  </p>
                  <Button variant="outline" className="mt-2">
                    Import from Google Drive
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

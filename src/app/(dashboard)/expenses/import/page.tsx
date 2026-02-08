"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

interface SheetRow {
  vendor: string;
  serviceDate: string;
  project: string;
  qbLinked: boolean;
  invoiceNumber: string;
  amountWithGst: number;
  dateIssued: string;
  dueDate: string;
  status: string;
  matchedProjectId: string | null;
  matchedProjectCode: string | null;
  matchedProjectName: string | null;
}

interface Project {
  id: string;
  code: string;
  clientName: string;
  description: string;
}

interface PreviewData {
  headers: string[];
  rows: SheetRow[];
  sheetName: string;
  totalRows: number;
  projects: Project[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors?: string[];
}

export default function ImportPage() {
  const { sidebarOpen } = useAppStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [projectOverrides, setProjectOverrides] = useState<
    Record<number, string>
  >({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch("/api/import/sheets");
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load spreadsheet");
          return;
        }
        const data: PreviewData = await res.json();
        setPreview(data);
        // Select all rows with matched projects by default
        const initialSelected = new Set<number>();
        data.rows.forEach((row, i) => {
          if (row.matchedProjectId) {
            initialSelected.add(i);
          }
        });
        setSelectedRows(initialSelected);
      } catch {
        setError("Failed to connect to Google Sheets");
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, []);

  const toggleRow = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selectedRows.size === preview.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(preview.rows.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setResult(null);

    const rowsToImport = preview.rows
      .filter((_, i) => selectedRows.has(i))
      .map((row, i) => {
        const originalIndex = preview.rows.indexOf(row);
        return {
          ...row,
          overrideProjectId: projectOverrides[originalIndex] || undefined,
        };
      });

    try {
      const res = await fetch("/api/import/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsToImport }),
      });
      const data: ImportResult = await res.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Network error during import"],
      });
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);

  const selectedTotal = preview
    ? preview.rows
        .filter((_, i) => selectedRows.has(i))
        .reduce((sum, row) => sum + row.amountWithGst, 0)
    : 0;

  return (
    <div
      className={cn(
        "transition-all duration-300",
        sidebarOpen ? "md:ml-0" : "md:ml-0"
      )}
    >
      <Header title="Import from Google Sheets" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/expenses")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Costs
        </Button>

        {/* Loading state */}
        {loading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Import result */}
        {result && (
          <Alert
            variant={result.imported > 0 ? "default" : "destructive"}
          >
            {result.imported > 0 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-1">
                <p>
                  Imported {result.imported} rows.{" "}
                  {result.skipped > 0 && `Skipped ${result.skipped} rows.`}
                </p>
                {result.errors?.map((err, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {err}
                  </p>
                ))}
                {result.imported > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => router.push("/expenses")}
                  >
                    View imported costs
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview data */}
        {preview && !result && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <div>
                    <CardTitle>Control Payables</CardTitle>
                    <CardDescription>
                      Sheet: {preview.sheetName} &middot; {preview.totalRows}{" "}
                      rows found &middot; {selectedRows.size} selected &middot;{" "}
                      {formatCurrency(selectedTotal)} total
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Review the data below. Rows with matched projects are
                  pre-selected. You can change project assignments or
                  deselect rows before importing.
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              selectedRows.size === preview.rows.length &&
                              preview.rows.length > 0
                            }
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="min-w-[200px]">
                          Project Match
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, index) => (
                        <TableRow
                          key={index}
                          className={cn(
                            !selectedRows.has(index) && "opacity-50"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(index)}
                              onCheckedChange={() => toggleRow(index)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.vendor}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.serviceDate || row.dateIssued || "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(row.amountWithGst)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.invoiceNumber || "—"}
                          </TableCell>
                          <TableCell>
                            {row.qbLinked ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                QB
                              </Badge>
                            ) : row.status ? (
                              <Badge variant="secondary">
                                {row.status}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {row.matchedProjectName &&
                            !projectOverrides[index] ? (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-green-600 border-green-600"
                                >
                                  {row.matchedProjectCode}
                                </Badge>
                                <Select
                                  value={row.matchedProjectId || ""}
                                  onValueChange={(val) =>
                                    setProjectOverrides((prev) => ({
                                      ...prev,
                                      [index]: val,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-7 w-[160px] text-xs">
                                    <SelectValue placeholder="Change..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {preview.projects.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.code} - {p.clientName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <Select
                                value={projectOverrides[index] || ""}
                                onValueChange={(val) => {
                                  setProjectOverrides((prev) => ({
                                    ...prev,
                                    [index]: val,
                                  }));
                                  setSelectedRows((prev) => {
                                    const next = new Set(prev);
                                    next.add(index);
                                    return next;
                                  });
                                }}
                              >
                                <SelectTrigger className="h-7 w-[200px] text-xs">
                                  <SelectValue placeholder="Select project..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {preview.projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.code} - {p.clientName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Import button */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.push("/expenses")}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedRows.size === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {importing
                  ? "Importing..."
                  : `Import ${selectedRows.size} rows (${formatCurrency(selectedTotal)})`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

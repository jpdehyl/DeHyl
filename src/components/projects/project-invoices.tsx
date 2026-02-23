"use client";

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
import { Badge } from "@/components/ui/badge";
import { EditableAmount } from "@/components/ui/editable-amount";
import { cn, formatCurrency, formatDate, getDaysOverdue } from "@/lib/utils";
import type { Invoice } from "@/types";

interface ProjectInvoicesProps {
  invoices: Invoice[];
  onInvoiceUpdate?: (invoiceId: string, field: string, value: number) => Promise<void>;
}

export function ProjectInvoices({ invoices, onInvoiceUpdate }: ProjectInvoicesProps) {
  const total = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const outstanding = invoices.reduce((acc, inv) => acc + inv.balance, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>
          {invoices.length} invoices totaling {formatCurrency(total)}
          {outstanding > 0 && ` • ${formatCurrency(outstanding)} outstanding`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No invoices for this project
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const daysOverdue = getDaysOverdue(invoice.dueDate);
                const statusVariant =
                  invoice.status === "paid"
                    ? "success"
                    : invoice.status === "overdue"
                    ? "destructive"
                    : "secondary";

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDate(invoice.issueDate)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span
                        className={cn(
                          invoice.status === "overdue" && "text-destructive"
                        )}
                      >
                        {formatDate(invoice.dueDate)}
                        {daysOverdue > 0 && ` (${daysOverdue}d)`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {onInvoiceUpdate ? (
                        <EditableAmount
                          value={invoice.amount}
                          onSave={(v) => onInvoiceUpdate(invoice.id, "amount", v)}
                          className="text-sm font-medium justify-end"
                          isOverridden={invoice.manualOverride}
                        />
                      ) : (
                        formatCurrency(invoice.amount)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {onInvoiceUpdate ? (
                        <EditableAmount
                          value={invoice.balance}
                          onSave={(v) => onInvoiceUpdate(invoice.id, "balance", v)}
                          className={cn("text-sm font-medium justify-end", invoice.balance > 0 ? "text-warning" : "text-success")}
                          isOverridden={invoice.manualOverride}
                        />
                      ) : invoice.balance > 0 ? (
                        <span className="text-warning">
                          {formatCurrency(invoice.balance)}
                        </span>
                      ) : (
                        <span className="text-success">Paid</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant}>{invoice.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

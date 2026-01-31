import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function getDaysOverdue(dueDate: Date | string | null | undefined): number {
  if (!dueDate) return 0;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return 0; // Invalid date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getDaysUntilDue(dueDate: Date | string | null | undefined): number {
  if (!dueDate) return 0;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return 0; // Invalid date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getInvoiceStatus(balance: number, dueDate: Date | string | null | undefined): "paid" | "overdue" | "sent" {
  if (balance === 0) return "paid";
  if (!dueDate) return "sent"; // No due date = treat as sent
  const daysOverdue = getDaysOverdue(dueDate);
  if (daysOverdue > 0) return "overdue";
  return "sent";
}

export function getBillStatus(balance: number, dueDate: Date | string | null | undefined): "paid" | "overdue" | "open" {
  if (balance === 0) return "paid";
  if (!dueDate) return "open"; // No due date = treat as open
  const daysOverdue = getDaysOverdue(dueDate);
  if (daysOverdue > 0) return "overdue";
  return "open";
}

// Parse project folder name: "2601007 - CD - PetroCan Kamloops"
const FOLDER_PATTERN = /^(\d{7})\s*-\s*(\w+)\s*-\s*(.+)$/;

export function parseProjectFolder(folderName: string) {
  const match = folderName.match(FOLDER_PATTERN);
  if (!match) return null;
  return {
    code: match[1],
    clientCode: match[2],
    description: match[3].trim(),
  };
}

// Parse bid folder name: "250603 - CD - Vancouver Tower Demo"
// Format: YYMMXX - Client - Project Name
// YY = year, MM = month, XX = sequential number
const BID_FOLDER_PATTERN = /^(\d{6})\s*-\s*(\w+)\s*-\s*(.+)$/;

export function parseBidFolder(folderName: string) {
  const match = folderName.match(BID_FOLDER_PATTERN);
  if (!match) return null;
  return {
    code: match[1],
    clientCode: match[2],
    name: match[3].trim(),
  };
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

"use client";

import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateFilterProps {
  dates: string[];
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
}

export function DateFilter({ dates, selectedDate, onDateChange }: DateFilterProps) {
  const formatDate = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Select
      value={selectedDate || "all"}
      onValueChange={(value) => onDateChange(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[180px]">
        <Calendar className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Filter by date" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Photos</SelectItem>
        {dates.map((date) => (
          <SelectItem key={date} value={date}>
            {formatDate(date)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

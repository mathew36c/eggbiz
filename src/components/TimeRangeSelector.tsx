"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type TimeRange = "today" | "yesterday" | "this_month" | "last_7_days" | "last_28_days" | "last_90_days";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_month: "This Month",
  last_7_days: "Last 7 Days",
  last_28_days: "Last 28 Days",
  last_90_days: "Last 90 Days",
};

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg text-sm font-medium touch-manipulation hover:bg-secondary/50 transition-colors"
      >
        {TIME_RANGE_LABELS[value]}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-lg shadow-lg z-50 overflow-hidden">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => {
                onChange(range);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm touch-manipulation hover:bg-secondary/50 transition-colors ${
                value === range ? "bg-secondary font-medium" : ""
              }`}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function getDateRangeForFilter(
  timeRange: TimeRange
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (timeRange) {
    case "today":
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "last_7_days":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_28_days":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 27);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_90_days":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 89);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

export function filterByDateRange<T extends { sale_date?: string; expense_date?: string }>(
  items: T[],
  timeRange: TimeRange
): T[] {
  const { startDate, endDate } = getDateRangeForFilter(timeRange);

  return items.filter((item) => {
    const dateStr = item.sale_date || item.expense_date;
    if (!dateStr) return false;
    
    const itemDate = new Date(dateStr);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export function filterPurchasesByDateRange<T extends { purchase_date?: string }>(
  items: T[],
  timeRange: TimeRange
): T[] {
  const { startDate, endDate } = getDateRangeForFilter(timeRange);

  return items.filter((item) => {
    const dateStr = item.purchase_date;
    if (!dateStr) return false;
    
    const itemDate = new Date(dateStr);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export function getTimeRangeLabel(timeRange: TimeRange): string {
  return TIME_RANGE_LABELS[timeRange];
}

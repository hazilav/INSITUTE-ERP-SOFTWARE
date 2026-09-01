"use client";

import { Calendar } from "lucide-react";

interface DateFilterBarProps {
  range: string;
  onRangeChange: (newRange: string) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (val: string) => void;
  onEndDateChange?: (val: string) => void;
}

export default function DateFilterBar({
  range,
  onRangeChange,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
}: DateFilterBarProps) {
  const options = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "This Year", value: "year" },
    { label: "Custom Range", value: "custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-700">
        <Calendar className="w-4 h-4 text-brand-600" />
        <span>Date Filter:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRangeChange(opt.value)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              range === opt.value
                ? "bg-brand-600 text-white shadow-sm font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {range === "custom" && onStartDateChange && onEndDateChange && (
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          />
          <span className="text-slate-400 font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

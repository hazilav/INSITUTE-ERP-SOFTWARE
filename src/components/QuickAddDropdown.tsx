"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  UserPlus,
  BookOpen,
  Layers,
  GraduationCap,
  ClipboardList,
  BadgeDollarSign,
  CheckSquare,
  ChevronDown,
} from "lucide-react";
import AddStudentModal from "./AddStudentModal";

export default function QuickAddDropdown() {
  const [open, setOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { label: "+ Add Student", action: () => setAddStudentOpen(true), icon: UserPlus, color: "text-brand-600" },
    { label: "+ Add Enquiry", href: "/dashboard/students?tab=admissions", icon: UserPlus, color: "text-indigo-600" },
    { label: "+ Add Course", href: "/dashboard/courses", icon: BookOpen, color: "text-blue-600" },
    { label: "+ Add Batch", href: "/dashboard/batches", icon: Layers, color: "text-purple-600" },
    { label: "+ Add Class", href: "/dashboard/classes", icon: GraduationCap, color: "text-emerald-600" },
    { label: "+ Add Activity", href: "/dashboard/activities", icon: ClipboardList, color: "text-amber-600" },
    { label: "+ Add Fee", href: "/dashboard/fees", icon: BadgeDollarSign, color: "text-rose-600" },
    { label: "+ Add Task", href: "/dashboard/reports/staff-tasks", icon: CheckSquare, color: "text-slate-600" },
  ];

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center gap-1 sm:gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Add</span>
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-80" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {options.map((opt) => {
              const Icon = opt.icon;
              if (opt.action) {
                return (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setOpen(false);
                      opt.action();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors text-left"
                  >
                    <Icon className={`w-4 h-4 ${opt.color}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              }
              return (
                <a
                  key={opt.label}
                  href={opt.href}
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors text-left"
                >
                  <Icon className={`w-4 h-4 ${opt.color}`} />
                  <span>{opt.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      <AddStudentModal
        isOpen={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        onSuccess={() => {
          setAddStudentOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}

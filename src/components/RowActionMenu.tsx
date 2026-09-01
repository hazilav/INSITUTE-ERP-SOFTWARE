"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

export interface ActionItem {
  label: string;
  onClick: () => void;
  icon?: any;
  danger?: boolean;
}

interface RowActionMenuProps {
  actions: ActionItem[];
}

export default function RowActionMenu({ actions }: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="More Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl z-30 py-1.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
          {actions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  act.onClick();
                }}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                  act.danger
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

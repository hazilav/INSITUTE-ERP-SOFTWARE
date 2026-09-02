"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "xl",
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Body scroll lock effect & reset content scroll to top
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Reset scroll position immediately and on next frame to ensure first fields are visible
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      const raf = requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        cancelAnimationFrame(raf);
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center sm:p-6 sm:pt-8 sm:pb-12">
      {/* Backdrop click dismiss */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-0 bg-transparent"
        aria-hidden="true"
      />

      {/* Modal Container Card */}
      <div
        className={`fixed inset-[12px] max-h-[calc(100vh-24px)] max-h-[calc(100dvh-24px)] sm:static sm:inset-auto sm:max-h-[calc(100vh-64px)] sm:max-h-[calc(100dvh-64px)] z-10 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 sm:w-full ${maxWidthClasses[maxWidth]} flex flex-col overflow-hidden animate-in fade-in duration-200`}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            {icon && (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div
          ref={contentRef}
          className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 min-h-0 text-slate-800 text-xs sm:text-sm"
        >
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 shrink-0 bg-slate-50/80">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

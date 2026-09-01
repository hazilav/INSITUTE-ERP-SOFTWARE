"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Application Error</h1>
            <p className="text-xs text-slate-500 mt-1">
              A critical error occurred. Please click below to reload the page safely.
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

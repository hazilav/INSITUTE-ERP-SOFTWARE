"use client";

import { useState } from "react";
import { School, Globe, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

interface InstituteSetupModalProps {
  currentMode?: string | null;
  onSuccess?: () => void;
  isInline?: boolean;
}

export default function InstituteSetupModal({
  currentMode = "hybrid",
  onSuccess,
  isInline = false,
}: InstituteSetupModalProps) {
  const [selectedMode, setSelectedMode] = useState<"offline" | "online" | "hybrid">(
    (currentMode as any) || "hybrid"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/institute/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institute_mode: selectedMode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save institute mode");
      }

      setSaved(true);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const options = [
    {
      id: "offline",
      title: "Offline",
      icon: School,
      emoji: "🏫",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      activeBg: "bg-blue-50/70 border-blue-500 shadow-blue-500/10",
      description: "Physical classroom-based institute.",
      details: "Configures physical classrooms, campus attendance, and in-person lecture management.",
    },
    {
      id: "online",
      title: "Online",
      icon: Globe,
      emoji: "🌐",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      activeBg: "bg-purple-50/70 border-purple-500 shadow-purple-500/10",
      description: "Online learning institute.",
      descriptionDetail: "Virtual video streams, digital submissions, and online portal focus.",
      details: "Configures virtual streams, digital assignments, and distance learning portals.",
    },
    {
      id: "hybrid",
      title: "Hybrid",
      icon: RefreshCw,
      emoji: "🔄",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      activeBg: "bg-emerald-50/70 border-emerald-500 shadow-emerald-500/10",
      description: "Both physical and online learning.",
      details: "Enables full dual-mode operation for both physical classrooms and online live streaming.",
    },
  ];

  const content = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          How does your institute operate?
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Select your primary operational mode. This will automatically configure future module capabilities.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Institute operation mode successfully updated to <strong className="capitalize">{selectedMode}</strong>.</span>
        </div>
      )}

      {/* 3 Large Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((option) => {
          const isSelected = selectedMode === option.id;
          const Icon = option.icon;

          return (
            <div
              key={option.id}
              onClick={() => setSelectedMode(option.id as any)}
              className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? `${option.activeBg} shadow-lg ring-2 ring-offset-2 ring-brand-500/30`
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{option.emoji}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  {option.title}
                </h3>

                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {option.description}
                </p>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {option.details}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60">
                <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${option.badgeColor}`}>
                  {option.title} Mode
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Save Operating Mode Choice
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (isInline) {
    return <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">{content}</div>;
  }

  return content;
}

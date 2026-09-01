"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Users, BookOpen, Layers, Calendar, Award, CheckSquare, ArrowRight } from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({
    students: [],
    staff: [],
    courses: [],
    batches: [],
    classes: [],
    tasks: [],
    certificates: [],
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ students: [], staff: [], courses: [], batches: [], classes: [], tasks: [], certificates: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalResults =
    results.students.length +
    results.staff.length +
    results.courses.length +
    results.batches.length +
    results.classes.length +
    results.tasks.length +
    results.certificates.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start justify-center p-3 pt-12 sm:pt-24">
      <div className="bg-white rounded-3xl w-[calc(100vw-24px)] max-w-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100vh-48px)]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search students, staff, courses, batches, classes, tasks, certificates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Searching records...</div>
          ) : query.length >= 2 && totalResults === 0 ? (
            <div className="py-8 text-center text-slate-400">No matching records found for "{query}".</div>
          ) : (
            <>
              {results.students.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <Users className="w-3.5 h-3.5 text-brand-600" /> Students
                  </div>
                  {results.students.map((r: any) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between font-bold text-slate-900 transition-all"
                    >
                      <span>{r.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}

              {results.staff.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <Users className="w-3.5 h-3.5 text-purple-600" /> Staff & Mentors
                  </div>
                  {results.staff.map((r: any) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between font-bold text-slate-900 transition-all"
                    >
                      <span>{r.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}

              {results.courses.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Courses
                  </div>
                  {results.courses.map((r: any) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between font-bold text-slate-900 transition-all"
                    >
                      <span>{r.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}

              {results.batches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" /> Batches
                  </div>
                  {results.batches.map((r: any) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between font-bold text-slate-900 transition-all"
                    >
                      <span>{r.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}

              {results.classes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Classes
                  </div>
                  {results.classes.map((r: any) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between font-bold text-slate-900 transition-all"
                    >
                      <span>{r.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}

              {results.certificates.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5 px-2">
                    <Award className="w-3.5 h-3.5 text-amber-600" /> Certificates
                  </div>
                  {results.certificates.map((r: any) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center justify-between font-bold text-slate-900 transition-all"
                    >
                      <span>{r.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Tip */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Press <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">ESC</code> to close</span>
          <span>Tip: Press <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">Ctrl + K</code> anytime</span>
        </div>
      </div>
    </div>
  );
}

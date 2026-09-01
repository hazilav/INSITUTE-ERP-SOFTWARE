"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Edit, Trash2, Eye, Copy, CheckCircle2 } from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  subject?: string | null;
  body_template: string;
  placeholders?: string | null;
  updated_at: string;
}

export default function TemplatesClient() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Finance");
  const [subject, setSubject] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [placeholders, setPlaceholders] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName("");
    setCategory("Finance");
    setSubject("");
    setBodyTemplate("");
    setPlaceholders("student_name, balance, due_date");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (t: TemplateItem) => {
    setEditingTemplate(t);
    setName(t.name);
    setCategory(t.category);
    setSubject(t.subject || "");
    setBodyTemplate(t.body_template);
    setPlaceholders(t.placeholders || "");
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : "/api/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          subject,
          body_template: bodyTemplate,
          placeholders,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");

      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error("Failed to delete template", err);
    }
  };

  // Helper to render template preview output with sample values
  const renderPreviewOutput = (template: TemplateItem) => {
    let output = template.body_template;
    output = output.replace(/\{\{\s*student_name\s*\}\}/g, "Alex Johnson");
    output = output.replace(/\{\{\s*balance\s*\}\}/g, "₹2,500");
    output = output.replace(/\{\{\s*due_date\s*\}\}/g, new Date().toLocaleDateString("en-IN"));
    output = output.replace(/\{\{\s*activity_name\s*\}\}/g, "Final Project Submission");
    output = output.replace(/\{\{\s*threshold\s*\}\}/g, "75");
    output = output.replace(/\{\{\s*attendance_rate\s*\}\}/g, "68");
    return output;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-brand-600" /> Communication Message Templates
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage reusable notification templates with dynamic placeholder tags
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Message Template
        </button>
      </div>

      {/* Templates List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                  {t.category}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Updated {new Date(t.updated_at).toLocaleDateString()}
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base">{t.name}</h3>

              {t.subject && (
                <p className="text-xs font-semibold text-slate-700">
                  Subject: <span className="font-normal text-slate-600">{t.subject}</span>
                </p>
              )}

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {t.body_template}
              </div>

              {t.placeholders && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Tags:</span>
                  {t.placeholders.split(",").map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {`{{${p.trim()}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <button
                onClick={() => setPreviewTemplate(t)}
                className="text-brand-600 hover:underline font-semibold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Preview Output
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(t)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Edit Template"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-extrabold text-slate-900">
              {editingTemplate ? "Edit Message Template" : "Create New Message Template"}
            </h3>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fee Reminder"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Academic">Academic</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Tasks">Tasks</option>
                    <option value="System">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Action Required"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Body Template *
                </label>
                <textarea
                  rows={4}
                  required
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  placeholder="Dear {{student_name}}, your fee payment of {{balance}} is due on {{due_date}}."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Placeholder Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={placeholders}
                  onChange={(e) => setPlaceholders(e.target.value)}
                  placeholder="student_name, balance, due_date"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md"
                >
                  {loading ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-brand-600" /> Template Live Output Preview
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-brand-600 uppercase">
                {previewTemplate.name} ({previewTemplate.category})
              </span>
              <p className="text-sm font-bold text-slate-900">{previewTemplate.subject || "No Subject"}</p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans">
                {renderPreviewOutput(previewTemplate)}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

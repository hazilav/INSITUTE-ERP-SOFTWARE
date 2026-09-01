"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  Lock,
  Unlock,
  UploadCloud,
  CheckCircle2,
  X,
  FileCheck,
} from "lucide-react";

interface DocumentsClientProps {
  instituteName: string;
  students: { id: string; name: string; student_code: string }[];
}

export default function DocumentsClient({ instituteName, students }: DocumentsClientProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [documentType, setDocumentType] = useState("ID Proof");
  const [documentName, setDocumentName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [visibleToStudent, setVisibleToStudent] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [searchQuery, docTypeFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let url = `/api/students/documents?query=${encodeURIComponent(searchQuery)}`;
      if (docTypeFilter !== "ALL") url += `&document_type=${docTypeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error("Failed to fetch student documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFileUrl(data.url);
        if (!documentName) setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      } else {
        setMessage({ type: "error", text: data.error || "File upload failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error while uploading file." });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !documentName || !fileUrl) return;

    setUploading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/students/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          document_type: documentType,
          document_name: documentName,
          file_url: fileUrl,
          notes,
          visible_to_student: visibleToStudent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Document uploaded and saved successfully." });
        setShowUploadModal(false);
        resetUploadForm();
        fetchDocuments();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save document." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/students/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Document deleted." });
        fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const resetUploadForm = () => {
    setSelectedStudentId("");
    setDocumentType("ID Proof");
    setDocumentName("");
    setFileUrl("");
    setNotes("");
    setVisibleToStudent(true);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Documents Data Center
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Secure Student Records & Document Verification — {instituteName}
          </p>
        </div>

        <button
          onClick={() => {
            resetUploadForm();
            setShowUploadModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, code, or document title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Document Types</option>
            <option value="ID Proof">ID Proof</option>
            <option value="Passport">Passport</option>
            <option value="Photo">Photo</option>
            <option value="Education Certificate">Education Certificate</option>
            <option value="Application Form">Application Form</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Student Documents ({documents.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student documents...</div>
        ) : documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Visibility</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{d.document_name}</td>
                    <td className="py-3.5 px-4">
                      <Link href={`/dashboard/students/${d.student.id}`} className="font-bold text-brand-600 hover:underline block">
                        {d.student.name}
                      </Link>
                      <span className="text-slate-400 text-[11px] font-mono">{d.student.student_code}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {d.document_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {d.visible_to_student ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                          <Unlock className="w-3 h-3" /> Visible to Student
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                          <Lock className="w-3 h-3" /> Private (Staff Only)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {new Date(d.created_at).toLocaleDateString()}
                      <span className="block text-slate-400">By {d.uploaded_by?.name || "Staff"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                          title="View / Download File"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(d.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No student documents uploaded yet.</div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-brand-600" /> Upload Student Document
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                >
                  <option value="">Choose Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.student_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Type *</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  >
                    <option value="ID Proof">ID Proof</option>
                    <option value="Passport">Passport</option>
                    <option value="Photo">Photo</option>
                    <option value="Education Certificate">Education Certificate</option>
                    <option value="Application Form">Application Form</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="e.g. Passport Copy"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Choose File (PDF, JPG, PNG, DOC) *</label>
                <input
                  type="file"
                  required={!fileUrl}
                  onChange={handleFileUpload}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs"
                />
                {fileUrl && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ File uploaded ready to save.</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional remarks..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-900 block">Visible to Student</span>
                  <span className="text-[11px] text-indigo-600">Student can view/download in portal</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleToStudent}
                  onChange={(e) => setVisibleToStudent(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !fileUrl}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

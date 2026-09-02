"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Plus,
  Search,
  Filter,
  Eye,
  Printer,
  XCircle,
  CheckCircle2,
  X,
  FileCheck,
} from "lucide-react";
import CertificateTemplateModal from "@/components/CertificateTemplateModal";
import Modal from "@/components/Modal";

interface CertificatesClientProps {
  instituteName: string;
  students: { id: string; name: string; student_code: string; course_id?: string | null }[];
  courses: { id: string; name: string }[];
  userRole: string;
}

export default function CertificatesClient({
  instituteName,
  students,
  courses,
  userRole,
}: CertificatesClientProps) {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [certTypeFilter, setCertTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Certificate for Printable Preview Modal
  const [previewCert, setPreviewCert] = useState<any | null>(null);

  // Generate Certificate Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [certificateType, setCertificateType] = useState("Course Completion");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [searchQuery, courseFilter, certTypeFilter, statusFilter]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      let url = `/api/certificates?query=${encodeURIComponent(searchQuery)}`;
      if (courseFilter !== "ALL") url += `&course_id=${courseFilter}`;
      if (certTypeFilter !== "ALL") url += `&certificate_type=${certTypeFilter}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCertificates(data.certificates);
      }
    } catch (err) {
      console.error("Failed to fetch certificates", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (stId: string) => {
    setSelectedStudentId(stId);
    const st = students.find((s) => s.id === stId);
    if (st && st.course_id) {
      setSelectedCourseId(st.course_id);
    }
  };

  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !certificateType) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          course_id: selectedCourseId || null,
          certificate_type: certificateType,
          issue_date: issueDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setShowGenerateModal(false);
        resetForm();
        fetchCertificates();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to generate certificate." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeCertificate = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this certificate? History will be retained with 'Revoked' status.")) return;

    try {
      const res = await fetch(`/api/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Revoked" }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Certificate revoked." });
        fetchCertificates();
      }
    } catch (err) {
      console.error("Failed to revoke certificate", err);
    }
  };

  const resetForm = () => {
    setSelectedStudentId("");
    setSelectedCourseId("");
    setCertificateType("Course Completion");
    setIssueDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Certificates Management & Issuance
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Generate, View & Verify Student Academic Certificates — {instituteName}
          </p>
        </div>

        {userRole !== "STUDENT" && (
          <button
            onClick={() => {
              resetForm();
              setShowGenerateModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Generate Certificate
          </button>
        )}
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
        <div className="flex items-center gap-2 flex-1 min-w-0 sm:min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, code, or certificate number (e.g. CERT-2026-00001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-800 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={certTypeFilter}
            onChange={(e) => setCertTypeFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="Course Completion">Course Completion</option>
            <option value="Participation">Participation</option>
            <option value="Internship">Internship</option>
            <option value="Achievement">Achievement</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Certificates Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Issued Certificates ({certificates.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading certificates...</div>
        ) : certificates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cert Number</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-amber-900">{c.certificate_number}</td>
                    <td className="py-3.5 px-4">
                      <Link href={`/dashboard/students/${c.student.id}`} className="font-bold text-brand-600 hover:underline block">
                        {c.student.name}
                      </Link>
                      <span className="text-slate-400 text-[11px] font-mono">{c.student.student_code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.course?.name || "General Program"}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-700">{c.certificate_type}</td>
                    <td className="py-3.5 px-4 font-mono">{new Date(c.issue_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === "Issued"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewCert(c)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5" /> View / Print
                        </button>
                        {userRole !== "STUDENT" && c.status === "Issued" && (
                          <button
                            onClick={() => handleRevokeCertificate(c.id)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-[11px]"
                            title="Revoke Certificate"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">No certificates generated yet.</div>
        )}
      </div>

      {/* Generate Certificate Modal */}
      {showGenerateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowGenerateModal(false)}
          title="Generate Certificate"
          subtitle="Issue official certification credentials with verification code"
          icon={<Award className="w-5 h-5 text-amber-600" />}
          maxWidth="md"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateCertificate}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Generating..." : "Generate Certificate"}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Certificate Type *</label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Course Completion">Course Completion</option>
                  <option value="Participation">Participation</option>
                  <option value="Internship">Internship</option>
                  <option value="Achievement">Achievement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 text-[11px] text-amber-800 font-bold">
              💡 Certificate number will be auto-generated in format <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">CERT-2026-XXXXX</code>.
            </div>
          </div>
        </Modal>
      )}

      {/* Certificate Printable Modal */}
      {previewCert && (
        <CertificateTemplateModal certificate={previewCert} onClose={() => setPreviewCert(null)} />
      )}
    </div>
  );
}

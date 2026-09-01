"use client";

import { X, Printer, Award, Download } from "lucide-react";

interface CertificateTemplateModalProps {
  certificate: {
    certificate_number: string;
    certificate_type: string;
    issue_date: string;
    status: string;
    student: {
      name: string;
      student_code: string;
    };
    course?: {
      name: string;
    } | null;
    institute?: {
      name: string;
      logo?: string | null;
    } | null;
  };
  onClose: () => void;
}

export default function CertificateTemplateModal({
  certificate,
  onClose,
}: CertificateTemplateModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const instName = certificate.institute?.name || "Institute of Technology";
  const courseName = certificate.course?.name || "Professional Certification Course";
  const issueDateStr = new Date(certificate.issue_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl relative border-4 border-amber-200 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <span className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" /> Certificate Preview
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Frame Layout */}
        <div className="border-8 border-double border-amber-700/80 p-8 sm:p-12 text-center bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20 rounded-2xl relative space-y-6">
          {/* Status Watermark if Revoked */}
          {certificate.status === "Revoked" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <span className="text-7xl sm:text-9xl font-black text-rose-600 uppercase transform -rotate-12 border-8 border-rose-600 px-8 py-4">
                REVOKED
              </span>
            </div>
          )}

          {/* Header */}
          <div className="space-y-2">
            {certificate.institute?.logo && (
              <img
                src={certificate.institute.logo}
                alt="Institute Logo"
                className="w-16 h-16 mx-auto object-contain mb-2"
              />
            )}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-900 tracking-wide uppercase font-serif">
              {instName}
            </h2>
            <p className="text-xs uppercase tracking-widest font-bold text-amber-700">Official Certificate of Excellence</p>
          </div>

          <div className="w-24 h-1 bg-amber-600 mx-auto rounded-full"></div>

          {/* Certificate Title */}
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">This is to certify that</p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-serif tracking-tight py-2 border-b-2 border-slate-200 inline-block px-8">
              {certificate.student.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono pt-1">Student ID: {certificate.student.student_code}</p>
          </div>

          {/* Body Statement */}
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl mx-auto font-serif">
            has successfully fulfilled all requirements and completed the program for{" "}
            <strong className="text-amber-900 font-bold underline">{certificate.certificate_type}</strong> in{" "}
            <strong className="text-slate-900">{courseName}</strong>.
          </p>

          {/* Footer Grid */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 items-end gap-4 text-xs font-serif text-slate-700">
            <div className="text-left space-y-1">
              <p className="font-bold text-slate-900">Date of Issue:</p>
              <p className="font-mono text-slate-600">{issueDateStr}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">No: {certificate.certificate_number}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-600 mx-auto flex items-center justify-center text-[10px] font-bold text-amber-800 bg-amber-50/50">
                INSTITUTE<br />SEAL
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="w-32 border-b border-slate-400 ml-auto pb-1 text-center font-mono text-[10px] italic text-slate-500">
                Authorized Signature
              </div>
              <p className="font-bold text-slate-900">Director / Controller</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Printer, Award } from "lucide-react";
import Modal from "./Modal";

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Certificate Preview"
      subtitle={`Official Certificate #${certificate.certificate_number}`}
      icon={<Award className="w-5 h-5 text-amber-600" />}
      maxWidth="3xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto flex-[2] py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" /> Print / Export PDF
          </button>
        </div>
      }
    >
      {/* Certificate Frame Layout */}
      <div className="border-4 sm:border-8 border-double border-amber-700/80 p-4 sm:p-10 text-center bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20 rounded-2xl relative space-y-4 sm:space-y-6">
        {/* Status Watermark if Revoked */}
        {certificate.status === "Revoked" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="text-5xl sm:text-8xl font-black text-rose-600 uppercase transform -rotate-12 border-4 sm:border-8 border-rose-600 px-6 py-3">
              REVOKED
            </span>
          </div>
        )}

        {/* Header */}
        <div className="space-y-1.5">
          {certificate.institute?.logo && (
            <img
              src={certificate.institute.logo}
              alt="Institute Logo"
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-contain mb-2"
            />
          )}
          <h2 className="text-xl sm:text-3xl font-extrabold text-amber-900 tracking-wide uppercase font-serif">
            {instName}
          </h2>
          <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-amber-700">
            Official Certificate of Excellence
          </p>
        </div>

        <div className="w-20 h-1 bg-amber-600 mx-auto rounded-full"></div>

        {/* Certificate Title */}
        <div className="space-y-1">
          <p className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-widest font-semibold">
            This is to certify that
          </p>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 font-serif tracking-tight py-1.5 border-b-2 border-slate-200 inline-block px-4 sm:px-8">
            {certificate.student.name}
          </h1>
          <p className="text-[11px] text-slate-400 font-mono pt-1">
            Student ID: {certificate.student.student_code}
          </p>
        </div>

        {/* Body Statement */}
        <p className="text-xs sm:text-base text-slate-700 leading-relaxed max-w-xl mx-auto font-serif">
          has successfully fulfilled all requirements and completed the program for{" "}
          <strong className="text-amber-900 font-bold underline">
            {certificate.certificate_type}
          </strong>{" "}
          in <strong className="text-slate-900">{courseName}</strong>.
        </p>

        {/* Footer Grid */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 items-end gap-4 text-xs font-serif text-slate-700">
          <div className="text-left space-y-0.5">
            <p className="font-bold text-slate-900">Date of Issue:</p>
            <p className="font-mono text-slate-600">{issueDateStr}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              No: {certificate.certificate_number}
            </p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-amber-600 mx-auto flex items-center justify-center text-[9px] font-bold text-amber-800 bg-amber-50/50">
              INSTITUTE
              <br />
              SEAL
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="w-32 border-b border-slate-400 ml-auto pb-1 text-center font-mono text-[10px] italic text-slate-500">
              Authorized Signature
            </div>
            <p className="font-bold text-slate-900">Director / Controller</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

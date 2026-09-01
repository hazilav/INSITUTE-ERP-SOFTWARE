"use client";

import { useState } from "react";
import { Award, Printer } from "lucide-react";
import CertificateTemplateModal from "@/components/CertificateTemplateModal";

interface StudentCertificatesClientProps {
  certificates: any[];
  studentName: string;
}

export default function StudentCertificatesClient({
  certificates,
  studentName,
}: StudentCertificatesClientProps) {
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Certificates
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Academic completion and achievement certificates issued to {studentName}
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" /> Certificates ({certificates.length})
        </h3>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certificates.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 w-fit">
                    {c.certificate_number}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base">{c.certificate_type}</h4>
                  <p className="text-xs text-slate-600 font-semibold">{c.course?.name || "Academic Program"}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Issued: {new Date(c.issue_date).toLocaleDateString()}</p>
                </div>

                <button
                  onClick={() => setSelectedCert(c)}
                  className="w-full px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> View / Print Certificate
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            No certificates have been issued to your student account yet.
          </div>
        )}
      </div>

      {selectedCert && (
        <CertificateTemplateModal certificate={selectedCert} onClose={() => setSelectedCert(null)} />
      )}
    </div>
  );
}

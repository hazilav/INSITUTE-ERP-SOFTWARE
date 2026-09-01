import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";
import StudentCertificatesClient from "./StudentCertificatesClient";

export const dynamic = "force-dynamic";

export default async function StudentMyCertificatesPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const certificates = await db.certificate.findMany({
    where: {
      institute_id: institute.id,
      student_id: student.id,
      status: "Issued",
    },
    include: {
      student: { select: { id: true, name: true, student_code: true } },
      course: { select: { name: true } },
      institute: { select: { name: true, logo: true } },
    },
    orderBy: { issue_date: "desc" },
  });

  return (
    <StudentPortalWrapper>
      <StudentCertificatesClient certificates={certificates} studentName={student.name} />
    </StudentPortalWrapper>
  );
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import CertificatesClient from "./CertificatesClient";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/certificates");

  const [students, courses] = await Promise.all([
    db.student.findMany({
      where: { institute_id: authContext.institute.id, is_archived: false },
      select: { id: true, name: true, student_code: true, course_id: true },
      orderBy: { name: "asc" },
    }),
    db.course.findMany({
      where: { institute_id: authContext.institute.id },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <CertificatesClient
      instituteName={authContext.institute.name}
      students={students}
      courses={courses}
      userRole={authContext.user.role}
    />
  );
}

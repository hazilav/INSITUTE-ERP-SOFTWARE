import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import StudentLayout from "@/components/StudentLayout";

interface StudentPortalWrapperProps {
  children: React.ReactNode;
}

export default async function StudentPortalWrapper({
  children,
}: StudentPortalWrapperProps) {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) {
    redirect("/student/login");
  }

  const { student, institute } = studentContext;

  return (
    <StudentLayout
      student={student}
      instituteName={institute.name}
      instituteMode={institute.institute_mode || "hybrid"}
    >
      {children}
    </StudentLayout>
  );
}

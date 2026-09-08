import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { getAuthenticatedUser } from "@/lib/auth";
import StudentLayout from "@/components/StudentLayout";

interface StudentPortalWrapperProps {
  children: React.ReactNode;
}

export default async function StudentPortalWrapper({
  children,
}: StudentPortalWrapperProps) {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) {
    const authContext = await getAuthenticatedUser();
    if (authContext && authContext.user.role === "STUDENT") {
      redirect("/student/login?error=inactive");
    }
    redirect("/student/login");
  }

  const { student, institute } = studentContext;

  return (
    <StudentLayout
      student={student}
      instituteName={institute.name}
      instituteLogo={institute.logo}
      instituteMode={institute.institute_mode || "hybrid"}
    >
      {children}
    </StudentLayout>
  );
}

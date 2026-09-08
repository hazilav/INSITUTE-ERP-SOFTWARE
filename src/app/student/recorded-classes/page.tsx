import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";
import StudentRecordedClassesClient from "@/components/StudentRecordedClassesClient";

export const dynamic = "force-dynamic";

export default async function StudentRecordedClassesPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  if (institute.institute_mode === "offline") {
    redirect("/student/dashboard");
  }

  const courseName = student.course?.name || "General Course";
  const courseCode = student.course?.code;
  const hasCourse = Boolean(student.course_id);

  return (
    <StudentPortalWrapper>
      <StudentRecordedClassesClient
        courseName={courseName}
        courseCode={courseCode}
        hasCourse={hasCourse}
      />
    </StudentPortalWrapper>
  );
}

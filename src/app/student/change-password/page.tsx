import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import ChangePasswordClient from "./ChangePasswordClient";

export const dynamic = "force-dynamic";

export default async function StudentChangePasswordPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  // If user doesn't need to change password, redirect to dashboard
  if (!studentContext.user.must_change_password) {
    redirect("/student/dashboard");
  }

  return <ChangePasswordClient studentName={studentContext.student.name} />;
}

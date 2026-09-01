import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import NotificationsClient from "@/app/dashboard/communication/notifications/NotificationsClient";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentNotificationsPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  return (
    <StudentPortalWrapper>
      <NotificationsClient isStudent={true} role="STUDENT" />
    </StudentPortalWrapper>
  );
}

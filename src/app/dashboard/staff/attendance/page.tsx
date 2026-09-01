import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import StaffAttendanceClient from "./StaffAttendanceClient";

export const dynamic = "force-dynamic";

export default async function StaffAttendancePage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role !== "OWNER" && authContext.user.role !== "ADMIN") {
    redirect("/dashboard/staff/my-attendance");
  }

  return <StaffAttendanceClient instituteName={authContext.institute.name} />;
}

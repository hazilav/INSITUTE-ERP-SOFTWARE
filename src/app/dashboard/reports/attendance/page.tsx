import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import AttendanceReportClient from "./AttendanceReportClient";

export const dynamic = "force-dynamic";

export default async function AttendanceReportPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <AttendanceReportClient instituteName={authContext.institute.name} />;
}

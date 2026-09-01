import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import StaffTasksReportClient from "./StaffTasksReportClient";

export const dynamic = "force-dynamic";

export default async function StaffTasksReportPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <StaffTasksReportClient instituteName={authContext.institute.name} />;
}

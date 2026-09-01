import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import AcademicReportClient from "./AcademicReportClient";

export const dynamic = "force-dynamic";

export default async function AcademicReportPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <AcademicReportClient instituteName={authContext.institute.name} />;
}

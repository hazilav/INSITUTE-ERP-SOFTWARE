import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import StudentsReportClient from "./StudentsReportClient";

export const dynamic = "force-dynamic";

export default async function StudentsReportPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <StudentsReportClient instituteName={authContext.institute.name} />;
}

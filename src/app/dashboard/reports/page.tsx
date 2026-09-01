import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import ReportsOverviewClient from "./ReportsOverviewClient";

export const dynamic = "force-dynamic";

export default async function ReportsOverviewPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <ReportsOverviewClient instituteName={authContext.institute.name} role={authContext.user.role} />;
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import FinanceReportClient from "./FinanceReportClient";

export const dynamic = "force-dynamic";

export default async function FinanceReportPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT" || authContext.user.role === "MENTOR") {
    redirect("/dashboard");
  }

  return <FinanceReportClient instituteName={authContext.institute.name} />;
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import LeaveManagementClient from "./LeaveManagementClient";

export const dynamic = "force-dynamic";

export default async function LeaveManagementPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role !== "OWNER" && authContext.user.role !== "ADMIN") {
    redirect("/dashboard/staff/my-leaves");
  }

  return <LeaveManagementClient instituteName={authContext.institute.name} />;
}

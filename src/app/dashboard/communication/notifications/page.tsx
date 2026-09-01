import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function DashboardNotificationsPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  return <NotificationsClient isStudent={false} role={authContext.user.role} />;
}

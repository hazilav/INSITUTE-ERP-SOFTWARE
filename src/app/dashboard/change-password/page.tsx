import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function DashboardChangePasswordPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user } = authContext;

  // If user doesn't need to change password, redirect to main dashboard
  if (!user.must_change_password) {
    redirect("/dashboard");
  }

  return <ChangePasswordForm userName={user.name} role={user.role} />;
}

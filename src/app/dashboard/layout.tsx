import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import DashboardShellClient from "./DashboardShellClient";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = await getAuthenticatedUser();

  if (!authContext) {
    redirect("/login");
  }

  if (authContext.user.role === "STUDENT") {
    redirect("/student/dashboard");
  }

  return (
    <DashboardShellClient
      user={authContext.user}
      institute={authContext.institute}
    >
      {children}
    </DashboardShellClient>
  );
}

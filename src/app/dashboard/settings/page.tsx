import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authContext = await getAuthenticatedUser();
  if (!authContext) redirect("/login");

  if (authContext.user.role === "STUDENT") {
    redirect("/student/dashboard");
  }

  const [institute, users, permissions] = await Promise.all([
    db.institute.findUnique({
      where: { id: authContext.institute.id },
    }),
    db.user.findMany({
      where: { institute_id: authContext.institute.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    }),
    db.rolePermission.findMany({
      where: { institute_id: authContext.institute.id },
    }),
  ]);

  if (!institute) redirect("/login");

  return (
    <SettingsClient
      institute={institute}
      users={users}
      initialPermissions={permissions}
      currentUser={authContext.user}
    />
  );
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import TemplatesClient from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function MessageTemplatesPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  if (authContext.user.role !== "OWNER" && authContext.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <TemplatesClient />;
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import MyLeavesClient from "./MyLeavesClient";

export const dynamic = "force-dynamic";

export default async function MyLeavesPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <MyLeavesClient instituteName={authContext.institute.name} user={authContext.user} />;
}

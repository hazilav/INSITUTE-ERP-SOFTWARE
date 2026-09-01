import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import RoomsClient from "./RoomsClient";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role !== "OWNER" && authContext.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <RoomsClient instituteName={authContext.institute.name} />;
}

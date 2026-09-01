import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import MyAttendanceClient from "./MyAttendanceClient";

export const dynamic = "force-dynamic";

export default async function MyAttendancePage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/dashboard");

  return <MyAttendanceClient instituteName={authContext.institute.name} user={authContext.user} />;
}

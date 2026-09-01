import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authContext = await getAuthenticatedUser();

  if (authContext) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

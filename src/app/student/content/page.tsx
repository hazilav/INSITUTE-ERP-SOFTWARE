import { redirect } from "next/navigation";

export default function StudentContentRedirect() {
  redirect("/student/recorded-classes");
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

export default async function StudentDocumentsPage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/documents");

  const students = await db.student.findMany({
    where: { institute_id: authContext.institute.id, is_archived: false },
    select: { id: true, name: true, student_code: true },
    orderBy: { name: "asc" },
  });

  return <DocumentsClient instituteName={authContext.institute.name} students={students} />;
}

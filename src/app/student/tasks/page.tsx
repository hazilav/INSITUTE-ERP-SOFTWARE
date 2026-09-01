import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import StudentTasksClient from "./StudentTasksClient";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentTasksPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const initialTasks = await db.studentTask.findMany({
    where: { institute_id: institute.id, student_id: student.id },
    orderBy: [{ status: "asc" }, { due_date: "asc" }],
  });

  const formattedTasks = initialTasks.map((t) => ({
    ...t,
    due_date: t.due_date ? t.due_date.toISOString() : null,
    created_at: t.created_at.toISOString(),
  }));

  return (
    <StudentPortalWrapper>
      <StudentTasksClient initialTasks={formattedTasks} />
    </StudentPortalWrapper>
  );
}

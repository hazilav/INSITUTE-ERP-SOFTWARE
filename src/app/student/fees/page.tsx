import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import StudentFeeProfileClient from "./StudentFeeProfileClient";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentFeesPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const feePlan = await db.feePlan.findFirst({
    where: { institute_id: institute.id, student_id: student.id },
    include: {
      installments: { orderBy: { due_date: "asc" } },
      payments: {
        include: { recorded_by: { select: { name: true } } },
        orderBy: { payment_date: "desc" },
      },
    },
  });

  const formattedFeePlan = feePlan
    ? {
        ...feePlan,
        installments: feePlan.installments.map((i) => ({
          ...i,
          due_date: i.due_date.toISOString(),
        })),
        payments: feePlan.payments.map((p) => ({
          ...p,
          payment_date: p.payment_date.toISOString(),
        })),
      }
    : null;

  return (
    <StudentPortalWrapper>
      <StudentFeeProfileClient
        feePlan={formattedFeePlan}
        student={{
          student_code: student.student_code,
          name: student.name,
          phone: student.phone,
          email: student.email,
          course_name: student.course?.name || "General Course",
        }}
        instituteName={institute.name}
      />
    </StudentPortalWrapper>
  );
}

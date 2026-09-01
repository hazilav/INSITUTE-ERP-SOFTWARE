import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import StudentProfileClient from "./StudentProfileClient";

export const dynamic = "force-dynamic";

interface StudentProfilePageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function StudentProfilePage({
  params,
  searchParams,
}: StudentProfilePageProps) {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");

  const { user, institute } = authContext;

  // Student role check: Students can only view their own profile
  if (user.role === "STUDENT") {
    const studentSelf = await db.student.findUnique({ where: { user_id: user.id } });
    if (!studentSelf || studentSelf.id !== params.id) redirect("/dashboard");
  }

  const student = await db.student.findFirst({
    where: {
      id: params.id,
      institute_id: institute.id,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true, code: true } },
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          last_login: true,
        },
      },
      activities: {
        orderBy: { created_at: "desc" },
      },
      attendance_records: {
        include: {
          classItem: { select: { title: true, room: true } },
          course: { select: { name: true } },
          batch: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      },
      assessment_results: {
        include: {
          assessment: {
            include: {
              course: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
      fee_plans: {
        include: {
          installments: { orderBy: { due_date: "asc" } },
          payments: {
            include: { recorded_by: { select: { name: true } } },
            orderBy: { payment_date: "desc" },
          },
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!student) notFound();

  // Fetch upcoming classes & batch activity history for student
  let upcomingClasses: any[] = [];
  let studentActivitiesList: any[] = [];

  if (student.batch_id) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    upcomingClasses = await db.class.findMany({
      where: {
        institute_id: institute.id,
        batch_id: student.batch_id,
        date: { gte: todayStart },
        status: { in: ["Scheduled", "Live"] },
      },
      orderBy: [{ date: "asc" }, { start_time: "asc" }],
      take: 6,
    });

    const batchActivities = await db.activity.findMany({
      where: {
        institute_id: institute.id,
        batch_id: student.batch_id,
        status: "Published",
      },
      include: {
        course: { select: { name: true } },
        submissions: {
          where: { student_id: student.id },
          select: {
            id: true,
            status: true,
            submitted_at: true,
            obtained_marks: true,
          },
        },
      },
      orderBy: { due_date: "asc" },
    });

    studentActivitiesList = batchActivities.map((a) => ({
      id: a.id,
      title: a.title,
      activity_type: a.activity_type,
      due_date: a.due_date.toISOString(),
      maximum_marks: a.maximum_marks,
      course: a.course,
      submission: a.submissions[0]
        ? {
            ...a.submissions[0],
            submitted_at: a.submissions[0].submitted_at.toISOString(),
          }
        : null,
    }));
  }

  // Format student assessment marks list
  const studentMarksList = student.assessment_results.map((r) => ({
    id: r.id,
    obtained_marks: r.obtained_marks,
    percentage: r.percentage,
    grade: r.grade,
    is_pass: r.is_pass,
    result_status: r.result_status,
    feedback: r.feedback,
    assessment: {
      id: r.assessment.id,
      name: r.assessment.name,
      type: r.assessment.type,
      assessment_date: r.assessment.assessment_date.toISOString(),
      maximum_marks: r.assessment.maximum_marks,
      passing_marks: r.assessment.passing_marks,
      module_name: r.assessment.module_name,
      course: r.assessment.course,
    },
  }));

  // Format student primary Fee Plan
  const activeFeePlan = student.fee_plans[0]
    ? {
        ...student.fee_plans[0],
        installments: student.fee_plans[0].installments.map((i) => ({
          ...i,
          due_date: i.due_date.toISOString(),
        })),
        payments: student.fee_plans[0].payments.map((p) => ({
          ...p,
          payment_date: p.payment_date.toISOString(),
        })),
      }
    : null;

  const activeTab = searchParams.tab || "overview";

  return (
    <StudentProfileClient
      student={{
        ...student,
        dob: student.dob ? student.dob.toISOString() : null,
        created_at: student.created_at.toISOString(),
        updated_at: student.updated_at.toISOString(),
        user: student.user
          ? {
              ...student.user,
              last_login: student.user.last_login
                ? student.user.last_login.toISOString()
                : null,
            }
          : null,
        activities: student.activities.map((a) => ({
          ...a,
          created_at: a.created_at.toISOString(),
        })),
      }}
      upcomingClasses={upcomingClasses.map((c) => ({
        ...c,
        date: c.date.toISOString(),
      }))}
      attendanceRecords={student.attendance_records.map((r) => ({
        ...r,
        date: r.date.toISOString(),
      }))}
      studentActivitiesList={studentActivitiesList}
      studentMarksList={studentMarksList}
      studentFeePlan={activeFeePlan}
      instituteName={institute.name}
      userRole={user.role}
      activeTab={activeTab}
    />
  );
}

import { NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const studentContext = await getAuthenticatedStudent();

    if (!studentContext) {
      return NextResponse.json({ error: "Unauthorized: Access Denied" }, { status: 403 });
    }

    const { student, institute } = studentContext;

    // 1. Attendance % Calculation
    const attendanceRecords = await db.attendanceRecord.findMany({
      where: { institute_id: institute.id, student_id: student.id },
      select: { status: true },
    });

    const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
    const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
    const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;
    const totalAttendanceDenom = presentCount + lateCount + absentCount;

    const attendancePct =
      totalAttendanceDenom > 0
        ? (((presentCount + lateCount) / totalAttendanceDenom) * 100).toFixed(0) + "%"
        : "—";

    // 2. Pending Activities Count
    let pendingActivitiesCount = 0;
    if (student.batch_id) {
      const batchActivities = await db.activity.findMany({
        where: {
          institute_id: institute.id,
          batch_id: student.batch_id,
          status: "Published",
        },
        include: {
          submissions: { where: { student_id: student.id } },
        },
      });

      pendingActivitiesCount = batchActivities.filter(
        (a) => a.submissions.length === 0 || a.submissions[0].status === "Needs Revision"
      ).length;
    }

    // 3. Academic Performance Average %
    const assessmentResults = await db.assessmentResult.findMany({
      where: { institute_id: institute.id, student_id: student.id },
      select: { percentage: true },
    });

    const totalPctSum = assessmentResults.reduce((acc, r) => acc + r.percentage, 0);
    const avgAcademicPct =
      assessmentResults.length > 0
        ? (totalPctSum / assessmentResults.length).toFixed(0) + "%"
        : "—";

    // 4. Fee Balance Due
    const feePlan = await db.feePlan.findFirst({
      where: { institute_id: institute.id, student_id: student.id },
    });

    const feeBalanceDue = feePlan ? `$${feePlan.balance.toFixed(2)}` : "—";

    // 5. Today's Classes for Student Batch
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let todaysClasses: any[] = [];
    let upcomingClasses: any[] = [];

    if (student.batch_id) {
      todaysClasses = await db.class.findMany({
        where: {
          institute_id: institute.id,
          batch_id: student.batch_id,
          date: { gte: todayStart, lte: todayEnd },
        },
        include: { mentor: { select: { name: true } } },
        orderBy: { start_time: "asc" },
      });

      const tomorrowStart = new Date(todayEnd.getTime() + 1000);
      upcomingClasses = await db.class.findMany({
        where: {
          institute_id: institute.id,
          batch_id: student.batch_id,
          date: { gte: tomorrowStart },
          status: "Scheduled",
        },
        include: { mentor: { select: { name: true } } },
        orderBy: { date: "asc" },
        take: 5,
      });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        attendance: attendancePct,
        pendingActivities: pendingActivitiesCount > 0 ? `${pendingActivitiesCount} Pending` : "0 Pending",
        academicPerformance: avgAcademicPct,
        feeBalance: feeBalanceDue,
      },
      todaysClasses,
      upcomingClasses,
    });
  } catch (error) {
    console.error("GET Student Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to load student dashboard" },
      { status: 500 }
    );
  }
}

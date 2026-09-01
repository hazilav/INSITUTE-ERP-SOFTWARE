import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDateFilter } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Access denied. Students cannot access report analytics." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rangeType = searchParams.get("range") || "all";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const dateRange = parseDateFilter(rangeType, startDateStr, endDateStr);

    // 1. Students
    const totalStudents = await db.student.count({
      where: { institute_id: institute.id, is_archived: false },
    });

    const activeStudents = await db.student.count({
      where: { institute_id: institute.id, is_archived: false, status: "ACTIVE" },
    });

    // 2. Attendance
    const attendanceWhere: any = { institute_id: institute.id };
    if (dateRange.start && dateRange.end) {
      attendanceWhere.date = { gte: dateRange.start, lte: dateRange.end };
    }

    const attendanceRecords = await db.attendanceRecord.findMany({
      where: attendanceWhere,
      select: { status: true },
    });

    const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
    const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
    const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;
    const totalAttendanceDenom = presentCount + lateCount + absentCount;

    const overallAttendancePct =
      totalAttendanceDenom > 0
        ? (((presentCount + lateCount) / totalAttendanceDenom) * 100).toFixed(2)
        : "0.00";

    // 3. Academic
    const results = await db.assessmentResult.findMany({
      where: { institute_id: institute.id },
      select: { percentage: true },
    });

    const totalPctSum = results.reduce((acc, r) => acc + r.percentage, 0);
    const overallAcademicPct =
      results.length > 0 ? (totalPctSum / results.length).toFixed(2) : "0.00";

    // 4. Finance
    const paymentsWhere: any = { institute_id: institute.id };
    if (dateRange.start && dateRange.end) {
      paymentsWhere.payment_date = { gte: dateRange.start, lte: dateRange.end };
    }

    const payments = await db.payment.findMany({
      where: paymentsWhere,
      select: { amount: true },
    });

    const totalFeesCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    const feePlans = await db.feePlan.findMany({
      where: { institute_id: institute.id },
      select: { balance: true },
    });

    const totalOutstandingFees = feePlans.reduce((acc, f) => acc + f.balance, 0);

    // 5. Staff & Tasks
    const activeStaffCount = await db.staffProfile.count({
      where: { institute_id: institute.id, status: "Active" },
    });

    const pendingTasksCount = await db.studentTask.count({
      where: { institute_id: institute.id, status: { in: ["Pending", "In Progress"] } },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalStudents,
        activeStudents,
        overallAttendancePct: `${overallAttendancePct}%`,
        overallAcademicPct: `${overallAcademicPct}%`,
        totalFeesCollected,
        totalOutstandingFees,
        activeStaffCount,
        pendingTasksCount,
      },
    });
  } catch (error: any) {
    console.error("GET Reports Overview API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch overview report" }, { status: 500 });
  }
}

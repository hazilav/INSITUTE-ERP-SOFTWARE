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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rangeType = searchParams.get("range") || "all";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const courseId = searchParams.get("course_id");
    const batchId = searchParams.get("batch_id");

    const dateRange = parseDateFilter(rangeType, startDateStr, endDateStr);

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (dateRange.start && dateRange.end) {
      whereCondition.date = { gte: dateRange.start, lte: dateRange.end };
    }

    if (batchId && batchId !== "ALL") {
      whereCondition.batch_id = batchId;
    }

    const records = await db.attendanceRecord.findMany({
      where: whereCondition,
      include: {
        student: {
          select: { id: true, name: true, student_code: true, course: { select: { name: true } }, batch: { select: { name: true } } },
        },
        batch: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    const presentCount = records.filter((r) => r.status === "Present").length;
    const lateCount = records.filter((r) => r.status === "Late").length;
    const absentCount = records.filter((r) => r.status === "Absent").length;
    const leaveCount = records.filter((r) => r.status === "Leave").length;

    const totalDenom = presentCount + lateCount + absentCount;
    const overallPct =
      totalDenom > 0 ? (((presentCount + lateCount) / totalDenom) * 100).toFixed(2) : "0.00";

    // Attendance Trend by Date
    const trendMap: Record<string, { present: number; total: number }> = {};
    records.forEach((r) => {
      const dateStr = new Date(r.date).toISOString().slice(0, 10);
      if (!trendMap[dateStr]) trendMap[dateStr] = { present: 0, total: 0 };
      if (r.status === "Present" || r.status === "Late") trendMap[dateStr].present++;
      if (r.status !== "Leave") trendMap[dateStr].total++;
    });

    const attendanceTrend = Object.entries(trendMap).map(([date, data]) => ({
      date,
      percentage: data.total > 0 ? parseFloat(((data.present / data.total) * 100).toFixed(1)) : 0,
    }));

    // Batch Comparison
    const batchTrendMap: Record<string, { present: number; total: number }> = {};
    records.forEach((r) => {
      const bName = r.batch?.name || "General Batch";
      if (!batchTrendMap[bName]) batchTrendMap[bName] = { present: 0, total: 0 };
      if (r.status === "Present" || r.status === "Late") batchTrendMap[bName].present++;
      if (r.status !== "Leave") batchTrendMap[bName].total++;
    });

    const batchComparison = Object.entries(batchTrendMap).map(([batch, data]) => ({
      batch,
      percentage: data.total > 0 ? parseFloat(((data.present / data.total) * 100).toFixed(1)) : 0,
    }));

    // Low Attendance Students (< 75% threshold)
    const allActiveStudents = await db.student.findMany({
      where: { institute_id: institute.id, is_archived: false },
      include: {
        attendance_records: { select: { status: true } },
        course: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    const lowAttendanceStudents: any[] = [];
    allActiveStudents.forEach((s) => {
      const p = s.attendance_records.filter((r) => r.status === "Present").length;
      const l = s.attendance_records.filter((r) => r.status === "Late").length;
      const a = s.attendance_records.filter((r) => r.status === "Absent").length;
      const den = p + l + a;
      if (den > 0) {
        const pct = parseFloat(((p + l) / den * 100).toFixed(2));
        if (pct < 75) {
          lowAttendanceStudents.push({
            id: s.id,
            student_code: s.student_code,
            name: s.name,
            course_name: s.course?.name || "Unassigned",
            batch_name: s.batch?.name || "Unassigned",
            attendancePct: `${pct}%`,
            status: s.status,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        overallPct: `${overallPct}%`,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
      },
      attendanceTrend,
      batchComparison,
      lowAttendanceStudents,
    });
  } catch (error: any) {
    console.error("GET Attendance Report API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch attendance report" }, { status: 500 });
  }
}

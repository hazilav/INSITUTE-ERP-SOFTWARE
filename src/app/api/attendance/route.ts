import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const dateFilter = searchParams.get("date") || ""; // YYYY-MM-DD
    const studentFilter = searchParams.get("student_id") || "ALL";
    const courseFilter = searchParams.get("course_id") || "ALL";
    const batchFilter = searchParams.get("batch_id") || "ALL";
    const typeFilter = searchParams.get("class_type") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    // Scoped where condition
    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student) {
        return NextResponse.json({
          success: true,
          records: [],
          metrics: { percentage: "0.00%", present: 0, absent: 0, late: 0, leave: 0, totalAttended: 0 },
        });
      }
      whereCondition.student_id = student.id;
    } else {
      if (studentFilter !== "ALL") whereCondition.student_id = studentFilter;
      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (batchFilter !== "ALL") whereCondition.batch_id = batchFilter;
    }

    if (typeFilter !== "ALL") whereCondition.class_type = typeFilter;
    if (statusFilter !== "ALL") whereCondition.status = statusFilter;

    if (dateFilter) {
      const startDate = new Date(`${dateFilter}T00:00:00.000Z`);
      const endDate = new Date(`${dateFilter}T23:59:59.999Z`);
      whereCondition.date = { gte: startDate, lte: endDate };
    }

    if (search) {
      whereCondition.OR = [
        { student: { name: { contains: search } } },
        { student: { student_code: { contains: search } } },
        { classItem: { title: { contains: search } } },
      ];
    }

    const records = await db.attendanceRecord.findMany({
      where: whereCondition,
      include: {
        student: { select: { id: true, student_code: true, name: true, phone: true } },
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        classItem: { select: { id: true, title: true, class_type: true, room: true, meeting_link: true } },
        marked_by: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      take: 100,
    });

    // Compute Today's Attendance Metrics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const baseTodayWhere: any = {
      institute_id: institute.id,
      date: { gte: todayStart, lte: todayEnd },
    };

    if (user.role === "STUDENT") {
      const s = await db.student.findUnique({ where: { user_id: user.id } });
      if (s) baseTodayWhere.student_id = s.id;
    }

    const todayRecords = await db.attendanceRecord.findMany({
      where: baseTodayWhere,
      select: { status: true },
    });

    const presentCount = todayRecords.filter((r) => r.status === "Present").length;
    const lateCount = todayRecords.filter((r) => r.status === "Late").length;
    const absentCount = todayRecords.filter((r) => r.status === "Absent").length;
    const leaveCount = todayRecords.filter((r) => r.status === "Leave").length;

    const denominator = presentCount + lateCount + absentCount; // Leave is excluded from denominator
    const attendancePercentage =
      denominator > 0 ? (((presentCount + lateCount) / denominator) * 100).toFixed(2) : "0.00";

    const activeCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const activeBatches = await db.batch.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      records,
      metrics: {
        percentage: `${attendancePercentage}%`,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        leave: leaveCount,
        totalToday: todayRecords.length,
      },
      activeCourses,
      activeBatches,
    });
  } catch (error) {
    console.error("GET Attendance API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance history" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { class_id, batch_id, date, student_records } = body;
    // student_records: Array<{ student_id: string, status: string, remarks?: string }>

    if (!class_id || !batch_id || !student_records || !Array.isArray(student_records)) {
      return NextResponse.json(
        { error: "class_id, batch_id, and student_records array are required." },
        { status: 400 }
      );
    }

    const classItem = await db.class.findFirst({
      where: { id: class_id, batch_id: batch_id, institute_id: institute.id },
    });

    if (!classItem) {
      return NextResponse.json(
        { error: "Class not found for your institute." },
        { status: 404 }
      );
    }

    const classDate = date ? new Date(date) : classItem.date;

    // Bulk upsert attendance records using $transaction
    const upserted = await db.$transaction(
      student_records.map((rec) => {
        const validStatus = ["Present", "Absent", "Late", "Leave"].includes(rec.status)
          ? rec.status
          : "Present";

        return db.attendanceRecord.upsert({
          where: {
            institute_id_student_id_class_id: {
              institute_id: institute.id,
              student_id: rec.student_id,
              class_id: classItem.id,
            },
          },
          update: {
            status: validStatus,
            remarks: rec.remarks?.trim() || null,
            marked_by_id: user.id,
            date: classDate,
          },
          create: {
            institute_id: institute.id,
            student_id: rec.student_id,
            class_id: classItem.id,
            course_id: classItem.course_id,
            batch_id: classItem.batch_id,
            marked_by_id: user.id,
            date: classDate,
            status: validStatus,
            class_type: classItem.class_type,
            remarks: rec.remarks?.trim() || null,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: upserted.length,
      records: upserted,
    });
  } catch (error: any) {
    console.error("POST Attendance API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

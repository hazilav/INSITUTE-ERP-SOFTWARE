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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const department = searchParams.get("department");

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Fetch active staff profiles
    const staffWhere: any = {
      institute_id: institute.id,
      status: { in: ["Active", "On Leave"] },
    };
    if (department && department !== "ALL") {
      staffWhere.department = department;
    }

    const staffMembers = await db.staffProfile.findMany({
      where: staffWhere,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { name: "asc" },
    });

    // Fetch attendance records for this date
    const attendanceRecords = await db.staffAttendance.findMany({
      where: {
        institute_id: institute.id,
        attendance_date: { gte: dayStart, lte: dayEnd },
      },
    });

    const attendanceMap = new Map(attendanceRecords.map((r) => [r.staff_id, r]));

    const combinedList = staffMembers.map((s) => {
      const rec = attendanceMap.get(s.id);
      return {
        staff_id: s.id,
        employee_id: s.employee_id,
        name: s.name,
        photo: s.photo,
        department: s.department,
        designation: s.designation,
        role: s.role,
        status: rec ? rec.status : "Not Marked",
        check_in: rec?.check_in || null,
        check_out: rec?.check_out || null,
        working_minutes: rec?.working_minutes || 0,
        notes: rec?.notes || "",
        attendance_id: rec?.id || null,
      };
    });

    // Summary Metrics
    const presentToday = combinedList.filter((c) => c.status === "Present").length;
    const lateToday = combinedList.filter((c) => c.status === "Late").length;
    const absentToday = combinedList.filter((c) => c.status === "Absent").length;
    const halfDayToday = combinedList.filter((c) => c.status === "Half Day").length;
    const onLeaveToday = combinedList.filter((c) => c.status === "Leave").length;

    return NextResponse.json({
      success: true,
      date: dayStart.toISOString().slice(0, 10),
      summary: {
        totalStaff: combinedList.length,
        presentToday,
        lateToday,
        absentToday,
        halfDayToday,
        onLeaveToday,
      },
      staffAttendanceList: combinedList,
      workingHours: {
        work_start_time: institute.work_start_time || "10:00",
        work_end_time: institute.work_end_time || "18:00",
        late_threshold_mins: institute.late_threshold_mins || 15,
        half_day_hours: institute.half_day_hours || 4.0,
      },
    });
  } catch (error: any) {
    console.error("GET Staff Attendance API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch staff attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can mark staff attendance." }, { status: 403 });
    }

    const body = await request.json();
    const { date, records } = body; // records: Array<{ staff_id, status, check_in, check_out, notes }>

    if (!date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "date and records array are required." }, { status: 400 });
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

    const results = [];
    for (const item of records) {
      if (!item.staff_id || !item.status) continue;

      let checkInDate = item.check_in ? new Date(item.check_in) : null;
      let checkOutDate = item.check_out ? new Date(item.check_out) : null;

      let workingMinutes: number | null = null;
      if (checkInDate && checkOutDate) {
        const diffMs = checkOutDate.getTime() - checkInDate.getTime();
        workingMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      }

      const rec = await db.staffAttendance.upsert({
        where: {
          institute_id_staff_id_attendance_date: {
            institute_id: institute.id,
            staff_id: item.staff_id,
            attendance_date: dayStart,
          },
        },
        update: {
          status: item.status,
          check_in: checkInDate,
          check_out: checkOutDate,
          working_minutes: workingMinutes,
          notes: item.notes?.trim() || null,
          marked_by_id: user.id,
        },
        create: {
          institute_id: institute.id,
          staff_id: item.staff_id,
          attendance_date: dayStart,
          status: item.status,
          check_in: checkInDate,
          check_out: checkOutDate,
          working_minutes: workingMinutes,
          notes: item.notes?.trim() || null,
          marked_by_id: user.id,
        },
      });

      results.push(rec);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed attendance for ${results.length} staff member(s).`,
      count: results.length,
    });
  } catch (error: any) {
    console.error("POST Staff Attendance API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save staff attendance" }, { status: 500 });
  }
}

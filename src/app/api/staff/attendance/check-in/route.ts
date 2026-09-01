import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const staffProfile = await db.staffProfile.findUnique({
      where: { user_id: user.id },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: "No staff profile linked to your user account." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action = body.action; // "check_in" or "check_out"

    if (!action || (action !== "check_in" && action !== "check_out")) {
      return NextResponse.json({ error: "action must be 'check_in' or 'check_out'." }, { status: 400 });
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const existingAttendance = await db.staffAttendance.findUnique({
      where: {
        institute_id_staff_id_attendance_date: {
          institute_id: institute.id,
          staff_id: staffProfile.id,
          attendance_date: dayStart,
        },
      },
    });

    if (action === "check_in") {
      if (existingAttendance?.check_in) {
        return NextResponse.json({
          error: `You have already checked in today at ${new Date(existingAttendance.check_in).toLocaleTimeString()}.`,
        }, { status: 400 });
      }

      // Determine Present vs Late based on institute settings
      const workStartStr = institute.work_start_time || "10:00";
      const lateThresholdMins = institute.late_threshold_mins || 15;

      const [startHour, startMin] = workStartStr.split(":").map(Number);
      const thresholdTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin + lateThresholdMins, 0, 0);

      const calculatedStatus = now > thresholdTime ? "Late" : "Present";

      const updated = await db.staffAttendance.upsert({
        where: {
          institute_id_staff_id_attendance_date: {
            institute_id: institute.id,
            staff_id: staffProfile.id,
            attendance_date: dayStart,
          },
        },
        update: {
          check_in: now,
          status: calculatedStatus,
        },
        create: {
          institute_id: institute.id,
          staff_id: staffProfile.id,
          attendance_date: dayStart,
          check_in: now,
          status: calculatedStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Checked in successfully at ${now.toLocaleTimeString()}. Status: ${calculatedStatus}`,
        attendance: updated,
      });
    }

    // action === "check_out"
    if (!existingAttendance || !existingAttendance.check_in) {
      return NextResponse.json({ error: "You must check in before checking out." }, { status: 400 });
    }

    if (existingAttendance.check_out) {
      return NextResponse.json({
        error: `You have already checked out today at ${new Date(existingAttendance.check_out).toLocaleTimeString()}.`,
      }, { status: 400 });
    }

    const checkInDate = new Date(existingAttendance.check_in);
    const diffMs = now.getTime() - checkInDate.getTime();
    const workingMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    const halfDayHours = institute.half_day_hours || 4.0;
    const halfDayMins = halfDayHours * 60;

    let finalStatus = existingAttendance.status;
    if (workingMinutes < halfDayMins) {
      finalStatus = "Half Day";
    }

    const updated = await db.staffAttendance.update({
      where: { id: existingAttendance.id },
      data: {
        check_out: now,
        working_minutes: workingMinutes,
        status: finalStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Checked out successfully at ${now.toLocaleTimeString()}. Total working time: ${Math.floor(workingMinutes / 60)}h ${workingMinutes % 60}m. Status: ${finalStatus}`,
      attendance: updated,
    });
  } catch (error: any) {
    console.error("POST Self Check-In API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process self check-in" }, { status: 500 });
  }
}

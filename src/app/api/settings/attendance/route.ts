import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can update attendance settings." }, { status: 403 });
    }

    const body = await request.json();
    const { min_attendance_pct, allow_late_status, allow_leave_status } = body;

    const updated = await db.institute.update({
      where: { id: institute.id },
      data: {
        ...(min_attendance_pct !== undefined && { min_attendance_pct: parseFloat(min_attendance_pct) }),
        ...(allow_late_status !== undefined && { allow_late_status: Boolean(allow_late_status) }),
        ...(allow_leave_status !== undefined && { allow_leave_status: Boolean(allow_leave_status) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance settings updated successfully.",
      institute: updated,
    });
  } catch (error: any) {
    console.error("PUT Attendance Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update attendance settings" }, { status: 500 });
  }
}

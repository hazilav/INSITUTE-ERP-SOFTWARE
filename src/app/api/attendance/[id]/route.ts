import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingRecord = await db.attendanceRecord.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, remarks } = body;

    const validStatus = ["Present", "Absent", "Late", "Leave"].includes(status)
      ? status
      : existingRecord.status;

    const updatedRecord = await db.attendanceRecord.update({
      where: { id: params.id },
      data: {
        status: validStatus,
        remarks: remarks !== undefined ? (remarks ? remarks.trim() : null) : existingRecord.remarks,
        marked_by_id: user.id,
      },
    });

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error("PATCH Attendance Record API Error:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 }
    );
  }
}

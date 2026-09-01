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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const leave = await db.leaveRequest.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: { staff: true },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, rejection_reason } = body; // "approve", "reject", "cancel"

    if (!action) {
      return NextResponse.json({ error: "action is required ('approve', 'reject', 'cancel')." }, { status: 400 });
    }

    if (action === "cancel") {
      // Check if user owns this leave request
      const staffProfile = await db.staffProfile.findUnique({ where: { user_id: user.id } });
      if (user.role !== "OWNER" && user.role !== "ADMIN" && staffProfile?.id !== leave.staff_id) {
        return NextResponse.json({ error: "Forbidden: You can only cancel your own leave requests." }, { status: 403 });
      }

      if (leave.status !== "Pending") {
        return NextResponse.json({ error: "Only Pending leave requests can be cancelled." }, { status: 400 });
      }

      const updated = await db.leaveRequest.update({
        where: { id: leave.id },
        data: { status: "Cancelled" },
      });

      return NextResponse.json({
        success: true,
        message: "Leave request cancelled.",
        leave: updated,
      });
    }

    // Approve / Reject require OWNER or ADMIN
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can approve/reject leave requests." }, { status: 403 });
    }

    // Security check: Staff cannot approve their own leave request
    const staffProfile = await db.staffProfile.findUnique({ where: { user_id: user.id } });
    if (staffProfile && staffProfile.id === leave.staff_id) {
      return NextResponse.json({ error: "Security Restriction: You cannot approve or reject your own leave request." }, { status: 403 });
    }

    if (action === "reject") {
      if (!rejection_reason || !rejection_reason.trim()) {
        return NextResponse.json({ error: "A rejection reason is required when rejecting a leave request." }, { status: 400 });
      }

      const updated = await db.leaveRequest.update({
        where: { id: leave.id },
        data: {
          status: "Rejected",
          reviewed_by_id: user.id,
          reviewed_at: new Date(),
          rejection_reason: rejection_reason.trim(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Leave request rejected.",
        leave: updated,
      });
    }

    if (action === "approve") {
      const updatedLeave = await db.$transaction(async (tx) => {
        // 1. Update LeaveRequest status
        const updated = await tx.leaveRequest.update({
          where: { id: leave.id },
          data: {
            status: "Approved",
            reviewed_by_id: user.id,
            reviewed_at: new Date(),
          },
        });

        // 2. Auto-generate/update StaffAttendance records with status "Leave" for each day in range
        const curr = new Date(leave.start_date);
        const end = new Date(leave.end_date);

        while (curr <= end) {
          const dayStart = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0);

          await tx.staffAttendance.upsert({
            where: {
              institute_id_staff_id_attendance_date: {
                institute_id: institute.id,
                staff_id: leave.staff_id,
                attendance_date: dayStart,
              },
            },
            update: {
              status: "Leave",
              notes: `Approved Leave: ${leave.leave_type}`,
              marked_by_id: user.id,
            },
            create: {
              institute_id: institute.id,
              staff_id: leave.staff_id,
              attendance_date: dayStart,
              status: "Leave",
              notes: `Approved Leave: ${leave.leave_type}`,
              marked_by_id: user.id,
            },
          });

          curr.setDate(curr.getDate() + 1);
        }

        // 3. Update staff status to "On Leave" if leave is active today
        const now = new Date();
        if (leave.start_date <= now && leave.end_date >= now) {
          await tx.staffProfile.update({
            where: { id: leave.staff_id },
            data: { status: "On Leave" },
          });
        }

        return updated;
      });

      return NextResponse.json({
        success: true,
        message: "Leave request approved. Staff attendance records updated to 'Leave'.",
        leave: updatedLeave,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Leave Request API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update leave request" }, { status: 500 });
  }
}

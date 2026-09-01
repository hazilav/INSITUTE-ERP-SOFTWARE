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

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      const staffProfile = await db.staffProfile.findUnique({
        where: { user_id: user.id },
      });
      if (!staffProfile) return NextResponse.json({ success: true, leaves: [] });
      whereCondition.staff_id = staffProfile.id;
    }

    const leaves = await db.leaveRequest.findMany({
      where: whereCondition,
      include: {
        staff: {
          select: { id: true, employee_id: true, name: true, department: true, designation: true, role: true },
        },
        reviewed_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const pendingCount = leaves.filter((l) => l.status === "Pending").length;
    const approvedCount = leaves.filter((l) => l.status === "Approved").length;
    const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;

    return NextResponse.json({
      success: true,
      summary: {
        total: leaves.length,
        pendingCount,
        approvedCount,
        rejectedCount,
      },
      leaves,
    });
  } catch (error: any) {
    console.error("GET Leave Requests API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch leave requests" }, { status: 500 });
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
    const { leave_type, start_date, end_date, reason, attachment_url } = body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json(
        { error: "leave_type, start_date, end_date, and reason are required fields." },
        { status: 400 }
      );
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return NextResponse.json({ error: "end_date cannot be before start_date." }, { status: 400 });
    }

    const diffMs = end.getTime() - start.getTime();
    const daysCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const leave = await db.leaveRequest.create({
      data: {
        institute_id: institute.id,
        staff_id: staffProfile.id,
        leave_type,
        start_date: start,
        end_date: end,
        days_count: daysCount,
        reason: reason.trim(),
        attachment_url: attachment_url?.trim() || null,
        status: "Pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Leave request submitted successfully.",
      leave,
    });
  } catch (error: any) {
    console.error("POST Submit Leave Request API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit leave request" }, { status: 500 });
  }
}

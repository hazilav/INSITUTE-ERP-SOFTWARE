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

    const activeStaff = await db.staffProfile.findMany({
      where: { institute_id: institute.id },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    const activeStaffCount = activeStaff.filter((s) => s.status === "Active").length;
    const totalMentors = activeStaff.filter((s) => s.role === "MENTOR").length;

    // Student Tasks Summary
    const studentTasks = await db.studentTask.findMany({
      where: { institute_id: institute.id },
    });

    const now = new Date();
    const totalTasks = studentTasks.length;
    const completedTasks = studentTasks.filter((t) => t.status === "Completed").length;
    const pendingTasks = studentTasks.filter((t) => t.status === "Pending").length;
    const inProgressTasks = studentTasks.filter((t) => t.status === "In Progress").length;
    const overdueTasks = studentTasks.filter(
      (t) => t.status !== "Completed" && t.due_date && new Date(t.due_date) < now
    ).length;

    const completionRate =
      totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) + "%" : "0.0%";

    // Staff Performance Workload Breakdown
    const staffPerformanceTable = activeStaff.map((staff) => {
      return {
        id: staff.id,
        employee_id: staff.employee_id,
        name: staff.name,
        role: staff.role,
        department: staff.department,
        designation: staff.designation,
        status: staff.status,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        activeStaffCount,
        totalMentors,
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
      },
      staffPerformanceTable,
    });
  } catch (error: any) {
    console.error("GET Staff & Tasks Report API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch staff report" }, { status: 500 });
  }
}

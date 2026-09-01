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
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can update notification settings." }, { status: 403 });
    }

    const body = await request.json();
    const { notify_academic, notify_attendance, notify_fees, notify_tasks, notify_system } = body;

    const updated = await db.institute.update({
      where: { id: institute.id },
      data: {
        ...(notify_academic !== undefined && { notify_academic: Boolean(notify_academic) }),
        ...(notify_attendance !== undefined && { notify_attendance: Boolean(notify_attendance) }),
        ...(notify_fees !== undefined && { notify_fees: Boolean(notify_fees) }),
        ...(notify_tasks !== undefined && { notify_tasks: Boolean(notify_tasks) }),
        ...(notify_system !== undefined && { notify_system: Boolean(notify_system) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification settings updated successfully.",
      institute: updated,
    });
  } catch (error: any) {
    console.error("PUT Notification Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update notification settings" }, { status: 500 });
  }
}

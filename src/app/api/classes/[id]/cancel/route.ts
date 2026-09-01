import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can cancel classes." }, { status: 403 });
    }

    const classItem = await db.class.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!classItem) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const body = await request.json();
    const { cancellation_reason } = body;

    if (!cancellation_reason || !cancellation_reason.trim()) {
      return NextResponse.json({ error: "A cancellation reason is required." }, { status: 400 });
    }

    const updated = await db.class.update({
      where: { id: classItem.id },
      data: {
        status: "Cancelled",
        cancellation_reason: cancellation_reason.trim(),
      },
    });

    // Save Audit Entry
    await db.classAuditHistory.create({
      data: {
        institute_id: institute.id,
        class_id: classItem.id,
        user_id: user.id,
        action: "Cancelled",
        previous_values: JSON.stringify({ status: classItem.status }),
        new_values: JSON.stringify({ status: "Cancelled", cancellation_reason: cancellation_reason.trim() }),
      },
    });

    // Notify Batch Students & Mentor
    const batchStudents = await db.student.findMany({
      where: { institute_id: institute.id, batch_id: classItem.batch_id, status: "Active" },
      select: { user_id: true },
    });

    const notifPromises = [];
    for (const s of batchStudents) {
      if (!s.user_id) continue;
      notifPromises.push(
        db.notification.create({
          data: {
            institute_id: institute.id,
            recipient_user_id: s.user_id,
            type: "CLASS",
            category: "Academic",
            title: "Class Cancelled",
            message: `Class "${classItem.title}" scheduled for ${new Date(classItem.date).toLocaleDateString()} has been cancelled. Reason: ${cancellation_reason.trim()}`,
            priority: "URGENT",
            related_entity_type: "CLASS",
            related_entity_id: classItem.id,
            action_url: "/student/classes",
          },
        })
      );
    }

    if (classItem.mentor_id) {
      notifPromises.push(
        db.notification.create({
          data: {
            institute_id: institute.id,
            recipient_user_id: classItem.mentor_id,
            type: "CLASS",
            category: "Academic",
            title: "Class Cancelled",
            message: `Class "${classItem.title}" assigned to you for ${new Date(classItem.date).toLocaleDateString()} has been cancelled.`,
            priority: "URGENT",
            related_entity_type: "CLASS",
            related_entity_id: classItem.id,
            action_url: "/dashboard/classes",
          },
        })
      );
    }

    await Promise.allSettled(notifPromises);

    return NextResponse.json({
      success: true,
      message: "Class cancelled successfully.",
      class: updated,
    });
  } catch (error: any) {
    console.error("POST Cancel Class API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel class" }, { status: 500 });
  }
}

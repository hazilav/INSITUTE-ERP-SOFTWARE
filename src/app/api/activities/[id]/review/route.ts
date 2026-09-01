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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await db.activity.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const body = await request.json();
    const { submission_id, student_id, obtained_marks, feedback, status } = body;

    if (!submission_id && !student_id) {
      return NextResponse.json(
        { error: "submission_id or student_id is required." },
        { status: 400 }
      );
    }

    const submission = await db.activitySubmission.findFirst({
      where: submission_id
        ? { id: submission_id, institute_id: institute.id, activity_id: activity.id }
        : { student_id, institute_id: institute.id, activity_id: activity.id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission record not found" }, { status: 404 });
    }

    const validStatus = ["Reviewed", "Needs Revision", "Under Review"].includes(status)
      ? status
      : "Reviewed";

    const parsedMarks = obtained_marks !== undefined && obtained_marks !== null && obtained_marks !== ""
      ? parseFloat(obtained_marks)
      : null;

    const updatedSubmission = await db.activitySubmission.update({
      where: { id: submission.id },
      data: {
        obtained_marks: parsedMarks,
        feedback: feedback?.trim() || null,
        status: validStatus,
        reviewed_by_id: user.id,
        reviewed_at: new Date(),
      },
    });

    const studentItem = await db.student.findUnique({
      where: { id: submission.student_id },
      select: { user_id: true },
    });

    if (studentItem?.user_id) {
      const { createNotification } = await import("@/lib/notifications");
      await createNotification({
        institute_id: institute.id,
        recipient_user_id: studentItem.user_id,
        type: "Academic",
        category: "Activity reviewed",
        title: `Activity Reviewed: ${activity.title}`,
        message: `Your coursework submission for "${activity.title}" has been reviewed. Score: ${parsedMarks !== null ? `${parsedMarks}/${activity.maximum_marks}` : "Evaluated"}.`,
        priority: "Normal",
        related_entity_type: "activity",
        related_entity_id: activity.id,
        action_url: `/student/activities/${activity.id}`,
        event_key: `review_${submission.id}_${validStatus}`,
      });
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
    });
  } catch (error: any) {
    console.error("POST Review API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save submission review" },
      { status: 500 }
    );
  }
}

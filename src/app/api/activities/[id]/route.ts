import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    const activity = await db.activity.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        mentor: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Student privacy guard
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || student.batch_id !== activity.batch_id || activity.status !== "Published") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Fetch student's own submission only
      const submission = await db.activitySubmission.findFirst({
        where: {
          institute_id: institute.id,
          activity_id: activity.id,
          student_id: student.id,
        },
      });

      return NextResponse.json({
        success: true,
        activity,
        student,
        submission,
      });
    }

    // Staff/Owner/Mentor: Fetch complete batch roster and merge submissions
    const students = await db.student.findMany({
      where: {
        institute_id: institute.id,
        batch_id: activity.batch_id,
        is_archived: false,
      },
      select: {
        id: true,
        student_code: true,
        name: true,
        phone: true,
        email: true,
        photo: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    const submissions = await db.activitySubmission.findMany({
      where: {
        institute_id: institute.id,
        activity_id: activity.id,
      },
      include: {
        reviewed_by: { select: { id: true, name: true } },
      },
    });

    const submissionMap = new Map();
    submissions.forEach((s) => submissionMap.set(s.student_id, s));

    const roster = students.map((st) => {
      const sub = submissionMap.get(st.id);
      return {
        student: st,
        submission: sub || null,
        status: sub ? sub.status : "Not Submitted",
      };
    });

    return NextResponse.json({
      success: true,
      activity,
      roster,
    });
  } catch (error) {
    console.error("GET Activity Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity details" },
      { status: 500 }
    );
  }
}

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

    const existingActivity = await db.activity.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingActivity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      module_name,
      mentor_id,
      activity_type,
      submission_type,
      assigned_date,
      due_date,
      maximum_marks,
      grading_required,
      status,
    } = body;

    const updatedActivity = await db.activity.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title.trim() : existingActivity.title,
        description: description !== undefined ? (description ? description.trim() : null) : existingActivity.description,
        module_name: module_name !== undefined ? (module_name ? module_name.trim() : null) : existingActivity.module_name,
        mentor_id: mentor_id !== undefined ? mentor_id : existingActivity.mentor_id,
        activity_type: activity_type || existingActivity.activity_type,
        submission_type: submission_type || existingActivity.submission_type,
        assigned_date: assigned_date ? new Date(assigned_date) : existingActivity.assigned_date,
        due_date: due_date ? new Date(due_date) : existingActivity.due_date,
        maximum_marks: maximum_marks !== undefined ? parseFloat(maximum_marks) : existingActivity.maximum_marks,
        grading_required: grading_required !== undefined ? grading_required : existingActivity.grading_required,
        status: status || existingActivity.status,
      },
    });

    return NextResponse.json({
      success: true,
      activity: updatedActivity,
    });
  } catch (error) {
    console.error("PATCH Activity API Error:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await db.activity.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Activity deleted" });
  } catch (error) {
    console.error("DELETE Activity API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}

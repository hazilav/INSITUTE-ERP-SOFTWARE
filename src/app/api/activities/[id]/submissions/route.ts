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

    const activity = await db.activity.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      student_id,
      submission_type,
      submission_text,
      file_url,
      file_name,
      notes,
    } = body;

    // Resolve target student ID
    let targetStudentId = student_id;
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || student.batch_id !== activity.batch_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      targetStudentId = student.id;
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 });
    }

    const studentRec = await db.student.findFirst({
      where: { id: targetStudentId, institute_id: institute.id },
    });

    if (!studentRec) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const now = new Date();
    const isLate = now > new Date(activity.due_date);
    const initialStatus = isLate ? "Late" : "Submitted";

    // Upsert Submission Record
    const submission = await db.activitySubmission.upsert({
      where: {
        institute_id_activity_id_student_id: {
          institute_id: institute.id,
          activity_id: activity.id,
          student_id: targetStudentId,
        },
      },
      update: {
        submission_type: submission_type || "online",
        submission_text: submission_text?.trim() || null,
        file_url: file_url || null,
        file_name: file_name || null,
        notes: notes?.trim() || null,
        submitted_at: now,
        status: initialStatus,
      },
      create: {
        institute_id: institute.id,
        activity_id: activity.id,
        student_id: targetStudentId,
        submission_type: submission_type || "online",
        submission_text: submission_text?.trim() || null,
        file_url: file_url || null,
        file_name: file_name || null,
        notes: notes?.trim() || null,
        submitted_at: now,
        status: initialStatus,
      },
    });

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error: any) {
    console.error("POST Activity Submission API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit activity" },
      { status: 500 }
    );
  }
}

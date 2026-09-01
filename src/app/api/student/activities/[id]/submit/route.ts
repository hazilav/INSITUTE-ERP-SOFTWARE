import { NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentContext = await getAuthenticatedStudent();

    if (!studentContext) {
      return NextResponse.json({ error: "Unauthorized: Access Denied" }, { status: 403 });
    }

    const { student, institute } = studentContext;
    const body = await request.json();
    const { submission_text, file_url, file_name } = body;

    const activity = await db.activity.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const now = new Date();
    const isLate = now > activity.due_date;
    const status = isLate ? "Late" : "Submitted";

    const submission = await db.activitySubmission.upsert({
      where: {
        institute_id_activity_id_student_id: {
          institute_id: institute.id,
          activity_id: activity.id,
          student_id: student.id,
        },
      },
      update: {
        submission_text: submission_text?.trim() || null,
        file_url: file_url?.trim() || null,
        file_name: file_name?.trim() || null,
        submitted_at: now,
        status: status,
      },
      create: {
        institute_id: institute.id,
        activity_id: activity.id,
        student_id: student.id,
        submission_type: file_url ? "online" : "online",
        submission_text: submission_text?.trim() || null,
        file_url: file_url?.trim() || null,
        file_name: file_name?.trim() || null,
        submitted_at: now,
        status: status,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    console.error("POST Student Activity Submission API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit activity" },
      { status: 500 }
    );
  }
}

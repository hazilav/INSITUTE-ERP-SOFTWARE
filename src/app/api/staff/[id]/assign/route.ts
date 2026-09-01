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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staffProfile = await db.staffProfile.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!staffProfile || !staffProfile.user_id) {
      return NextResponse.json(
        { error: "Staff member must have an active user account to be assigned as a mentor." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { batch_id, course_id, action } = body; // action: 'assign' | 'unassign'

    if (!batch_id) {
      return NextResponse.json({ error: "batch_id is required." }, { status: 400 });
    }

    const batch = await db.batch.findFirst({
      where: { id: batch_id, institute_id: institute.id },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found for your institute." }, { status: 404 });
    }

    if (action === "unassign") {
      await db.$transaction(async (tx) => {
        if (batch.primary_mentor_id === staffProfile.user_id) {
          await tx.batch.update({
            where: { id: batch.id },
            data: { primary_mentor_id: null },
          });
        }

        await tx.mentorAssignment.deleteMany({
          where: {
            institute_id: institute.id,
            mentor_id: staffProfile.user_id!,
            batch_id: batch.id,
          },
        });
      });

      return NextResponse.json({ success: true, message: "Mentor unassigned successfully." });
    }

    // Assign Mentor
    await db.$transaction(async (tx) => {
      await tx.batch.update({
        where: { id: batch.id },
        data: { primary_mentor_id: staffProfile.user_id },
      });

      await tx.mentorAssignment.upsert({
        where: {
          id: `${institute.id}-${staffProfile.user_id}-${batch.id}`,
        },
        update: {
          assignment_type: "primary_mentor",
        },
        create: {
          id: `${institute.id}-${staffProfile.user_id}-${batch.id}`,
          institute_id: institute.id,
          mentor_id: staffProfile.user_id!,
          course_id: course_id || batch.course_id,
          batch_id: batch.id,
          assignment_type: "primary_mentor",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Mentor assigned to batch successfully.",
    });
  } catch (error: any) {
    console.error("POST Staff Assign API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign mentor" },
      { status: 500 }
    );
  }
}

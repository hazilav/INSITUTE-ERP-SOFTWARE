import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUserManageStudentFreeze } from "@/lib/permissions";

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

    // Check staff permissions if not OWNER or ADMIN
    let staffPermissions: string | null = null;
    if (user.role === "STAFF" || user.role === "MENTOR") {
      const staffProfile = await db.staffProfile.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { permissions: true },
      });
      staffPermissions = staffProfile?.permissions || null;
    }

    const body = await request.json().catch(() => ({}));
    const action: "freeze" | "unfreeze" = body.action === "unfreeze" ? "unfreeze" : "freeze";
    const reason: string = typeof body.reason === "string" ? body.reason.trim() : "";

    const allowed = canUserManageStudentFreeze({
      role: user.role,
      staffPermissions,
      action,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: `Forbidden. You do not have permission to ${action} students.` },
        { status: 403 }
      );
    }

    // Verify student belongs to this institute
    const student = await db.student.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    if (action === "freeze") {
      // 1. Update Student status and freeze details
      const updatedStudent = await db.student.update({
        where: { id: student.id },
        data: {
          status: "FROZEN",
          freeze_reason: reason || null,
          frozen_at: new Date(),
          frozen_by: user.name,
        },
      });

      // 2. Update linked User account and invalidate all existing active sessions
      if (student.user_id) {
        await Promise.all([
          db.user.update({
            where: { id: student.user_id },
            data: { status: "INACTIVE" },
          }),
          db.session.deleteMany({
            where: { user_id: student.user_id },
          }),
        ]);
      }

      // 3. Create Audit Record in StudentActivity
      await db.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id: student.id,
          action: "Student Frozen",
          performed_by: `${user.name} (${user.role})`,
          details: reason
            ? `Reason: ${reason}`
            : "Account temporarily frozen by administrator. Historical data preserved.",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Student '${student.name}' (${student.student_code}) has been temporarily frozen.`,
        student: updatedStudent,
      });
    } else {
      // Unfreeze / Reactivate Student
      // Requirement 6: Preserve historical freeze information while setting status back to ACTIVE
      const updatedStudent = await db.student.update({
        where: { id: student.id },
        data: {
          status: "ACTIVE",
        },
      });

      // Restore linked User account status to ACTIVE
      if (student.user_id) {
        await db.user.update({
          where: { id: student.user_id },
          data: { status: "ACTIVE" },
        });
      }

      // Create Audit Record in StudentActivity
      await db.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id: student.id,
          action: "Student Reactivated",
          performed_by: `${user.name} (${user.role})`,
          details: "Account restored to ACTIVE status by administrator.",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Student '${student.name}' (${student.student_code}) has been reactivated.`,
        student: updatedStudent,
      });
    }
  } catch (error: any) {
    console.error("Student Freeze API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process student freeze/unfreeze action." },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can update student portal settings." }, { status: 403 });
    }

    const body = await request.json();
    const {
      portal_enabled,
      student_login_enabled,
      require_first_login_pwd_change,
      student_id_prefix,
      student_id_start,
    } = body;

    const updated = await db.institute.update({
      where: { id: institute.id },
      data: {
        ...(portal_enabled !== undefined && { portal_enabled: Boolean(portal_enabled) }),
        ...(student_login_enabled !== undefined && { student_login_enabled: Boolean(student_login_enabled) }),
        ...(require_first_login_pwd_change !== undefined && { require_first_login_pwd_change: Boolean(require_first_login_pwd_change) }),
        ...(student_id_prefix && { student_id_prefix: student_id_prefix.trim().toUpperCase() }),
        ...(student_id_start !== undefined && { student_id_start: parseInt(student_id_start) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student portal & ID settings updated successfully.",
      institute: updated,
    });
  } catch (error: any) {
    console.error("PUT Student Portal Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update student portal settings" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const student = await db.student.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: { user: true },
    });

    if (!student || !student.user) {
      return NextResponse.json({ error: "Student user account not found" }, { status: 404 });
    }

    const newStatus = student.user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    await db.user.update({
      where: { id: student.user.id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      message: `Student portal access updated to '${newStatus}'. Historical records preserved.`,
      status: newStatus,
    });
  } catch (error: any) {
    console.error("Toggle Student Portal API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle portal access" }, { status: 500 });
  }
}

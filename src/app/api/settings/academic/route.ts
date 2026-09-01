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
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can update academic settings." }, { status: 403 });
    }

    const body = await request.json();
    const { passing_percentage, grade_system, academic_year, default_class_duration } = body;

    const updated = await db.institute.update({
      where: { id: institute.id },
      data: {
        ...(passing_percentage !== undefined && { passing_percentage: parseFloat(passing_percentage) }),
        ...(grade_system !== undefined && { grade_system }),
        ...(academic_year !== undefined && { academic_year }),
        ...(default_class_duration !== undefined && { default_class_duration: parseInt(default_class_duration) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Academic settings updated successfully.",
      institute: updated,
    });
  } catch (error: any) {
    console.error("PUT Academic Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update academic settings" }, { status: 500 });
  }
}

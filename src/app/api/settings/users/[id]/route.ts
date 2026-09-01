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
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can manage user statuses." }, { status: 403 });
    }

    // Prevent user from modifying their own account
    if (user.id === params.id) {
      return NextResponse.json({ error: "Forbidden: You cannot modify or deactivate your own account." }, { status: 403 });
    }

    const targetUser = await db.user.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json({ error: "Forbidden: Cannot modify or deactivate the Institute Owner account." }, { status: 403 });
    }

    const body = await request.json();
    const { status, role } = body;

    const dataToUpdate: any = {};
    if (status && ["Active", "Inactive"].includes(status)) {
      dataToUpdate.status = status;
    }

    if (role) {
      if (role === "OWNER") {
        return NextResponse.json({ error: "Forbidden: Cannot promote user to Owner." }, { status: 403 });
      }
      if (["ADMIN", "STAFF", "MENTOR"].includes(role)) {
        dataToUpdate.role = role;
      }
    }

    const updatedUser = await db.user.update({
      where: { id: targetUser.id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.name} updated successfully.`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("PATCH User Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

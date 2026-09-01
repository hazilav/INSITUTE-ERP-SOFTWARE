import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getStaffPortalUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

function generateTempPassword(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Owner/Admin can reset staff passwords." }, { status: 403 });
    }

    const staff = await db.staffProfile.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: { user: true },
    });

    if (!staff || !staff.user) {
      return NextResponse.json({ error: "Staff user account not found" }, { status: 404 });
    }

    const tempPassword = generateTempPassword(8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db.user.update({
      where: { id: staff.user.id },
      data: {
        password_hash: passwordHash,
        must_change_password: true,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Staff temporary password generated successfully.",
      credentials: {
        staff_name: staff.name,
        email: staff.user.email,
        role: staff.user.role,
        temp_password: tempPassword,
        portal_url: getStaffPortalUrl(institute.website),
      },
    });
  } catch (error: any) {
    console.error("Reset Staff Password API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset staff password" }, { status: 500 });
  }
}

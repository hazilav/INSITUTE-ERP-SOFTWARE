import { NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const studentContext = await getAuthenticatedStudent();
    if (!studentContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user } = studentContext;
    const body = await request.json();
    const { new_password, confirm_password } = body;

    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    if (new_password !== confirm_password) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    await db.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        must_change_password: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now use your new password.",
    });
  } catch (error: any) {
    console.error("Change Password API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update password" }, { status: 500 });
  }
}

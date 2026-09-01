import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden: Students cannot reset passwords." }, { status: 403 });
    }

    const student = await db.student.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    let customPassword = null;
    try {
      const body = await request.json();
      if (body && body.custom_password) {
        customPassword = String(body.custom_password).trim();
      }
    } catch (e) {
      // Body empty or invalid JSON, fallback to generated password
    }

    const tempPassword = customPassword || generateTempPassword(8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let studentUser = student.user;

    if (!studentUser) {
      // Create user account for student if doesn't exist
      studentUser = await db.user.create({
        data: {
          institute_id: institute.id,
          name: student.name,
          email: `${student.student_code.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.crm`,
          role: "STUDENT",
          password_hash: passwordHash,
          status: "ACTIVE",
          must_change_password: true,
        },
      });

      await db.student.update({
        where: { id: student.id },
        data: { user_id: studentUser.id },
      });
    } else {
      // Update existing user account
      await db.user.update({
        where: { id: studentUser.id },
        data: {
          password_hash: passwordHash,
          must_change_password: true,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Temporary password generated successfully.",
      credentials: {
        student_id: student.student_code,
        student_name: student.name,
        temp_password: tempPassword,
        portal_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student/login`,
      },
    });
  } catch (error: any) {
    console.error("Reset Student Password API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
  }
}

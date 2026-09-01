import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_code, password } = body;

    if (!student_code || !password) {
      return NextResponse.json(
        { error: "Student ID / Code and Password are required." },
        { status: 400 }
      );
    }

    const trimmedCode = student_code.trim();

    // 1. Find Student by Student Code (original & uppercase) or Email
    const student = await db.student.findFirst({
      where: {
        OR: [
          { student_code: trimmedCode },
          { student_code: trimmedCode.toUpperCase() },
          { email: trimmedCode.toLowerCase() },
        ],
        is_archived: false,
      },
      include: {
        user: true,
        institute: true,
        course: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    if (!student || !student.user) {
      return NextResponse.json(
        { error: "Invalid Student ID or password." },
        { status: 401 }
      );
    }

    // 2. Global Institute Portal Control Guard
    if (student.institute.portal_enabled === false || student.institute.student_login_enabled === false) {
      return NextResponse.json(
        { error: "Student portal login is currently disabled for your institute." },
        { status: 403 }
      );
    }

    // 3. Status & Deactivation Guard
    if (student.status === "ARCHIVED" || student.user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your student portal account has been deactivated. Please contact your institute administrator." },
        { status: 403 }
      );
    }

    // 3. Verify Password
    const isValid = await comparePassword(password, student.user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Student ID or password." },
        { status: 401 }
      );
    }

    // 4. Update Last Login Date & Create Session
    await db.user.update({
      where: { id: student.user.id },
      data: { last_login: new Date() },
    });

    await createSession(student.user.id);

    const redirectUrl = student.user.must_change_password
      ? "/student/change-password"
      : "/student/dashboard";

    return NextResponse.json({
      success: true,
      user: {
        id: student.user.id,
        name: student.name,
        role: "STUDENT",
        student_id: student.id,
        student_code: student.student_code,
        must_change_password: student.user.must_change_password,
      },
      redirectUrl,
    });
  } catch (error: any) {
    console.error("Student Login API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authenticate student" },
      { status: 500 }
    );
  }
}

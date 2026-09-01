import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email or Student ID and password are required" },
        { status: 400 }
      );
    }

    const cleanInput = email.trim().toLowerCase();

    // 1. Try finding User by email
    let user = await db.user.findFirst({
      where: { email: cleanInput },
      include: { institute: true },
    });

    // 2. If not found by email, try finding Student by Student Code
    if (!user) {
      const student = await db.student.findFirst({
        where: { student_code: email.trim(), is_archived: false },
        include: { user: { include: { institute: true } } },
      });

      if (student && student.user) {
        user = student.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email / Student ID or password" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is inactive. Please contact your Institute Admin." },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email / Student ID or password" },
        { status: 401 }
      );
    }

    // Create session token and set HTTP-only cookie
    await createSession(user.id);

    const isStudent = user.role === "STUDENT";
    let redirectUrl = isStudent ? "/student/dashboard" : "/dashboard";

    if (user.must_change_password) {
      redirectUrl = isStudent ? "/student/change-password" : "/dashboard/change-password";
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institute_id: user.institute_id,
        institute: {
          id: user.institute.id,
          name: user.institute.name,
          logo: user.institute.logo,
        },
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

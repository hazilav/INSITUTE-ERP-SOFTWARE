import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request payload. Please ensure all form fields are filled correctly." },
        { status: 400 }
      );
    }

    const {
      instituteName,
      logo,
      institutePhone,
      instituteEmail,
      address,
      name,
      email,
      phone,
      password,
      role: requestedRole,
    } = body;

    // Validation checks
    if (!instituteName || typeof instituteName !== "string" || !instituteName.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid Institute Name." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Please provide your Full Name." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid Email Address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanInstituteEmail = instituteEmail && typeof instituteEmail === "string" && instituteEmail.trim()
      ? instituteEmail.trim().toLowerCase()
      : cleanEmail;

    // Check if user email already exists
    const existingUser = await db.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `An account with the email '${cleanEmail}' already exists. Please sign in instead.` },
        { status: 400 }
      );
    }

    // Role Assignment: Institute creator is automatically assigned OWNER role
    let assignedRole: "OWNER" | "ADMIN" | "STAFF" | "MENTOR" | "STUDENT" = "OWNER";
    if (requestedRole && requestedRole !== "OWNER") {
      assignedRole = requestedRole;
    }

    const hashedPassword = await hashPassword(password);

    // Atomically create Institute and Owner User
    const result = await db.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          name: instituteName.trim(),
          logo: logo && typeof logo === "string" && logo.trim() ? logo.trim() : null,
          phone: institutePhone && typeof institutePhone === "string" && institutePhone.trim() ? institutePhone.trim() : null,
          email: cleanInstituteEmail,
          address: address && typeof address === "string" && address.trim() ? address.trim() : null,
        },
      });

      const user = await tx.user.create({
        data: {
          institute_id: institute.id,
          name: name.trim(),
          email: cleanEmail,
          phone: phone && typeof phone === "string" && phone.trim() ? phone.trim() : null,
          password_hash: hashedPassword,
          role: assignedRole,
          status: "ACTIVE",
        },
      });

      return { institute, user };
    });

    // Create session and set cookie
    try {
      await createSession(result.user.id);
    } catch (sessionErr: any) {
      console.warn("Session cookie creation warning during registration:", sessionErr?.message || sessionErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        institute_id: result.institute.id,
        institute: result.institute,
      },
    });
  } catch (error: any) {
    console.error("Registration error exception:", error);
    const errorMessage = error?.message || "An error occurred during institute registration";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

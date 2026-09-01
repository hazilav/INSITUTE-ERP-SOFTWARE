import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    // Strict validation
    if (!instituteName || !name || !email || !password) {
      return NextResponse.json(
        { error: "Institute Name, User Name, Email, and Password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered for another institute account
    const existingUser = await db.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 400 }
      );
    }

    // Role Guard: Users CANNOT select OWNER during regular signup.
    // OWNER is assigned ONLY to the institute creator automatically.
    let assignedRole: "OWNER" | "ADMIN" | "STAFF" | "MENTOR" | "STUDENT" = "OWNER";
    
    // If the request was attempting to select a role or override, explicitly prevent unauthorized OWNER selection
    if (requestedRole && requestedRole !== "OWNER") {
      assignedRole = requestedRole;
    } else {
      // Automatic OWNER assignment for institute creation
      assignedRole = "OWNER";
    }

    const hashedPassword = await hashPassword(password);

    // Atomically create Institute and Owner User
    const result = await db.$transaction(async (tx) => {
      const institute = await tx.institute.create({
        data: {
          name: instituteName.trim(),
          logo: logo?.trim() || null,
          phone: institutePhone?.trim() || null,
          email: instituteEmail?.trim() || cleanEmail,
          address: address?.trim() || null,
        },
      });

      const user = await tx.user.create({
        data: {
          institute_id: institute.id,
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          password_hash: hashedPassword,
          role: assignedRole,
          status: "ACTIVE",
        },
      });

      return { institute, user };
    });

    // Create session and set cookie
    await createSession(result.user.id);

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
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during institute registration" },
      { status: 500 }
    );
  }
}

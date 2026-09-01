import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await db.user.findMany({
      where: { institute_id: authContext.institute.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can create user accounts." }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, role, password } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: "Name, email, role, and password are required." }, { status: 400 });
    }

    // Security Rule: Block creating secondary Owner accounts
    if (role === "OWNER") {
      return NextResponse.json({ error: "Forbidden: Cannot create secondary Owner accounts. First institute creator remains the sole Owner." }, { status: 403 });
    }

    if (!["ADMIN", "STAFF", "MENTOR"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    const existingUser = await db.user.findFirst({
      where: { institute_id: institute.id, email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists in this institute." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        institute_id: institute.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        role,
        password_hash: passwordHash,
        status: "Active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${newUser.name} (${newUser.role}) created successfully.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error("POST Create User Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

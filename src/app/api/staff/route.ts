import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateEmployeeId } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const roleFilter = searchParams.get("role") || "ALL";
    const deptFilter = searchParams.get("department") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (roleFilter !== "ALL") whereCondition.role = roleFilter;
    if (deptFilter !== "ALL") whereCondition.department = deptFilter;
    if (statusFilter !== "ALL") whereCondition.status = statusFilter;

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { employee_id: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const staffProfiles = await db.staffProfile.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            last_login: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Compute Overall Institute Staff Metrics
    const totalStaff = await db.staffProfile.count({
      where: { institute_id: institute.id },
    });

    const activeStaff = await db.staffProfile.count({
      where: { institute_id: institute.id, status: "Active" },
    });

    const mentorsCount = await db.staffProfile.count({
      where: { institute_id: institute.id, role: "MENTOR" },
    });

    const adminsCount = await db.staffProfile.count({
      where: { institute_id: institute.id, role: "ADMIN" },
    });

    const inactiveStaff = await db.staffProfile.count({
      where: { institute_id: institute.id, status: { in: ["Inactive", "Resigned"] } },
    });

    return NextResponse.json({
      success: true,
      staff: staffProfiles,
      metrics: {
        total: totalStaff,
        active: activeStaff,
        mentors: mentorsCount,
        admins: adminsCount,
        inactive: inactiveStaff,
      },
    });
  } catch (error) {
    console.error("GET Staff API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff records" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only OWNER or ADMIN can add staff members." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      photo,
      phone,
      email,
      address,
      dob,
      joining_date,
      department,
      designation,
      role, // ADMIN, STAFF, MENTOR
      create_login,
    } = body;

    if (!name || !phone || !role) {
      return NextResponse.json(
        { error: "name, phone, and role are required fields." },
        { status: 400 }
      );
    }

    // OWNER Protection Guard: Cannot create OWNER from staff management
    if (role.toUpperCase() === "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: The Institute OWNER role is protected and cannot be assigned to staff." },
        { status: 403 }
      );
    }

    const empId = body.employee_id?.trim() || generateEmployeeId("EMP");
    const formattedRole = role.toUpperCase();

    let createdUserId: string | null = null;
    let temporaryPassword: string | null = null;

    // Optional Login Account Creation
    if (create_login && email) {
      const existingUser = await db.user.findFirst({
        where: { institute_id: institute.id, email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "A user account with this email already exists in your institute." },
          { status: 400 }
        );
      }

      // Generate random 8-character temporary password
      temporaryPassword = Math.random().toString(36).slice(-8) + "1A!";
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      const newUser = await db.user.create({
        data: {
          institute_id: institute.id,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          password_hash: passwordHash,
          role: formattedRole,
          status: "ACTIVE",
        },
      });

      createdUserId = newUser.id;
    }

    // Create Staff Profile
    const newStaffProfile = await db.staffProfile.create({
      data: {
        institute_id: institute.id,
        user_id: createdUserId,
        employee_id: empId,
        name: name.trim(),
        photo: photo?.trim() || null,
        phone: phone.trim(),
        email: email ? email.toLowerCase().trim() : null,
        address: address?.trim() || null,
        dob: dob ? new Date(dob) : null,
        joining_date: joining_date ? new Date(joining_date) : new Date(),
        department: department?.trim() || "Academics",
        designation: designation?.trim() || "Staff",
        role: formattedRole,
        status: "Active",
      },
      include: {
        user: { select: { id: true, email: true, status: true } },
      },
    });

    return NextResponse.json({
      success: true,
      staff: newStaffProfile,
      temporaryPassword, // Exposed once upon creation if login account was generated
    });
  } catch (error: any) {
    console.error("POST Staff API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create staff member" },
      { status: 500 }
    );
  }
}

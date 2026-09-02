import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateEmployeeId } from "@/lib/permissions";
import { getStaffPortalUrl } from "@/lib/urls";

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

    // Execute staff profiles query and metric counts in parallel
    const [
      staffProfiles,
      totalStaff,
      activeStaff,
      mentorsCount,
      adminsCount,
      inactiveStaff,
    ] = await Promise.all([
      db.staffProfile.findMany({
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
          assigned_course: { select: { id: true, name: true, code: true } },
          assigned_batch: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
        take: 100,
      }),
      db.staffProfile.count({
        where: { institute_id: institute.id },
      }),
      db.staffProfile.count({
        where: { institute_id: institute.id, status: "Active" },
      }),
      db.staffProfile.count({
        where: { institute_id: institute.id, role: "MENTOR" },
      }),
      db.staffProfile.count({
        where: { institute_id: institute.id, role: "ADMIN" },
      }),
      db.staffProfile.count({
        where: { institute_id: institute.id, status: { in: ["Inactive", "Resigned"] } },
      }),
    ]);

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
      portalUrl: getStaffPortalUrl(institute.website),
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
        { error: "Forbidden: Only OWNER or ADMIN can create staff members." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      employee_id,
      photo,
      phone,
      email,
      address,
      dob,
      joining_date,
      department,
      designation,
      role, // ADMIN, STAFF, MENTOR
      status, // Active, Inactive, On Leave, Resigned
      assigned_course_id,
      assigned_batch_id,
      permissions, // Array or comma-separated string of allowed modules
      create_login,
      custom_password,
    } = body;

    if (!name || !phone || !role) {
      return NextResponse.json(
        { error: "Name, phone number, and role are required." },
        { status: 400 }
      );
    }

    // OWNER Protection Guard
    if (role.toUpperCase() === "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: The Institute OWNER role is protected and cannot be assigned to staff." },
        { status: 403 }
      );
    }

    const empId = employee_id?.trim() || generateEmployeeId("STF");
    const formattedRole = role.toUpperCase();

    // Check duplicate employee_id in this institute
    const existingEmpId = await db.staffProfile.findFirst({
      where: { institute_id: institute.id, employee_id: empId },
    });

    if (existingEmpId) {
      return NextResponse.json(
        { error: `Staff ID "${empId}" is already in use in your institute. Please choose a unique ID.` },
        { status: 400 }
      );
    }

    let createdUserId: string | null = null;
    let temporaryPassword: string | null = null;

    const formattedPermissions = Array.isArray(permissions)
      ? permissions.join(",")
      : (permissions || "students,attendance,tasks,activities,notes,announcements");

    // Account Creation
    if (create_login) {
      const loginEmail = email ? email.toLowerCase().trim() : `${empId.toLowerCase()}@${institute.id.slice(0, 6)}.portal`;

      const existingUser = await db.user.findFirst({
        where: { institute_id: institute.id, email: loginEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: `A user account with login ID/email "${loginEmail}" already exists in your institute.` },
          { status: 400 }
        );
      }

      const passToUse = (custom_password && custom_password.trim()) || (Math.random().toString(36).slice(-8) + "1A!");
      temporaryPassword = passToUse;
      const passwordHash = await bcrypt.hash(passToUse, 10);

      const newUser = await db.user.create({
        data: {
          institute_id: institute.id,
          name: name.trim(),
          email: loginEmail,
          phone: phone.trim(),
          password_hash: passwordHash,
          role: formattedRole,
          status: status === "Inactive" ? "INACTIVE" : "ACTIVE",
        },
      });

      createdUserId = newUser.id;

      // If assigned_batch_id is provided and role is MENTOR, create MentorAssignment
      if (assigned_batch_id) {
        await db.mentorAssignment.create({
          data: {
            institute_id: institute.id,
            mentor_id: newUser.id,
            course_id: assigned_course_id || null,
            batch_id: assigned_batch_id,
            assignment_type: "primary_mentor",
          },
        });
      }
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
        designation: designation?.trim() || "Instructor",
        role: formattedRole,
        status: status || "Active",
        assigned_course_id: assigned_course_id || null,
        assigned_batch_id: assigned_batch_id || null,
        permissions: formattedPermissions,
      },
      include: {
        user: { select: { id: true, email: true, status: true } },
        assigned_course: { select: { id: true, name: true } },
        assigned_batch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      staff: newStaffProfile,
      credentials: temporaryPassword
        ? {
            name: name.trim(),
            employee_id: empId,
            email: email || empId,
            password: temporaryPassword,
            portal_url: getStaffPortalUrl(institute.website),
          }
        : null,
    });
  } catch (error: any) {
    console.error("POST Staff API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create staff member" },
      { status: 500 }
    );
  }
}

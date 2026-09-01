import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await db.staffProfile.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            last_login: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    let assignedBatches: any[] = [];
    let classesTaught: any[] = [];
    let activitiesCreated: any[] = [];
    let assessmentsEvaluated: any[] = [];

    if (staff.user_id) {
      // Fetch Primary Mentored Batches
      assignedBatches = await db.batch.findMany({
        where: { institute_id: institute.id, primary_mentor_id: staff.user_id, is_archived: false },
        include: { course: { select: { name: true } }, _count: { select: { students: true } } },
      });

      // Fetch Mentor Assignments
      const mentorAssignments = await db.mentorAssignment.findMany({
        where: { institute_id: institute.id, mentor_id: staff.user_id },
        include: { batch: { include: { course: { select: { name: true } } } } },
      });

      mentorAssignments.forEach((ma) => {
        if (ma.batch && !assignedBatches.some((b) => b.id === ma.batch_id)) {
          assignedBatches.push(ma.batch);
        }
      });

      // Fetch Classes Taught
      classesTaught = await db.class.findMany({
        where: { institute_id: institute.id, mentor_id: staff.user_id },
        include: { batch: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 10,
      });

      // Fetch Activities Mentored
      activitiesCreated = await db.activity.findMany({
        where: { institute_id: institute.id, mentor_id: staff.user_id },
        include: { batch: { select: { name: true } } },
        orderBy: { due_date: "desc" },
        take: 10,
      });

      // Fetch Assessments Mentored
      assessmentsEvaluated = await db.assessment.findMany({
        where: { institute_id: institute.id, mentor_id: staff.user_id },
        include: { batch: { select: { name: true } } },
        orderBy: { assessment_date: "desc" },
        take: 10,
      });
    }

    return NextResponse.json({
      success: true,
      staff,
      assignedBatches,
      classesTaught,
      activitiesCreated,
      assessmentsEvaluated,
    });
  } catch (error) {
    console.error("GET Staff Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingStaff = await db.staffProfile.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingStaff) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
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
      role,
      status, // Active, On Leave, Inactive, Resigned
    } = body;

    // OWNER Protection Guard
    if (role && role.toUpperCase() === "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Cannot assign OWNER role to staff." },
        { status: 403 }
      );
    }

    const formattedRole = role ? role.toUpperCase() : existingStaff.role;
    const newStatus = status || existingStaff.status;

    // Transaction to update StaffProfile and optional User status
    const updatedStaff = await db.$transaction(async (tx) => {
      const staffProfile = await tx.staffProfile.update({
        where: { id: params.id },
        data: {
          name: name !== undefined ? name.trim() : existingStaff.name,
          photo: photo !== undefined ? (photo ? photo.trim() : null) : existingStaff.photo,
          phone: phone !== undefined ? phone.trim() : existingStaff.phone,
          email: email !== undefined ? (email ? email.toLowerCase().trim() : null) : existingStaff.email,
          address: address !== undefined ? (address ? address.trim() : null) : existingStaff.address,
          dob: dob ? new Date(dob) : existingStaff.dob,
          joining_date: joining_date ? new Date(joining_date) : existingStaff.joining_date,
          department: department !== undefined ? department.trim() : existingStaff.department,
          designation: designation !== undefined ? designation.trim() : existingStaff.designation,
          role: formattedRole,
          status: newStatus,
        },
      });

      if (existingStaff.user_id) {
        const isInactiveStatus = ["Inactive", "Resigned"].includes(newStatus);
        await tx.user.update({
          where: { id: existingStaff.user_id },
          data: {
            role: formattedRole,
            status: isInactiveStatus ? "INACTIVE" : "ACTIVE",
          },
        });
      }

      return staffProfile;
    });

    return NextResponse.json({
      success: true,
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("PATCH Staff API Error:", error);
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await db.staffProfile.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    // Soft Delete / Deactivate staff preserving historical data
    await db.$transaction(async (tx) => {
      await tx.staffProfile.update({
        where: { id: params.id },
        data: { status: "Inactive" },
      });

      if (staff.user_id) {
        await tx.user.update({
          where: { id: staff.user_id },
          data: { status: "INACTIVE" },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Staff member account deactivated successfully.",
    });
  } catch (error) {
    console.error("DELETE Staff API Error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate staff member" },
      { status: 500 }
    );
  }
}

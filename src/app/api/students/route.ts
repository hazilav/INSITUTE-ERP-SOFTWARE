import { NextResponse } from "next/server";
import { getAuthenticatedUser, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Std#${pass}`;
}

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json(
        { error: "Access denied. Student accounts cannot access Student Data Center." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const mode = searchParams.get("mode") || "ALL";
    const includeArchived = searchParams.get("archived") === "true";

    const whereCondition: any = {
      institute_id: institute.id,
      is_archived: includeArchived ? true : false,
    };

    // SECTION 4: MENTOR STUDENT ISOLATION
    if (user.role === "MENTOR" || user.role === "STAFF") {
      const mentoredBatches = await db.batch.findMany({
        where: { institute_id: institute.id, primary_mentor_id: user.id, is_archived: false },
        select: { id: true },
      });
      const mentorAssignments = await db.mentorAssignment.findMany({
        where: { institute_id: institute.id, mentor_id: user.id },
        select: { batch_id: true },
      });
      const staffProfile = await db.staffProfile.findFirst({
        where: { institute_id: institute.id, user_id: user.id },
      });

      const assignedBatchIds = new Set<string>();
      mentoredBatches.forEach((b) => assignedBatchIds.add(b.id));
      mentorAssignments.forEach((ma) => {
        if (ma.batch_id) assignedBatchIds.add(ma.batch_id);
      });
      if (staffProfile?.assigned_batch_id) assignedBatchIds.add(staffProfile.assigned_batch_id);

      if (assignedBatchIds.size > 0) {
        whereCondition.batch_id = { in: Array.from(assignedBatchIds) };
      }
    }

    if (status !== "ALL") {
      whereCondition.status = status;
    }

    if (mode !== "ALL") {
      whereCondition.learning_mode = mode;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { student_code: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Pagination parameters
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const isAll = limitParam === "ALL";
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = isAll ? 500 : Math.min(100, Math.max(10, parseInt(limitParam || "50", 10) || 50));
    const skip = isAll ? 0 : (page - 1) * limit;

    // Run query, metrics grouping, and total count in parallel
    const [students, statusGroups, totalMatching, totalInstitute] = await Promise.all([
      db.student.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              must_change_password: true,
              updated_at: true,
            },
          },
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { created_at: "desc" },
        take: limit,
        skip,
      }),
      db.student.groupBy({
        by: ["status"],
        where: { institute_id: institute.id, is_archived: false },
        _count: { status: true },
      }),
      db.student.count({ where: whereCondition }),
      db.student.count({ where: { institute_id: institute.id, is_archived: false } }),
    ]);

    const statusMap = statusGroups.reduce((acc: Record<string, number>, g) => {
      acc[g.status] = g._count.status;
      return acc;
    }, {});

    const metrics = {
      total: totalInstitute,
      active: statusMap["ACTIVE"] || 0,
      onHold: statusMap["ON_HOLD"] || 0,
      completed: statusMap["COMPLETED"] || 0,
      atRisk: statusMap["DROPPED"] || 0,
    };

    const year = new Date().getFullYear();
    const count = totalInstitute + 1;
    const padded = String(count).padStart(5, "0");
    const suggestedCode = `INS-${year}-${padded}`;

    return NextResponse.json({
      success: true,
      students,
      metrics,
      suggestedCode,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.max(1, Math.ceil(totalMatching / limit)),
      },
    });
  } catch (error) {
    console.error("GET Students API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student records" },
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
        { error: "Forbidden. Only Owner or Admin can create student accounts." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      photo,
      phone,
      email,
      dob,
      gender,
      address,
      parent_name,
      parent_phone,
      learning_mode,
      status,
      course_id,
      batch_id,
      custom_student_code,
      create_login_account = true,
      custom_password,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Student Name and Phone are required." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim().toLowerCase() || null;
    const mode = ["offline", "online", "hybrid"].includes(learning_mode)
      ? learning_mode
      : institute.institute_mode || "hybrid";

    // Support admission_status mapping (ENROLLED -> ACTIVE, INQUIRY -> ON_HOLD)
    const rawStatus = body.admission_status || status;
    const mappedStatus =
      rawStatus === "INQUIRY"
        ? "ON_HOLD"
        : rawStatus === "ENROLLED"
        ? "ACTIVE"
        : rawStatus === "SUSPENDED"
        ? "DROPPED"
        : rawStatus;

    const studentStatus = ["ACTIVE", "ON_HOLD", "COMPLETED", "DROPPED"].includes(mappedStatus)
      ? mappedStatus
      : "ACTIVE";

    let validCourseId = null;
    if (course_id) {
      const c = await db.course.findFirst({ where: { id: course_id, institute_id: institute.id } });
      if (c) validCourseId = c.id;
    }

    let validBatchId = null;
    if (batch_id) {
      const b = await db.batch.findFirst({ where: { id: batch_id, institute_id: institute.id } });
      if (b) validBatchId = b.id;
    }

    const year = new Date().getFullYear();
    const prefix = institute.student_id_prefix || "STU";
    let studentCode = custom_student_code?.trim();

    if (studentCode) {
      const existingStudentCode = await db.student.findUnique({
        where: {
          institute_id_student_code: {
            institute_id: institute.id,
            student_code: studentCode,
          },
        },
      });
      if (existingStudentCode) {
        return NextResponse.json(
          { error: `Student ID '${studentCode}' already exists in your institute.` },
          { status: 400 }
        );
      }
    } else {
      const totalCount = await db.student.count({
        where: { institute_id: institute.id },
      });
      let sequence = totalCount + 1;
      studentCode = `${prefix}-${year}-${String(sequence).padStart(5, "0")}`;

      while (
        await db.student.findUnique({
          where: {
            institute_id_student_code: {
              institute_id: institute.id,
              student_code: studentCode,
            },
          },
        })
      ) {
        sequence++;
        studentCode = `${prefix}-${year}-${String(sequence).padStart(5, "0")}`;
      }
    }

    const tempPassword = custom_password?.trim() || generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const loginEmail = cleanEmail || `${studentCode.toLowerCase()}@${institute.id.slice(0, 6)}.local`;

    const result = await db.$transaction(async (tx) => {
      let studentUser = null;

      if (create_login_account) {
        const existingUser = await tx.user.findFirst({
          where: { institute_id: institute.id, email: loginEmail },
        });

        if (existingUser) {
          throw new Error("A user account with this email or login ID already exists.");
        }

        studentUser = await tx.user.create({
          data: {
            institute_id: institute.id,
            name: cleanName,
            email: loginEmail,
            phone: cleanPhone,
            password_hash: passwordHash,
            role: "STUDENT",
            status: "ACTIVE",
            must_change_password: true,
          },
        });
      }

      const student = await tx.student.create({
        data: {
          institute_id: institute.id,
          user_id: studentUser ? studentUser.id : null,
          course_id: validCourseId,
          batch_id: validBatchId,
          student_code: studentCode,
          name: cleanName,
          photo: photo?.trim() || null,
          phone: cleanPhone,
          email: cleanEmail,
          dob: dob ? new Date(dob) : null,
          gender: gender || null,
          address: address?.trim() || null,
          parent_name: parent_name?.trim() || null,
          parent_phone: parent_phone?.trim() || null,
          learning_mode: mode,
          status: studentStatus,
          is_archived: false,
        },
      });

      await tx.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id: student.id,
          action: "Student record created",
          performed_by: `${user.name} (${user.role})`,
          details: `Registered with ID ${studentCode} in ${mode} mode`,
        },
      });

      if (studentUser) {
        await tx.studentActivity.create({
          data: {
            institute_id: institute.id,
            student_id: student.id,
            action: "Student portal account created",
            performed_by: `${user.name} (${user.role})`,
            details: `Login ID: ${loginEmail}`,
          },
        });
      }

      return { studentUser, student };
    });

    return NextResponse.json({
      success: true,
      student: result.student,
      accountDetails: result.studentUser
        ? {
            studentCode: result.student.student_code,
            loginEmail: loginEmail,
            tempPassword: tempPassword,
          }
        : null,
    });
  } catch (error: any) {
    console.error("POST Student API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create student" },
      { status: 500 }
    );
  }
}

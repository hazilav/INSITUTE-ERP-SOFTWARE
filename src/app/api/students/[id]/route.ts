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
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 }
      );
    }

    const student = await db.student.findFirst({
      where: {
        id: params.id,
        institute_id: institute.id,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            last_login: true,
          },
        },
        activities: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error("GET Student Profile Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student record" },
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
      return NextResponse.json(
        { error: "Forbidden. Only Owner or Admin can edit student records." },
        { status: 403 }
      );
    }

    const existingStudent = await db.student.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
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
    } = body;

    // Validate course_id & batch_id belong to active institute if updated
    let targetCourseId = existingStudent.course_id;
    if (course_id !== undefined) {
      if (course_id) {
        const c = await db.course.findFirst({ where: { id: course_id, institute_id: institute.id } });
        targetCourseId = c ? c.id : null;
      } else {
        targetCourseId = null;
      }
    }

    let targetBatchId = existingStudent.batch_id;
    if (batch_id !== undefined) {
      if (batch_id) {
        const b = await db.batch.findFirst({ where: { id: batch_id, institute_id: institute.id } });
        targetBatchId = b ? b.id : null;
      } else {
        targetBatchId = null;
      }
    }

    const updatedStudent = await db.student.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existingStudent.name,
        photo: photo !== undefined ? (photo ? photo.trim() : null) : existingStudent.photo,
        phone: phone !== undefined ? phone.trim() : existingStudent.phone,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : existingStudent.email,
        dob: dob !== undefined ? (dob ? new Date(dob) : null) : existingStudent.dob,
        gender: gender !== undefined ? gender : existingStudent.gender,
        address: address !== undefined ? (address ? address.trim() : null) : existingStudent.address,
        parent_name: parent_name !== undefined ? (parent_name ? parent_name.trim() : null) : existingStudent.parent_name,
        parent_phone: parent_phone !== undefined ? (parent_phone ? parent_phone.trim() : null) : existingStudent.parent_phone,
        learning_mode: learning_mode !== undefined ? learning_mode : existingStudent.learning_mode,
        status: status !== undefined ? status : existingStudent.status,
        course_id: targetCourseId,
        batch_id: targetBatchId,
      },
    });

    if (existingStudent.user_id) {
      await db.user.update({
        where: { id: existingStudent.user_id },
        data: {
          name: updatedStudent.name,
          phone: updatedStudent.phone,
          ...(status === "DROPPED" || status === "ARCHIVED" ? { status: "INACTIVE" } : {}),
        },
      });
    }

    // Log Activity Timeline event
    await db.studentActivity.create({
      data: {
        institute_id: institute.id,
        student_id: updatedStudent.id,
        action: "Student profile updated",
        performed_by: `${user.name} (${user.role})`,
        details: `Updated details and academic course/batch assignment.`,
      },
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error("PATCH Student API Error:", error);
    return NextResponse.json(
      { error: "Failed to update student record" },
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
      return NextResponse.json(
        { error: "Forbidden. Only Owner or Admin can archive student records." },
        { status: 403 }
      );
    }

    const existingStudent = await db.student.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    const archivedStudent = await db.student.update({
      where: { id: params.id },
      data: {
        is_archived: true,
        status: "ARCHIVED",
      },
    });

    if (existingStudent.user_id) {
      await db.user.update({
        where: { id: existingStudent.user_id },
        data: { status: "INACTIVE" },
      });
    }

    // Log Activity Timeline event
    await db.studentActivity.create({
      data: {
        institute_id: institute.id,
        student_id: archivedStudent.id,
        action: "Student archived",
        performed_by: `${user.name} (${user.role})`,
        details: "Student record soft-archived and user account set to INACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Student record archived successfully",
      student: archivedStudent,
    });
  } catch (error) {
    console.error("DELETE Student API Error:", error);
    return NextResponse.json(
      { error: "Failed to archive student record" },
      { status: 500 }
    );
  }
}

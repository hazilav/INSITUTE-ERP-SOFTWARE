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
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const course = await db.course.findFirst({
      where: {
        id: params.id,
        institute_id: institute.id,
      },
      include: {
        batches: {
          where: { is_archived: false },
          include: {
            _count: { select: { students: { where: { is_archived: false } } } },
          },
        },
        _count: {
          select: {
            batches: { where: { is_archived: false } },
            students: { where: { is_archived: false } },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("GET Course Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course detail" },
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
        { error: "Forbidden. Only Owner or Admin can edit courses." },
        { status: 403 }
      );
    }

    const existingCourse = await db.course.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, code, description, duration, learning_mode, status } = body;

    const updatedCourse = await db.course.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existingCourse.name,
        code: code !== undefined ? code.trim() : existingCourse.code,
        description: description !== undefined ? description?.trim() || null : existingCourse.description,
        duration: duration !== undefined ? duration?.trim() || null : existingCourse.duration,
        learning_mode: learning_mode !== undefined ? learning_mode : existingCourse.learning_mode,
        status: status !== undefined ? status : existingCourse.status,
      },
    });

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (error) {
    console.error("PATCH Course API Error:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
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
        { error: "Forbidden. Only Owner or Admin can archive courses." },
        { status: 403 }
      );
    }

    const existingCourse = await db.course.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Soft archive course preserving connected student and batch records
    const archivedCourse = await db.course.update({
      where: { id: params.id },
      data: {
        is_archived: true,
        status: "Archived",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Course archived successfully",
      course: archivedCourse,
    });
  } catch (error) {
    console.error("DELETE Course API Error:", error);
    return NextResponse.json(
      { error: "Failed to archive course" },
      { status: 500 }
    );
  }
}

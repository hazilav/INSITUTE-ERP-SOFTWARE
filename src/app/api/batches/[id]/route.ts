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

    const batch = await db.batch.findFirst({
      where: {
        id: params.id,
        institute_id: institute.id,
      },
      include: {
        course: {
          select: { id: true, name: true, code: true, learning_mode: true },
        },
        students: {
          where: { is_archived: false },
          select: {
            id: true,
            student_code: true,
            name: true,
            phone: true,
            email: true,
            photo: true,
            status: true,
            learning_mode: true,
          },
        },
        _count: {
          select: {
            students: { where: { is_archived: false } },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error("GET Batch Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch detail" },
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
        { error: "Forbidden. Only Owner or Admin can edit batches." },
        { status: 403 }
      );
    }

    const existingBatch = await db.batch.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      code,
      course_id,
      start_date,
      end_date,
      learning_mode,
      status,
      classroom,
      days,
      start_time,
      end_time,
    } = body;

    const updatedBatch = await db.batch.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existingBatch.name,
        code: code !== undefined ? code.trim() : existingBatch.code,
        course_id: course_id !== undefined ? course_id : existingBatch.course_id,
        start_date: start_date !== undefined ? (start_date ? new Date(start_date) : null) : existingBatch.start_date,
        end_date: end_date !== undefined ? (end_date ? new Date(end_date) : null) : existingBatch.end_date,
        learning_mode: learning_mode !== undefined ? learning_mode : existingBatch.learning_mode,
        status: status !== undefined ? status : existingBatch.status,
        classroom: classroom !== undefined ? (classroom ? classroom.trim() : null) : existingBatch.classroom,
        days: days !== undefined ? (days ? days.trim() : null) : existingBatch.days,
        start_time: start_time !== undefined ? (start_time ? start_time.trim() : null) : existingBatch.start_time,
        end_time: end_time !== undefined ? (end_time ? end_time.trim() : null) : existingBatch.end_time,
      },
    });

    return NextResponse.json({ success: true, batch: updatedBatch });
  } catch (error) {
    console.error("PATCH Batch API Error:", error);
    return NextResponse.json(
      { error: "Failed to update batch" },
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
        { error: "Forbidden. Only Owner or Admin can archive batches." },
        { status: 403 }
      );
    }

    const existingBatch = await db.batch.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const archivedBatch = await db.batch.update({
      where: { id: params.id },
      data: {
        is_archived: true,
        status: "Archived",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Batch archived successfully",
      batch: archivedBatch,
    });
  } catch (error) {
    console.error("DELETE Batch API Error:", error);
    return NextResponse.json(
      { error: "Failed to archive batch" },
      { status: 500 }
    );
  }
}

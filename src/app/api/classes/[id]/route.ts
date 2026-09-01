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

    const classItem = await db.class.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        mentor: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    if (!classItem) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, class: classItem });
  } catch (error) {
    console.error("GET Class Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch class detail" },
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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingClass = await db.class.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      course_id,
      batch_id,
      mentor_id,
      topic,
      description,
      class_type,
      date,
      start_time,
      end_time,
      room,
      meeting_link,
      content_url,
      status,
    } = body;

    const updatedClass = await db.class.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title.trim() : existingClass.title,
        course_id: course_id !== undefined ? course_id : existingClass.course_id,
        batch_id: batch_id !== undefined ? batch_id : existingClass.batch_id,
        mentor_id: mentor_id !== undefined ? mentor_id : existingClass.mentor_id,
        topic: topic !== undefined ? (topic ? topic.trim() : null) : existingClass.topic,
        description: description !== undefined ? (description ? description.trim() : null) : existingClass.description,
        class_type: class_type !== undefined ? class_type : existingClass.class_type,
        date: date !== undefined ? new Date(date) : existingClass.date,
        start_time: start_time !== undefined ? start_time.trim() : existingClass.start_time,
        end_time: end_time !== undefined ? end_time.trim() : existingClass.end_time,
        room: room !== undefined ? (room ? room.trim() : null) : existingClass.room,
        meeting_link: meeting_link !== undefined ? (meeting_link ? meeting_link.trim() : null) : existingClass.meeting_link,
        content_url: content_url !== undefined ? (content_url ? content_url.trim() : null) : existingClass.content_url,
        status: status !== undefined ? status : existingClass.status,
      },
    });

    return NextResponse.json({ success: true, class: updatedClass });
  } catch (error) {
    console.error("PATCH Class API Error:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingClass = await db.class.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    await db.class.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("DELETE Class API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}

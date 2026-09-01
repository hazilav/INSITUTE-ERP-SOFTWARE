import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
        { error: "Forbidden. Only Owner or Admin can edit recorded content." },
        { status: 403 }
      );
    }

    const existingContent = await db.recordedContent.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingContent) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, course_id, module_name, description, video_url, duration, publish_status } = body;

    const updatedContent = await db.recordedContent.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title.trim() : existingContent.title,
        course_id: course_id !== undefined ? course_id : existingContent.course_id,
        module_name: module_name !== undefined ? (module_name ? module_name.trim() : null) : existingContent.module_name,
        description: description !== undefined ? (description ? description.trim() : null) : existingContent.description,
        video_url: video_url !== undefined ? video_url.trim() : existingContent.video_url,
        duration: duration !== undefined ? (duration ? duration.trim() : null) : existingContent.duration,
        publish_status: publish_status !== undefined ? publish_status : existingContent.publish_status,
      },
    });

    return NextResponse.json({ success: true, content: updatedContent });
  } catch (error) {
    console.error("PATCH Recorded Content API Error:", error);
    return NextResponse.json(
      { error: "Failed to update recorded content" },
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
        { error: "Forbidden. Only Owner or Admin can delete recorded content." },
        { status: 403 }
      );
    }

    const existingContent = await db.recordedContent.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingContent) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    await db.recordedContent.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: "Recorded content deleted successfully",
    });
  } catch (error) {
    console.error("DELETE Recorded Content API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}

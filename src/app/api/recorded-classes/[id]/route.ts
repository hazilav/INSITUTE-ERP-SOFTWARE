import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canStaffPerformRecordedClassAction } from "@/lib/permissions";
import { deleteStoredVideo } from "@/lib/storage";

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

    const recordedClass = await db.recordedContent.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true } },
        created_by: { select: { id: true, name: true, email: true } },
      },
    });

    if (!recordedClass) {
      return NextResponse.json({ error: "Recorded class not found." }, { status: 404 });
    }

    // Role check for students
    if (user.role === "STUDENT") {
      if (recordedClass.publish_status !== "Published") {
        return NextResponse.json({ error: "Forbidden: Class is not published." }, { status: 403 });
      }

      const studentProfile = await db.student.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { course_id: true },
      });

      if (!studentProfile || studentProfile.course_id !== recordedClass.course_id) {
        return NextResponse.json(
          { error: "Forbidden: You are not enrolled in this course." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, recordedClass });
  } catch (error: any) {
    console.error("GET recorded-class error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch recorded class" },
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

    const existingClass = await db.recordedContent.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Recorded class not found." }, { status: 404 });
    }

    // Role check
    let staffProfile: any = null;
    if (user.role === "STAFF" || user.role === "MENTOR") {
      staffProfile = await db.staffProfile.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { id: true, permissions: true, assigned_course_id: true },
      });

      const canEdit = canStaffPerformRecordedClassAction({
        role: user.role,
        userId: user.id,
        staffPermissions: staffProfile?.permissions,
        action: "edit",
        creatorId: existingClass.created_by_id,
        assignedCourseId: staffProfile?.assigned_course_id,
        courseId: existingClass.course_id,
      });

      if (!canEdit) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to edit this recorded class." },
          { status: 403 }
        );
      }
    } else if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Students cannot edit classes." }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      course_id,
      batch_id,
      subject,
      description,
      teacher_name,
      class_date,
      video_url,
      storage_key,
      thumbnail_url,
      duration,
      file_size,
      publish_status,
    } = body;

    // If changing publish status, check publish permission
    if (publish_status && publish_status !== existingClass.publish_status && (user.role === "STAFF" || user.role === "MENTOR")) {
      const canPublish = canStaffPerformRecordedClassAction({
        role: user.role,
        userId: user.id,
        staffPermissions: staffProfile?.permissions,
        action: "publish",
      });
      if (!canPublish) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to change class publish status." },
          { status: 403 }
        );
      }
    }

    const updatedClass = await db.recordedContent.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title.trim() : existingClass.title,
        course_id: course_id !== undefined ? course_id : existingClass.course_id,
        batch_id: batch_id !== undefined ? (batch_id || null) : existingClass.batch_id,
        subject: subject !== undefined ? (subject?.trim() || null) : existingClass.subject,
        description: description !== undefined ? (description?.trim() || null) : existingClass.description,
        teacher_name: teacher_name !== undefined ? (teacher_name?.trim() || null) : existingClass.teacher_name,
        class_date: class_date !== undefined ? (class_date ? new Date(class_date) : null) : existingClass.class_date,
        video_url: video_url !== undefined ? video_url.trim() : existingClass.video_url,
        storage_key: storage_key !== undefined ? storage_key : existingClass.storage_key,
        thumbnail_url: thumbnail_url !== undefined ? (thumbnail_url || null) : existingClass.thumbnail_url,
        duration: duration !== undefined ? (duration?.trim() || null) : existingClass.duration,
        file_size: file_size !== undefined ? file_size : existingClass.file_size,
        publish_status: publish_status !== undefined ? publish_status : existingClass.publish_status,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, recordedClass: updatedClass });
  } catch (error: any) {
    console.error("PATCH recorded-class error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update recorded class" },
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

    const existingClass = await db.recordedContent.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Recorded class not found." }, { status: 404 });
    }

    // Role check
    if (user.role === "STAFF" || user.role === "MENTOR") {
      const staffProfile = await db.staffProfile.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { id: true, permissions: true },
      });

      const canDelete = canStaffPerformRecordedClassAction({
        role: user.role,
        userId: user.id,
        staffPermissions: staffProfile?.permissions,
        action: "delete",
        creatorId: existingClass.created_by_id,
      });

      if (!canDelete) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to delete recorded classes." },
          { status: 403 }
        );
      }
    } else if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storageKeyToDelete = existingClass.storage_key;

    // 1. Delete database record first
    await db.recordedContent.delete({
      where: { id: params.id },
    });

    // 2. Clean up storage file safely in the background
    if (storageKeyToDelete) {
      try {
        await deleteStoredVideo(storageKeyToDelete);
      } catch (storageErr) {
        console.warn("Storage delete warning:", storageErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Recorded class deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE recorded-class error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete recorded class" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getVideoPlaybackUrl } from "@/lib/storage";

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

    // 1. Fetch recorded class with institute check
    const recordedClass = await db.recordedContent.findFirst({
      where: {
        id: params.id,
        institute_id: institute.id,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
      },
    });

    if (!recordedClass) {
      return NextResponse.json(
        { error: "Recorded class not found or unauthorized for this institute." },
        { status: 404 }
      );
    }

    // 2. Student authorization gate
    if (user.role === "STUDENT") {
      if (recordedClass.publish_status !== "Published") {
        return NextResponse.json(
          { error: "This recorded class is currently unavailable." },
          { status: 403 }
        );
      }

      const student = await db.student.findFirst({
        where: {
          user_id: user.id,
          institute_id: institute.id,
        },
        select: {
          id: true,
          course_id: true,
          status: true,
        },
      });

      if (!student) {
        return NextResponse.json({ error: "Student profile not found." }, { status: 403 });
      }

      if (student.status !== "ACTIVE") {
        return NextResponse.json({ error: "Your student enrollment is not active." }, { status: 403 });
      }

      // Check course match
      if (student.course_id !== recordedClass.course_id) {
        return NextResponse.json(
          { error: "Access denied. You are not enrolled in the course for this recorded class." },
          { status: 403 }
        );
      }
    }

    // 3. Generate authorized playback URL
    let playbackResult;
    if (recordedClass.storage_key) {
      playbackResult = await getVideoPlaybackUrl({
        fileKey: recordedClass.storage_key,
        videoUrl: recordedClass.video_url,
        instituteId: institute.id,
        expiresInSeconds: 14400, // 4 hours
      });
    } else {
      playbackResult = {
        playbackUrl: recordedClass.video_url,
        isSigned: false,
      };
    }

    // 4. Update student progress tracking asynchronously if student is watching
    if (user.role === "STUDENT") {
      const student = await db.student.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { id: true },
      });
      if (student) {
        await db.studentContentProgress.upsert({
          where: {
            institute_id_student_id_content_id: {
              institute_id: institute.id,
              student_id: student.id,
              content_id: recordedClass.id,
            },
          },
          update: {
            status: "In Progress",
          },
          create: {
            institute_id: institute.id,
            student_id: student.id,
            content_id: recordedClass.id,
            status: "In Progress",
          },
        }).catch((err) => console.warn("Failed to update progress:", err));
      }
    }

    return NextResponse.json({
      success: true,
      classId: recordedClass.id,
      title: recordedClass.title,
      subject: recordedClass.subject,
      teacherName: recordedClass.teacher_name,
      courseName: recordedClass.course?.name,
      duration: recordedClass.duration,
      playbackUrl: playbackResult.playbackUrl,
      isSigned: playbackResult.isSigned,
      expiresAt: playbackResult.expiresAt,
    });
  } catch (error: any) {
    console.error("Playback authorization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authorize video playback." },
      { status: 500 }
    );
  }
}

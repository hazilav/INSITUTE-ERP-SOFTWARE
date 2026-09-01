import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    // Check mode: If institute is strictly offline, recorded content is not available
    const mode = institute.institute_mode || "hybrid";
    if (mode === "offline") {
      return NextResponse.json({
        success: true,
        contents: [],
        message: "Recorded content is disabled for offline institutes",
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const courseFilter = searchParams.get("course_id") || "ALL";
    const statusFilter = searchParams.get("publish_status") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
    if (statusFilter !== "ALL") whereCondition.publish_status = statusFilter;

    if (search) {
      whereCondition.OR = [
        { title: { contains: search } },
        { module_name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const contents = await db.recordedContent.findMany({
      where: whereCondition,
      include: {
        course: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const activeCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      contents,
      activeCourses,
      instituteMode: mode,
    });
  } catch (error) {
    console.error("GET Recorded Content API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recorded content" },
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
        { error: "Forbidden. Only Owner or Admin can upload learning content." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, course_id, module_name, description, video_url, duration, publish_status } = body;

    if (!title || !title.trim() || !course_id || !video_url || !video_url.trim()) {
      return NextResponse.json(
        { error: "Content Title, Course, and Video URL are required." },
        { status: 400 }
      );
    }

    const parentCourse = await db.course.findFirst({
      where: { id: course_id, institute_id: institute.id },
    });

    if (!parentCourse) {
      return NextResponse.json(
        { error: "Invalid Course selected for your institute." },
        { status: 400 }
      );
    }

    const content = await db.recordedContent.create({
      data: {
        institute_id: institute.id,
        course_id: parentCourse.id,
        module_name: module_name?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
        video_url: video_url.trim(),
        duration: duration?.trim() || null,
        publish_status: publish_status || "Published",
      },
    });

    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    console.error("POST Recorded Content API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create recorded content" },
      { status: 500 }
    );
  }
}

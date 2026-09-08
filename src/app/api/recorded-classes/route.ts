import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canStaffPerformRecordedClassAction } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const courseFilter = searchParams.get("course_id") || "ALL";
    const statusFilter = searchParams.get("publish_status") || "ALL";
    const subjectParam = searchParams.get("subject")?.trim();
    const teacherParam = searchParams.get("teacher")?.trim();
    const dateParam = searchParams.get("date")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      institute_id: institute.id,
    };

    // Role-specific restrictions
    if (user.role === "STUDENT") {
      // Students can ONLY see Published classes
      whereCondition.publish_status = "Published";

      // Students can ONLY see classes of their enrolled course
      const studentProfile = await db.student.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { id: true, course_id: true },
      });

      if (!studentProfile || !studentProfile.course_id) {
        return NextResponse.json({
          success: true,
          recordedClasses: [],
          total: 0,
          page: 1,
          totalPages: 0,
          courses: [],
        });
      }

      // Lock query strictly to student's course
      whereCondition.course_id = studentProfile.course_id;
    } else if (user.role === "STAFF" || user.role === "MENTOR") {
      const staffProfile = await db.staffProfile.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { id: true, permissions: true, assigned_course_id: true },
      });

      const canViewAll = canStaffPerformRecordedClassAction({
        role: user.role,
        userId: user.id,
        staffPermissions: staffProfile?.permissions,
        action: "view",
      });

      if (!canViewAll && staffProfile?.assigned_course_id) {
        whereCondition.course_id = staffProfile.assigned_course_id;
      }

      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (statusFilter !== "ALL") whereCondition.publish_status = statusFilter;
    } else {
      // OWNER / ADMIN
      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (statusFilter !== "ALL") whereCondition.publish_status = statusFilter;
    }

    if (subjectParam && subjectParam !== "ALL") {
      whereCondition.subject = { contains: subjectParam, mode: "insensitive" };
    }

    if (teacherParam) {
      whereCondition.teacher_name = { contains: teacherParam, mode: "insensitive" };
    }

    if (dateParam) {
      const dateStart = new Date(dateParam);
      if (!isNaN(dateStart.getTime())) {
        const dateEnd = new Date(dateParam);
        dateEnd.setHours(23, 59, 59, 999);
        whereCondition.class_date = {
          gte: dateStart,
          lte: dateEnd,
        };
      }
    }

    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { teacher_name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, recordedClasses, activeCourses] = await Promise.all([
      db.recordedContent.count({ where: whereCondition }),
      db.recordedContent.findMany({
        where: whereCondition,
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true } },
          created_by: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ class_date: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
      }),
      db.course.findMany({
        where: { institute_id: institute.id, is_archived: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      recordedClasses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      activeCourses,
      instituteEmail: institute.email || user.email,
      instituteName: institute.name,
      userEmail: user.email,
    });
  } catch (error: any) {
    console.error("GET recorded-classes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch recorded classes" },
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

    // Verify permission to upload
    let staffProfile: any = null;
    if (user.role === "STAFF" || user.role === "MENTOR") {
      staffProfile = await db.staffProfile.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
        select: { id: true, permissions: true, assigned_course_id: true },
      });

      const canUpload = canStaffPerformRecordedClassAction({
        role: user.role,
        userId: user.id,
        staffPermissions: staffProfile?.permissions,
        action: "upload",
      });

      if (!canUpload) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to upload recorded classes." },
          { status: 403 }
        );
      }
    } else if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Students cannot upload recorded classes." },
        { status: 403 }
      );
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
      publish_status = "Published",
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Class title is required." }, { status: 400 });
    }

    if (!course_id) {
      return NextResponse.json({ error: "Course is required." }, { status: 400 });
    }

    if (!video_url) {
      return NextResponse.json({ error: "Video file or URL is required." }, { status: 400 });
    }

    // Verify course belongs to this institute
    const course = await db.course.findFirst({
      where: { id: course_id, institute_id: institute.id },
      select: { id: true, name: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Selected course does not exist in this institute." }, { status: 400 });
    }

    // If staff is restricted to an assigned course
    if (
      staffProfile?.assigned_course_id &&
      staffProfile.assigned_course_id !== course_id &&
      user.role !== "OWNER" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "You can only upload recorded classes for your assigned course." },
        { status: 403 }
      );
    }

    const newClass = await db.recordedContent.create({
      data: {
        institute_id: institute.id,
        course_id,
        batch_id: batch_id || null,
        title: title.trim(),
        subject: subject?.trim() || null,
        description: description?.trim() || null,
        teacher_name: teacher_name?.trim() || user.name,
        class_date: class_date ? new Date(class_date) : new Date(),
        video_url: video_url.trim(),
        storage_key: storage_key || null,
        thumbnail_url: thumbnail_url || null,
        duration: duration || null,
        file_size: file_size || null,
        publish_status: ["Published", "Draft"].includes(publish_status) ? publish_status : "Published",
        created_by_id: user.id,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, recordedClass: newClass });
  } catch (error: any) {
    console.error("POST recorded-classes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create recorded class" },
      { status: 500 }
    );
  }
}

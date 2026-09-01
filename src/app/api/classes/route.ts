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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const dateFilter = searchParams.get("date") || ""; // YYYY-MM-DD
    const courseFilter = searchParams.get("course_id") || "ALL";
    const batchFilter = searchParams.get("batch_id") || "ALL";
    const typeFilter = searchParams.get("class_type") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    // Multi-tenant scoped where condition
    const whereCondition: any = {
      institute_id: institute.id,
    };

    // If logged in as STUDENT, restrict to student's assigned batch
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || !student.batch_id) {
        return NextResponse.json({
          success: true,
          classes: [],
          metrics: { today: 0, upcoming: 0, completed: 0 },
        });
      }
      whereCondition.batch_id = student.batch_id;
    } else {
      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (batchFilter !== "ALL") whereCondition.batch_id = batchFilter;
    }

    if (typeFilter !== "ALL") whereCondition.class_type = typeFilter;
    if (statusFilter !== "ALL") whereCondition.status = statusFilter;

    if (dateFilter) {
      const startDate = new Date(`${dateFilter}T00:00:00.000Z`);
      const endDate = new Date(`${dateFilter}T23:59:59.999Z`);
      whereCondition.date = { gte: startDate, lte: endDate };
    }

    if (search) {
      whereCondition.OR = [
        { title: { contains: search } },
        { topic: { contains: search } },
        { room: { contains: search } },
      ];
    }

    const classes = await db.class.findMany({
      where: whereCondition,
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        mentor: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ date: "asc" }, { start_time: "asc" }],
    });

    // Compute Metrics based on Date
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const baseMetricsWhere: any = { institute_id: institute.id };
    if (user.role === "STUDENT") {
      const s = await db.student.findUnique({ where: { user_id: user.id } });
      if (s?.batch_id) baseMetricsWhere.batch_id = s.batch_id;
    }

    const todayCount = await db.class.count({
      where: { ...baseMetricsWhere, date: { gte: todayStart, lte: todayEnd } },
    });

    const upcomingCount = await db.class.count({
      where: { ...baseMetricsWhere, date: { gt: todayEnd }, status: { in: ["Scheduled", "Live"] } },
    });

    const completedCount = await db.class.count({
      where: { ...baseMetricsWhere, status: "Completed" },
    });

    // Fetch active courses, batches, and mentors for filters & forms
    const activeCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const activeBatches = await db.batch.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true, course_id: true },
      orderBy: { name: "asc" },
    });

    const mentors = await db.user.findMany({
      where: { institute_id: institute.id, role: { in: ["OWNER", "ADMIN", "STAFF", "MENTOR"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      classes,
      metrics: {
        today: todayCount,
        upcoming: upcomingCount,
        completed: completedCount,
      },
      activeCourses,
      activeBatches,
      mentors,
      instituteMode: institute.institute_mode || "hybrid",
    });
  } catch (error) {
    console.error("GET Classes API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    if (!title || !title.trim() || !course_id || !batch_id || !date) {
      return NextResponse.json(
        { error: "Class Title, Course, Batch, and Date are required." },
        { status: 400 }
      );
    }

    // Verify course & batch belong to the current institute
    const parentCourse = await db.course.findFirst({
      where: { id: course_id, institute_id: institute.id },
    });
    const parentBatch = await db.batch.findFirst({
      where: { id: batch_id, institute_id: institute.id },
    });

    if (!parentCourse || !parentBatch) {
      return NextResponse.json(
        { error: "Selected Course or Batch does not belong to your institute." },
        { status: 400 }
      );
    }

    // Mode-based Type Guard
    const instMode = institute.institute_mode || "hybrid";
    let type = class_type || "physical";

    if (instMode === "offline") {
      type = "physical";
    } else if (instMode === "online" && type === "physical") {
      type = "live_online";
    }

    const createdClass = await db.class.create({
      data: {
        institute_id: institute.id,
        course_id: parentCourse.id,
        batch_id: parentBatch.id,
        mentor_id: mentor_id || user.id,
        title: title.trim(),
        topic: topic?.trim() || null,
        description: description?.trim() || null,
        class_type: type,
        date: new Date(date),
        start_time: start_time?.trim() || "10:00 AM",
        end_time: end_time?.trim() || "11:30 AM",
        room: type === "physical" ? room?.trim() || null : null,
        meeting_link: type === "live_online" ? meeting_link?.trim() || null : null,
        content_url: type === "recorded" ? content_url?.trim() || null : null,
        status: status || "Scheduled",
      },
    });

    return NextResponse.json({ success: true, class: createdClass });
  } catch (error: any) {
    console.error("POST Class API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create class" },
      { status: 500 }
    );
  }
}

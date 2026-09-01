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

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "ALL";
    const courseFilter = searchParams.get("course_id") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
      is_archived: false,
    };

    if (statusFilter !== "ALL") {
      whereCondition.status = statusFilter;
    }

    if (courseFilter !== "ALL") {
      whereCondition.course_id = courseFilter;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { classroom: { contains: search } },
      ];
    }

    const batches = await db.batch.findMany({
      where: whereCondition,
      include: {
        course: {
          select: { id: true, name: true, code: true, learning_mode: true },
        },
        _count: {
          select: {
            students: { where: { is_archived: false } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const allInstituteBatches = await db.batch.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { status: true },
    });

    const metrics = {
      total: allInstituteBatches.length,
      active: allInstituteBatches.filter((b) => b.status === "Active").length,
      upcoming: allInstituteBatches.filter((b) => b.status === "Upcoming").length,
      completed: allInstituteBatches.filter((b) => b.status === "Completed").length,
    };

    // Active courses list for dropdown selection
    const activeCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false, status: "Active" },
      select: { id: true, name: true, code: true, learning_mode: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      batches,
      metrics,
      activeCourses,
      instituteMode: institute.institute_mode || "hybrid",
    });
  } catch (error) {
    console.error("GET Batches API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
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
        { error: "Forbidden. Only Owner or Admin can create batches." },
        { status: 403 }
      );
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

    if (!name || !name.trim() || !course_id) {
      return NextResponse.json(
        { error: "Batch Name and Parent Course are required." },
        { status: 400 }
      );
    }

    // Verify parent course belongs to the same active institute (Multi-Tenant Guard)
    const parentCourse = await db.course.findFirst({
      where: { id: course_id, institute_id: institute.id },
    });

    if (!parentCourse) {
      return NextResponse.json(
        { error: "Invalid Course selected for your institute." },
        { status: 400 }
      );
    }

    const batchCode = code?.trim() || `BTC-${String(Date.now()).slice(-4)}`;
    const mode = learning_mode || parentCourse.learning_mode || "hybrid";

    const batch = await db.batch.create({
      data: {
        institute_id: institute.id,
        course_id: parentCourse.id,
        name: name.trim(),
        code: batchCode,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        learning_mode: mode,
        status: status || "Active",
        classroom: classroom?.trim() || null,
        days: days?.trim() || null,
        start_time: start_time?.trim() || null,
        end_time: end_time?.trim() || null,
        is_archived: false,
      },
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    console.error("POST Batch API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create batch" },
      { status: 500 }
    );
  }
}

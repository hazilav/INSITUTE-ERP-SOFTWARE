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

    const whereCondition: any = {
      institute_id: institute.id,
      is_archived: false,
    };

    if (statusFilter !== "ALL") {
      whereCondition.status = statusFilter;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const courses = await db.course.findMany({
      where: whereCondition,
      include: {
        _count: {
          select: {
            batches: { where: { is_archived: false } },
            students: { where: { is_archived: false } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const allInstituteCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { status: true },
    });

    const metrics = {
      total: allInstituteCourses.length,
      active: allInstituteCourses.filter((c) => c.status === "Active").length,
      draft: allInstituteCourses.filter((c) => c.status === "Draft").length,
      archived: await db.course.count({
        where: { institute_id: institute.id, is_archived: true },
      }),
    };

    return NextResponse.json({
      success: true,
      courses,
      metrics,
      instituteMode: institute.institute_mode || "hybrid",
    });
  } catch (error) {
    console.error("GET Courses API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
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
        { error: "Forbidden. Only Owner or Admin can create courses." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, description, duration, learning_mode, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Course Name is required." },
        { status: 400 }
      );
    }

    // Validate mode against institute operational mode configuration
    const instMode = institute.institute_mode || "hybrid";
    let requestedMode = learning_mode || instMode;

    if (instMode === "offline" && requestedMode === "online") {
      requestedMode = "offline";
    } else if (instMode === "online" && requestedMode === "offline") {
      requestedMode = "online";
    }

    const courseCode = code?.trim() || `CRS-${String(Date.now()).slice(-4)}`;

    const course = await db.course.create({
      data: {
        institute_id: institute.id,
        name: name.trim(),
        code: courseCode,
        description: description?.trim() || null,
        duration: duration?.trim() || null,
        learning_mode: requestedMode,
        status: status || "Active",
        is_archived: false,
      },
    });

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    console.error("POST Course API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create course" },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");
    const batchId = searchParams.get("batch_id");
    const status = searchParams.get("status");
    const mode = searchParams.get("mode");

    const whereCondition: any = {
      institute_id: institute.id,
      is_archived: false,
    };

    if (courseId && courseId !== "ALL") whereCondition.course_id = courseId;
    if (batchId && batchId !== "ALL") whereCondition.batch_id = batchId;
    if (status && status !== "ALL") whereCondition.status = status;
    if (mode && mode !== "ALL") whereCondition.learning_mode = mode;

    const students = await db.student.findMany({
      where: whereCondition,
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const allStudents = await db.student.findMany({
      where: { institute_id: institute.id, is_archived: false },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    // Aggregations
    const totalStudents = allStudents.length;
    const activeStudents = allStudents.filter((s) => s.status === "ACTIVE").length;
    const onHoldStudents = allStudents.filter((s) => s.status === "ON_HOLD").length;
    const completedStudents = allStudents.filter((s) => s.status === "COMPLETED").length;
    const droppedStudents = allStudents.filter((s) => s.status === "DROPPED").length;

    // Course Distribution
    const courseMap: Record<string, number> = {};
    allStudents.forEach((s) => {
      const cName = s.course?.name || "Unassigned Course";
      courseMap[cName] = (courseMap[cName] || 0) + 1;
    });

    // Batch Distribution
    const batchMap: Record<string, number> = {};
    allStudents.forEach((s) => {
      const bName = s.batch?.name || "Unassigned Batch";
      batchMap[bName] = (batchMap[bName] || 0) + 1;
    });

    // Learning Mode Distribution
    const modeMap: Record<string, number> = { offline: 0, online: 0, hybrid: 0 };
    allStudents.forEach((s) => {
      if (s.learning_mode) {
        modeMap[s.learning_mode] = (modeMap[s.learning_mode] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalStudents,
        activeStudents,
        onHoldStudents,
        completedStudents,
        droppedStudents,
      },
      byCourse: Object.entries(courseMap).map(([name, count]) => ({ name, count })),
      byBatch: Object.entries(batchMap).map(([name, count]) => ({ name, count })),
      byLearningMode: Object.entries(modeMap).map(([name, count]) => ({ name, count })),
      students,
    });
  } catch (error: any) {
    console.error("GET Student Report API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch student report" }, { status: 500 });
  }
}

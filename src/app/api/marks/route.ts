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
    const courseFilter = searchParams.get("course_id") || "ALL";
    const batchFilter = searchParams.get("batch_id") || "ALL";
    const typeFilter = searchParams.get("type") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || !student.batch_id) {
        return NextResponse.json({
          success: true,
          assessments: [],
          metrics: { total: 0, completed: 0, pending: 0, averagePercentage: "0.00%", needingAttention: 0 },
        });
      }
      whereCondition.batch_id = student.batch_id;
      whereCondition.status = { in: ["Scheduled", "Evaluation Pending", "Completed"] };
    } else {
      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (batchFilter !== "ALL") whereCondition.batch_id = batchFilter;
      if (statusFilter !== "ALL") whereCondition.status = statusFilter;
    }

    if (typeFilter !== "ALL") whereCondition.type = typeFilter;

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { module_name: { contains: search } },
      ];
    }

    const assessments = await db.assessment.findMany({
      where: whereCondition,
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        mentor: { select: { id: true, name: true } },
        results: {
          select: {
            id: true,
            obtained_marks: true,
            percentage: true,
            is_pass: true,
            result_status: true,
          },
        },
        _count: {
          select: { results: true },
        },
      },
      orderBy: [{ assessment_date: "desc" }, { created_at: "desc" }],
    });

    // Compute Overall Institute Academic Metrics
    const allResults = await db.assessmentResult.findMany({
      where: { institute_id: institute.id },
      select: { percentage: true, is_pass: true, result_status: true },
    });

    const totalAssessments = await db.assessment.count({
      where: { institute_id: institute.id },
    });

    const completedAssessments = await db.assessment.count({
      where: { institute_id: institute.id, status: "Completed" },
    });

    const pendingEvaluations = await db.assessment.count({
      where: { institute_id: institute.id, status: { in: ["Scheduled", "Evaluation Pending"] } },
    });

    const totalPctSum = allResults.reduce((acc, r) => acc + r.percentage, 0);
    const avgPercentage =
      allResults.length > 0 ? (totalPctSum / allResults.length).toFixed(2) + "%" : "0.00%";

    const studentsNeedingAttention = allResults.filter((r) => !r.is_pass || r.percentage < 50.0).length;

    const activeCourses = await db.course.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const activeBatches = await db.batch.findMany({
      where: { institute_id: institute.id, is_archived: false },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      assessments: assessments.map((a) => {
        const evalCount = a.results.filter((r) => r.result_status === "Evaluated").length;
        return {
          ...a,
          evaluated_count: evalCount,
        };
      }),
      metrics: {
        total: totalAssessments,
        completed: completedAssessments,
        pending: pendingEvaluations,
        averagePercentage: avgPercentage,
        needingAttention: studentsNeedingAttention,
      },
      activeCourses,
      activeBatches,
    });
  } catch (error) {
    console.error("GET Assessments API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessments" },
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
      name,
      course_id,
      batch_id,
      module_name,
      mentor_id,
      type,
      description,
      assessment_date,
      maximum_marks,
      passing_marks,
      status,
    } = body;

    if (!name || !course_id || !batch_id || !assessment_date) {
      return NextResponse.json(
        { error: "name, course_id, batch_id, and assessment_date are required fields." },
        { status: 400 }
      );
    }

    const courseItem = await db.course.findFirst({
      where: { id: course_id, institute_id: institute.id },
    });

    const batchItem = await db.batch.findFirst({
      where: { id: batch_id, institute_id: institute.id },
    });

    if (!courseItem || !batchItem) {
      return NextResponse.json(
        { error: "Invalid course or batch for your institute." },
        { status: 400 }
      );
    }

    const maxM = parseFloat(maximum_marks) || 100.0;
    const passM = parseFloat(passing_marks) || 40.0;

    const newAssessment = await db.assessment.create({
      data: {
        institute_id: institute.id,
        course_id,
        batch_id,
        mentor_id: mentor_id || user.id,
        name: name.trim(),
        type: type || "Exam",
        description: description?.trim() || null,
        module_name: module_name?.trim() || null,
        assessment_date: new Date(assessment_date),
        maximum_marks: maxM,
        passing_marks: passM,
        status: status || "Scheduled",
      },
    });

    return NextResponse.json({
      success: true,
      assessment: newAssessment,
    });
  } catch (error: any) {
    console.error("POST Assessment API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create assessment" },
      { status: 500 }
    );
  }
}

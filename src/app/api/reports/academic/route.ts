import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateGrade } from "@/lib/grading";

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

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (courseId && courseId !== "ALL") {
      whereCondition.assessment = { course_id: courseId };
    }

    if (batchId && batchId !== "ALL") {
      whereCondition.assessment = { ...whereCondition.assessment, batch_id: batchId };
    }

    const results = await db.assessmentResult.findMany({
      where: whereCondition,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            student_code: true,
            course: { select: { name: true } },
            batch: { select: { name: true } },
          },
        },
        assessment: {
          include: {
            course: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
    });

    const completedAssessments = await db.assessment.count({
      where: { institute_id: institute.id, status: "Finalized" },
    });

    const pendingEvaluation = await db.assessment.count({
      where: { institute_id: institute.id, status: { in: ["Scheduled", "Evaluation Pending"] } },
    });

    const totalResults = results.length;
    const totalPctSum = results.reduce((acc, r) => acc + r.percentage, 0);
    const passCount = results.filter((r) => r.is_pass).length;
    const failCount = results.filter((r) => !r.is_pass).length;

    const avgPercentage = totalResults > 0 ? (totalPctSum / totalResults).toFixed(2) : "0.00";
    const passRate = totalResults > 0 ? ((passCount / totalResults) * 100).toFixed(1) + "%" : "0.0%";
    const failRate = totalResults > 0 ? ((failCount / totalResults) * 100).toFixed(1) + "%" : "0.0%";

    // Performance by Course
    const coursePerformanceMap: Record<string, { pctSum: number; count: number }> = {};
    results.forEach((r) => {
      const cName = r.assessment.course?.name || "General Course";
      if (!coursePerformanceMap[cName]) coursePerformanceMap[cName] = { pctSum: 0, count: 0 };
      coursePerformanceMap[cName].pctSum += r.percentage;
      coursePerformanceMap[cName].count++;
    });

    const performanceByCourse = Object.entries(coursePerformanceMap).map(([course, data]) => ({
      course,
      avgPct: parseFloat((data.pctSum / data.count).toFixed(2)),
    }));

    // Performance by Batch
    const batchPerformanceMap: Record<string, { pctSum: number; count: number }> = {};
    results.forEach((r) => {
      const bName = r.assessment.batch?.name || "General Batch";
      if (!batchPerformanceMap[bName]) batchPerformanceMap[bName] = { pctSum: 0, count: 0 };
      batchPerformanceMap[bName].pctSum += r.percentage;
      batchPerformanceMap[bName].count++;
    });

    const performanceByBatch = Object.entries(batchPerformanceMap).map(([batch, data]) => ({
      batch,
      avgPct: parseFloat((data.pctSum / data.count).toFixed(2)),
    }));

    // Student Performance Table (Aggregated per student)
    const studentMap: Record<string, { student: any; pctSum: number; count: number; passCount: number }> = {};
    results.forEach((r) => {
      const sId = r.student.id;
      if (!studentMap[sId]) {
        studentMap[sId] = { student: r.student, pctSum: 0, count: 0, passCount: 0 };
      }
      studentMap[sId].pctSum += r.percentage;
      studentMap[sId].count++;
      if (r.is_pass) studentMap[sId].passCount++;
    });

    const studentPerformanceTable = Object.values(studentMap).map(({ student, pctSum, count, passCount }) => {
      const avg = parseFloat((pctSum / count).toFixed(2));
      return {
        id: student.id,
        student_code: student.student_code,
        name: student.name,
        course_name: student.course?.name || "General Course",
        batch_name: student.batch?.name || "General Batch",
        avgPct: `${avg}%`,
        grade: calculateGrade(avg),
        result: passCount === count ? "Pass" : "Requires Attention",
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        avgPercentage: `${avgPercentage}%`,
        passRate,
        failRate,
        completedAssessments,
        pendingEvaluation,
      },
      performanceByCourse,
      performanceByBatch,
      studentPerformanceTable,
    });
  } catch (error: any) {
    console.error("GET Academic Report API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch academic report" }, { status: 500 });
  }
}

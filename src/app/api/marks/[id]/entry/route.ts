import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculatePercentage,
  calculateGrade,
  determinePassStatus,
} from "@/lib/grading";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assessment = await db.assessment.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.finalized && user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "This assessment has been finalized and locked from changes." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { student_results } = body;
    // student_results: Array<{ student_id: string, obtained_marks: number | string, feedback?: string }>

    if (!student_results || !Array.isArray(student_results)) {
      return NextResponse.json(
        { error: "student_results array is required." },
        { status: 400 }
      );
    }

    // Validate all obtained marks <= maximum_marks
    for (const r of student_results) {
      if (r.obtained_marks !== undefined && r.obtained_marks !== null && r.obtained_marks !== "") {
        const val = parseFloat(r.obtained_marks);
        if (isNaN(val)) {
          return NextResponse.json(
            { error: `Invalid number format for student mark: ${r.obtained_marks}` },
            { status: 400 }
          );
        }
        if (val > assessment.maximum_marks) {
          return NextResponse.json(
            {
              error: `Obtained marks (${val}) cannot exceed maximum marks (${assessment.maximum_marks}).`,
            },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();

    // Bulk upsert student result records using $transaction
    const upserted = await db.$transaction(
      student_results.map((r) => {
        const obtained = parseFloat(r.obtained_marks);
        const percentage = calculatePercentage(obtained, assessment.maximum_marks);
        const grade = calculateGrade(percentage);
        const isPass = determinePassStatus(obtained, assessment.passing_marks);

        return db.assessmentResult.upsert({
          where: {
            institute_id_assessment_id_student_id: {
              institute_id: institute.id,
              assessment_id: assessment.id,
              student_id: r.student_id,
            },
          },
          update: {
            obtained_marks: obtained,
            percentage,
            grade,
            is_pass: isPass,
            result_status: "Evaluated",
            feedback: r.feedback?.trim() || null,
            evaluated_by_id: user.id,
            evaluated_at: now,
          },
          create: {
            institute_id: institute.id,
            assessment_id: assessment.id,
            student_id: r.student_id,
            obtained_marks: obtained,
            percentage,
            grade,
            is_pass: isPass,
            result_status: "Evaluated",
            feedback: r.feedback?.trim() || null,
            evaluated_by_id: user.id,
            evaluated_at: now,
          },
        });
      })
    );

    // Update assessment status to Completed if all batch students have been evaluated
    const totalEnrolledStudents = await db.student.count({
      where: {
        institute_id: institute.id,
        batch_id: assessment.batch_id,
        is_archived: false,
      },
    });

    const evaluatedStudentsCount = await db.assessmentResult.count({
      where: {
        institute_id: institute.id,
        assessment_id: assessment.id,
        result_status: "Evaluated",
      },
    });

    if (evaluatedStudentsCount >= totalEnrolledStudents && totalEnrolledStudents > 0) {
      await db.assessment.update({
        where: { id: assessment.id },
        data: { status: "Completed" },
      });
    } else {
      await db.assessment.update({
        where: { id: assessment.id },
        data: { status: "Evaluation Pending" },
      });
    }

    return NextResponse.json({
      success: true,
      count: upserted.length,
      results: upserted,
    });
  } catch (error: any) {
    console.error("POST Bulk Marks Entry API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save student marks" },
      { status: 500 }
    );
  }
}

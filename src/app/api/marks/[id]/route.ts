import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const assessment = await db.assessment.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
        mentor: { select: { id: true, name: true, role: true, email: true } },
        finalized_by: { select: { id: true, name: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Student privacy guard
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || student.batch_id !== assessment.batch_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await db.assessmentResult.findFirst({
        where: {
          institute_id: institute.id,
          assessment_id: assessment.id,
          student_id: student.id,
        },
      });

      return NextResponse.json({
        success: true,
        assessment,
        student,
        result,
      });
    }

    // Staff/Owner/Mentor: Fetch complete batch roster and merge assessment results
    const students = await db.student.findMany({
      where: {
        institute_id: institute.id,
        batch_id: assessment.batch_id,
        is_archived: false,
      },
      select: {
        id: true,
        student_code: true,
        name: true,
        phone: true,
        email: true,
        photo: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    const results = await db.assessmentResult.findMany({
      where: {
        institute_id: institute.id,
        assessment_id: assessment.id,
      },
      include: {
        evaluated_by: { select: { id: true, name: true } },
      },
    });

    const resultMap = new Map();
    results.forEach((r) => resultMap.set(r.student_id, r));

    const roster = students.map((st) => {
      const res = resultMap.get(st.id);
      return {
        student: st,
        result: res || null,
        status: res ? res.result_status : "Pending",
      };
    });

    return NextResponse.json({
      success: true,
      assessment,
      roster,
    });
  } catch (error) {
    console.error("GET Assessment Detail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const existingAssessment = await db.assessment.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!existingAssessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      module_name,
      mentor_id,
      type,
      assessment_date,
      maximum_marks,
      passing_marks,
      status,
      action, // 'finalize' or 'reopen'
    } = body;

    // Handle Finalization / Reopen
    if (action === "finalize") {
      const updated = await db.assessment.update({
        where: { id: params.id },
        data: {
          finalized: true,
          finalized_by_id: user.id,
          finalized_at: new Date(),
          status: "Completed",
        },
      });
      return NextResponse.json({ success: true, assessment: updated });
    }

    if (action === "reopen") {
      if (user.role !== "OWNER" && user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only OWNER or ADMIN can reopen finalized results." },
          { status: 403 }
        );
      }
      const updated = await db.assessment.update({
        where: { id: params.id },
        data: {
          finalized: false,
          finalized_by_id: null,
          finalized_at: null,
          status: "Evaluation Pending",
        },
      });
      return NextResponse.json({ success: true, assessment: updated });
    }

    // Normal Update
    if (existingAssessment.finalized && user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "This assessment has been finalized and locked from changes." },
        { status: 403 }
      );
    }

    const updatedAssessment = await db.assessment.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existingAssessment.name,
        description: description !== undefined ? (description ? description.trim() : null) : existingAssessment.description,
        module_name: module_name !== undefined ? (module_name ? module_name.trim() : null) : existingAssessment.module_name,
        mentor_id: mentor_id !== undefined ? mentor_id : existingAssessment.mentor_id,
        type: type || existingAssessment.type,
        assessment_date: assessment_date ? new Date(assessment_date) : existingAssessment.assessment_date,
        maximum_marks: maximum_marks !== undefined ? parseFloat(maximum_marks) : existingAssessment.maximum_marks,
        passing_marks: passing_marks !== undefined ? parseFloat(passing_marks) : existingAssessment.passing_marks,
        status: status || existingAssessment.status,
      },
    });

    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
    });
  } catch (error) {
    console.error("PATCH Assessment API Error:", error);
    return NextResponse.json(
      { error: "Failed to update assessment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await db.assessment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Assessment deleted" });
  } catch (error) {
    console.error("DELETE Assessment API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete assessment" },
      { status: 500 }
    );
  }
}

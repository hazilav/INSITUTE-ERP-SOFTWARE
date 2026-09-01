import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentIdFilter = searchParams.get("student_id");
    const docTypeFilter = searchParams.get("document_type");
    const searchQuery = searchParams.get("query");

    // Check if staff/admin or student context
    const authContext = await getAuthenticatedUser();
    const studentContext = await getAuthenticatedStudent();

    if (!authContext && !studentContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (studentContext && !authContext) {
      // Student portal request - only return visible_to_student = true for logged-in student
      const documents = await db.studentDocument.findMany({
        where: {
          institute_id: studentContext.institute.id,
          student_id: studentContext.student.id,
          visible_to_student: true,
        },
        include: {
          uploaded_by: { select: { name: true } },
        },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json({ success: true, documents });
    }

    // Staff / Admin request
    const { institute, user } = authContext!;

    if (user.role === "STUDENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (studentIdFilter) {
      whereCondition.student_id = studentIdFilter;
    }

    if (docTypeFilter && docTypeFilter !== "ALL") {
      whereCondition.document_type = docTypeFilter;
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      whereCondition.OR = [
        { document_name: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { student_code: { contains: q } } },
      ];
    }

    const documents = await db.studentDocument.findMany({
      where: whereCondition,
      include: {
        student: { select: { id: true, name: true, student_code: true, photo: true } },
        uploaded_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error("GET Student Documents API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch student documents" }, { status: 500 });
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
      return NextResponse.json({ error: "Forbidden: Students cannot upload official student documents." }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, document_type, document_name, file_url, notes, visible_to_student } = body;

    if (!student_id || !document_type || !document_name || !file_url) {
      return NextResponse.json(
        { error: "student_id, document_type, document_name, and file_url are required fields." },
        { status: 400 }
      );
    }

    const student = await db.student.findFirst({
      where: { id: student_id, institute_id: institute.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found in this institute." }, { status: 404 });
    }

    const doc = await db.studentDocument.create({
      data: {
        institute_id: institute.id,
        student_id: student.id,
        document_type: document_type.trim(),
        document_name: document_name.trim(),
        file_url: file_url.trim(),
        notes: notes?.trim() || null,
        visible_to_student: Boolean(visible_to_student),
        uploaded_by_id: user.id,
      },
      include: {
        student: { select: { name: true, student_code: true } },
        uploaded_by: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully.",
      document: doc,
    });
  } catch (error: any) {
    console.error("POST Student Document API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}

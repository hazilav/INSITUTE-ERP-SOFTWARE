import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentIdFilter = searchParams.get("student_id");
    const courseIdFilter = searchParams.get("course_id");
    const certTypeFilter = searchParams.get("certificate_type");
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("query");

    const authContext = await getAuthenticatedUser();
    const studentContext = await getAuthenticatedStudent();

    if (!authContext && !studentContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (studentContext && !authContext) {
      // Student portal - return issued certificates for student
      const certificates = await db.certificate.findMany({
        where: {
          institute_id: studentContext.institute.id,
          student_id: studentContext.student.id,
          status: "Issued",
        },
        include: {
          course: { select: { name: true } },
          institute: { select: { name: true, logo: true } },
        },
        orderBy: { issue_date: "desc" },
      });

      return NextResponse.json({ success: true, certificates });
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

    if (courseIdFilter && courseIdFilter !== "ALL") {
      whereCondition.course_id = courseIdFilter;
    }

    if (certTypeFilter && certTypeFilter !== "ALL") {
      whereCondition.certificate_type = certTypeFilter;
    }

    if (statusFilter && statusFilter !== "ALL") {
      whereCondition.status = statusFilter;
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      whereCondition.OR = [
        { certificate_number: { contains: q } },
        { student: { name: { contains: q } } },
        { student: { student_code: { contains: q } } },
      ];
    }

    const certificates = await db.certificate.findMany({
      where: whereCondition,
      include: {
        student: { select: { id: true, name: true, student_code: true, photo: true } },
        course: { select: { id: true, name: true } },
        generated_by: { select: { id: true, name: true } },
      },
      orderBy: { issue_date: "desc" },
    });

    return NextResponse.json({
      success: true,
      certificates,
    });
  } catch (error: any) {
    console.error("GET Certificates API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch certificates" }, { status: 500 });
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
      return NextResponse.json({ error: "Forbidden: Students cannot generate certificates." }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, course_id, certificate_type, issue_date, custom_cert_number } = body;

    if (!student_id || !certificate_type) {
      return NextResponse.json({ error: "student_id and certificate_type are required." }, { status: 400 });
    }

    const student = await db.student.findFirst({
      where: { id: student_id, institute_id: institute.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found in this institute." }, { status: 404 });
    }

    // Unique Certificate Number Generation
    let certNum = custom_cert_number?.trim();
    if (!certNum) {
      const year = new Date().getFullYear();
      const count = await db.certificate.count({ where: { institute_id: institute.id } });
      certNum = `CERT-${year}-${(count + 1).toString().padStart(5, "0")}`;
    }

    // Check duplicate certificate number
    const existingCert = await db.certificate.findFirst({
      where: { institute_id: institute.id, certificate_number: certNum },
    });

    if (existingCert) {
      return NextResponse.json({ error: `Certificate number ${certNum} already exists.` }, { status: 400 });
    }

    const certificate = await db.certificate.create({
      data: {
        institute_id: institute.id,
        student_id: student.id,
        course_id: course_id || student.course_id || null,
        certificate_type: certificate_type.trim(),
        certificate_number: certNum,
        issue_date: issue_date ? new Date(issue_date) : new Date(),
        status: "Issued",
        generated_by_id: user.id,
      },
      include: {
        student: { select: { id: true, name: true, student_code: true } },
        course: { select: { id: true, name: true } },
        institute: { select: { name: true, logo: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Certificate ${certificate.certificate_number} generated successfully.`,
      certificate,
    });
  } catch (error: any) {
    console.error("POST Generate Certificate API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate certificate" }, { status: 500 });
  }
}

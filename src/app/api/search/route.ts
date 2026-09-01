import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: { students: [], staff: [], courses: [], batches: [], classes: [], tasks: [], certificates: [] },
      });
    }

    const authContext = await getAuthenticatedUser();
    const studentContext = await getAuthenticatedStudent();

    if (!authContext && !studentContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Student Portal Search
    if (studentContext && !authContext) {
      const { student, institute } = studentContext;

      const [classes, tasks, certificates] = await Promise.all([
        db.class.findMany({
          where: {
            institute_id: institute.id,
            OR: [{ title: { contains: query } }, { topic: { contains: query } }],
          },
          select: { id: true, title: true, date: true, start_time: true },
          take: 5,
        }),
        db.studentTask.findMany({
          where: {
            institute_id: institute.id,
            student_id: student.id,
            title: { contains: query },
          },
          select: { id: true, title: true, status: true },
          take: 5,
        }),
        db.certificate.findMany({
          where: {
            institute_id: institute.id,
            student_id: student.id,
            status: "Issued",
            OR: [{ certificate_number: { contains: query } }, { certificate_type: { contains: query } }],
          },
          select: { id: true, certificate_number: true, certificate_type: true },
          take: 5,
        }),
      ]);

      return NextResponse.json({
        success: true,
        results: {
          students: [],
          staff: [],
          courses: [],
          batches: [],
          classes: classes.map((c) => ({ ...c, url: "/student/classes" })),
          tasks: tasks.map((t) => ({ ...t, url: "/student/tasks" })),
          certificates: certificates.map((c) => ({ ...c, url: "/student/certificates" })),
        },
      });
    }

    // Staff / Admin Search
    const { user, institute } = authContext!;

    const [students, staff, courses, batches, classes, tasks, certificates] = await Promise.all([
      db.student.findMany({
        where: {
          institute_id: institute.id,
          is_archived: false,
          OR: [{ name: { contains: query } }, { student_code: { contains: query } }, { phone: { contains: query } }],
        },
        select: { id: true, name: true, student_code: true },
        take: 5,
      }),
      db.user.findMany({
        where: {
          institute_id: institute.id,
          role: { in: ["ADMIN", "STAFF", "MENTOR"] },
          OR: [{ name: { contains: query } }, { email: { contains: query } }],
        },
        select: { id: true, name: true, role: true },
        take: 5,
      }),
      db.course.findMany({
        where: {
          institute_id: institute.id,
          OR: [{ name: { contains: query } }, { code: { contains: query } }],
        },
        select: { id: true, name: true, code: true },
        take: 5,
      }),
      db.batch.findMany({
        where: {
          institute_id: institute.id,
          OR: [{ name: { contains: query } }, { code: { contains: query } }],
        },
        select: { id: true, name: true, code: true },
        take: 5,
      }),
      db.class.findMany({
        where: {
          institute_id: institute.id,
          OR: [{ title: { contains: query } }, { topic: { contains: query } }],
        },
        select: { id: true, title: true, date: true },
        take: 5,
      }),
      db.studentTask.findMany({
        where: {
          institute_id: institute.id,
          title: { contains: query },
        },
        select: { id: true, title: true, status: true },
        take: 5,
      }),
      db.certificate.findMany({
        where: {
          institute_id: institute.id,
          OR: [{ certificate_number: { contains: query } }, { certificate_type: { contains: query } }],
        },
        select: { id: true, certificate_number: true, certificate_type: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      results: {
        students: students.map((s) => ({ id: s.id, title: `${s.name} (${s.student_code})`, url: `/dashboard/students/${s.id}` })),
        staff: staff.map((st) => ({ id: st.id, title: `${st.name} [${st.role}]`, url: `/dashboard/staff/${st.id}` })),
        courses: courses.map((c) => ({ id: c.id, title: c.name, url: `/dashboard/courses/${c.id}` })),
        batches: batches.map((b) => ({ id: b.id, title: b.name, url: `/dashboard/batches/${b.id}` })),
        classes: classes.map((c) => ({ id: c.id, title: c.title, url: `/dashboard/classes/timetable` })),
        tasks: tasks.map((t) => ({ id: t.id, title: t.title, url: `/dashboard/reports/staff-tasks` })),
        certificates: certificates.map((c) => ({ id: c.id, title: `${c.certificate_number} (${c.certificate_type})`, url: `/dashboard/students/certificates` })),
      },
    });
  } catch (error: any) {
    console.error("Global Search API Error:", error);
    return NextResponse.json({ error: error.message || "Global search failed" }, { status: 500 });
  }
}

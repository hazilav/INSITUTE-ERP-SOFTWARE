import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Only Institute OWNER can export institute data." }, { status: 403 });
    }

    const [students, courses, batches, classes, staff, feePlans, certificates] = await Promise.all([
      db.student.findMany({ where: { institute_id: institute.id } }),
      db.course.findMany({ where: { institute_id: institute.id } }),
      db.batch.findMany({ where: { institute_id: institute.id } }),
      db.class.findMany({ where: { institute_id: institute.id } }),
      db.staffProfile.findMany({ where: { institute_id: institute.id } }),
      db.feePlan.findMany({ where: { institute_id: institute.id } }),
      db.certificate.findMany({ where: { institute_id: institute.id } }),
    ]);

    const backupData = {
      export_date: new Date().toISOString(),
      institute: {
        id: institute.id,
        name: institute.name,
        email: institute.email,
        phone: institute.phone,
      },
      counts: {
        students: students.length,
        courses: courses.length,
        batches: batches.length,
        classes: classes.length,
        staff: staff.length,
        fee_plans: feePlans.length,
        certificates: certificates.length,
      },
      data: {
        students,
        courses,
        batches,
        classes,
        staff,
        feePlans,
        certificates,
      },
    };

    const fileName = `${institute.name.replace(/[^a-zA-Z0-9]/g, "_")}_backup_${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("GET Export Institute Data Error:", error);
    return NextResponse.json({ error: error.message || "Failed to export institute data" }, { status: 500 });
  }
}

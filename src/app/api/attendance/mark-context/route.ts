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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id");
    const classId = searchParams.get("class_id");

    if (!batchId || !classId) {
      return NextResponse.json(
        { error: "batch_id and class_id parameters are required." },
        { status: 400 }
      );
    }

    // Verify class & batch belong to current active institute
    const classItem = await db.class.findFirst({
      where: { id: classId, batch_id: batchId, institute_id: institute.id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!classItem) {
      return NextResponse.json(
        { error: "Class and Batch pair not found for your institute." },
        { status: 404 }
      );
    }

    // Fetch enrolled active students in that batch
    const students = await db.student.findMany({
      where: {
        institute_id: institute.id,
        batch_id: batchId,
        is_archived: false,
      },
      select: {
        id: true,
        student_code: true,
        name: true,
        phone: true,
        photo: true,
        status: true,
        learning_mode: true,
      },
      orderBy: { name: "asc" },
    });

    // Fetch existing marked attendance records for this class
    const existingRecords = await db.attendanceRecord.findMany({
      where: {
        institute_id: institute.id,
        class_id: classId,
      },
      select: {
        id: true,
        student_id: true,
        status: true,
        remarks: true,
      },
    });

    return NextResponse.json({
      success: true,
      classItem,
      students,
      existingRecords,
    });
  } catch (error) {
    console.error("GET Attendance Mark Context API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance context" },
      { status: 500 }
    );
  }
}

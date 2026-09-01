import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkClassConflicts } from "@/lib/timetable";

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

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can reschedule classes." }, { status: 403 });
    }

    const classItem = await db.class.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!classItem) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const body = await request.json();
    const { date, start_time, end_time, room_id, mentor_id, reason } = body;

    if (!date || !start_time || !end_time) {
      return NextResponse.json({ error: "date, start_time, and end_time are required." }, { status: 400 });
    }

    const targetDate = new Date(date);
    const targetMentorId = mentor_id || classItem.mentor_id;
    const targetRoomId = room_id !== undefined ? room_id : classItem.room_id;

    // Conflict Check
    const conflictRes = await checkClassConflicts({
      institute_id: institute.id,
      date: targetDate,
      start_time,
      end_time,
      mentor_id: targetMentorId,
      room_id: targetRoomId,
      batch_id: classItem.batch_id,
      excludeClassId: classItem.id,
    });

    if (conflictRes.hasConflict) {
      return NextResponse.json({
        error: "Conflict detected while rescheduling class.",
        conflicts: conflictRes.conflicts,
      }, { status: 409 });
    }

    let roomNameStr = classItem.room;
    if (targetRoomId) {
      const roomObj = await db.room.findUnique({ where: { id: targetRoomId } });
      if (roomObj) roomNameStr = `${roomObj.name} (${roomObj.room_number})`;
    }

    const previousValues = {
      date: classItem.date,
      start_time: classItem.start_time,
      end_time: classItem.end_time,
      mentor_id: classItem.mentor_id,
      room_id: classItem.room_id,
    };

    const newValues = {
      date: targetDate,
      start_time,
      end_time,
      mentor_id: targetMentorId,
      room_id: targetRoomId,
      reason: reason || "Rescheduled by admin",
    };

    const updated = await db.class.update({
      where: { id: classItem.id },
      data: {
        date: targetDate,
        start_time,
        end_time,
        mentor_id: targetMentorId,
        room_id: targetRoomId,
        room: roomNameStr,
        status: "Rescheduled",
      },
    });

    // Save Audit Entry
    await db.classAuditHistory.create({
      data: {
        institute_id: institute.id,
        class_id: classItem.id,
        user_id: user.id,
        action: "Rescheduled",
        previous_values: JSON.stringify(previousValues),
        new_values: JSON.stringify(newValues),
      },
    });

    // Notify Batch Students & Mentor
    const batchStudents = await db.student.findMany({
      where: { institute_id: institute.id, batch_id: classItem.batch_id, status: "Active" },
      select: { user_id: true },
    });

    const notifPromises = [];
    for (const s of batchStudents) {
      if (!s.user_id) continue;
      notifPromises.push(
        db.notification.create({
          data: {
            institute_id: institute.id,
            recipient_user_id: s.user_id,
            type: "CLASS",
            category: "Academic",
            title: "Class Rescheduled",
            message: `Class "${classItem.title}" has been rescheduled to ${targetDate.toLocaleDateString()} at ${start_time}.`,
            priority: "HIGH",
            related_entity_type: "CLASS",
            related_entity_id: classItem.id,
            action_url: "/student/classes",
          },
        })
      );
    }

    if (targetMentorId) {
      notifPromises.push(
        db.notification.create({
          data: {
            institute_id: institute.id,
            recipient_user_id: targetMentorId,
            type: "CLASS",
            category: "Academic",
            title: "Class Schedule Changed",
            message: `Class "${classItem.title}" assigned to you has been rescheduled to ${targetDate.toLocaleDateString()} at ${start_time}.`,
            priority: "HIGH",
            related_entity_type: "CLASS",
            related_entity_id: classItem.id,
            action_url: "/dashboard/classes",
          },
        })
      );
    }

    await Promise.allSettled(notifPromises);

    return NextResponse.json({
      success: true,
      message: "Class rescheduled successfully.",
      class: updated,
    });
  } catch (error: any) {
    console.error("POST Reschedule Class API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to reschedule class" }, { status: 500 });
  }
}

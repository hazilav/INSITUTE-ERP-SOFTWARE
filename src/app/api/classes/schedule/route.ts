import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkClassConflicts, checkClassWarnings } from "@/lib/timetable";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can schedule classes." }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      topic,
      description,
      course_id,
      batch_id,
      mentor_id,
      class_type, // "physical" | "live_online" | "hybrid"
      date,
      start_time,
      end_time,
      room_id,
      meeting_platform,
      meeting_link,
      meeting_id,
      meeting_password,
      activity_id,
      is_recurring,
      recurrence_type, // "daily" | "weekly" | "custom"
      days_of_week, // Array like ["MON", "WED", "FRI"]
      end_date,
      ignore_warnings,
    } = body;

    if (!title || !course_id || !batch_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "title, course_id, batch_id, date, start_time, and end_time are required fields." },
        { status: 400 }
      );
    }

    // Determine dates to generate
    const startDateObj = new Date(date);
    const targetDates: Date[] = [startDateObj];

    if (is_recurring && end_date) {
      const endDateObj = new Date(end_date);
      let curr = new Date(startDateObj);
      curr.setDate(curr.getDate() + 1);

      const dayMap: { [key: string]: number } = {
        SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
      };

      const selectedDays = Array.isArray(days_of_week)
        ? days_of_week.map((d: string) => dayMap[d.toUpperCase()])
        : [];

      while (curr <= endDateObj) {
        if (recurrence_type === "daily") {
          targetDates.push(new Date(curr));
        } else if (recurrence_type === "weekly" || recurrence_type === "custom") {
          if (selectedDays.length === 0 || selectedDays.includes(curr.getDay())) {
            targetDates.push(new Date(curr));
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    // Run Conflict Checks on all target dates
    const allConflicts: string[] = [];
    const allWarnings: string[] = [];

    for (const d of targetDates) {
      const conflictRes = await checkClassConflicts({
        institute_id: institute.id,
        date: d,
        start_time,
        end_time,
        mentor_id,
        room_id,
        batch_id,
      });

      if (conflictRes.hasConflict) {
        allConflicts.push(...conflictRes.conflicts);
      }

      const warningRes = await checkClassWarnings({
        institute_id: institute.id,
        date: d,
        start_time,
        end_time,
        mentor_id,
        room_id,
        batch_id,
      });

      if (warningRes.warnings.length > 0) {
        allWarnings.push(...warningRes.warnings);
      }
    }

    if (allConflicts.length > 0) {
      return NextResponse.json({
        error: "Conflict detected while scheduling class.",
        conflicts: Array.from(new Set(allConflicts)),
      }, { status: 409 });
    }

    // Room lookup for room string fallback
    let roomNameStr: string | null = null;
    if (room_id) {
      const roomObj = await db.room.findUnique({ where: { id: room_id } });
      if (roomObj) roomNameStr = `${roomObj.name} (${roomObj.room_number})`;
    }

    // Create Class records
    const createdClasses = [];
    for (const d of targetDates) {
      const classItem = await db.class.create({
        data: {
          institute_id: institute.id,
          course_id,
          batch_id,
          mentor_id: mentor_id || null,
          title: title.trim(),
          topic: topic?.trim() || null,
          description: description?.trim() || null,
          class_type: class_type || "physical",
          date: d,
          start_time,
          end_time,
          room: roomNameStr,
          room_id: room_id || null,
          meeting_platform: meeting_platform || null,
          meeting_link: meeting_link?.trim() || null,
          meeting_id: meeting_id?.trim() || null,
          meeting_password: meeting_password?.trim() || null,
          activity_id: activity_id || null,
          created_by_id: user.id,
          status: "Scheduled",
        },
      });

      // Log Audit History
      await db.classAuditHistory.create({
        data: {
          institute_id: institute.id,
          class_id: classItem.id,
          user_id: user.id,
          action: "Created",
          new_values: JSON.stringify({
            title: classItem.title,
            date: classItem.date,
            start_time: classItem.start_time,
            end_time: classItem.end_time,
            class_type: classItem.class_type,
          }),
        },
      });

      createdClasses.push(classItem);
    }

    // Save RecurringSchedule entry if applicable
    if (is_recurring && end_date) {
      await db.recurringSchedule.create({
        data: {
          institute_id: institute.id,
          course_id,
          batch_id,
          mentor_id: mentor_id || null,
          title: title.trim(),
          class_type: class_type || "physical",
          recurrence_type: recurrence_type || "weekly",
          days_of_week: Array.isArray(days_of_week) ? days_of_week.join(",") : null,
          start_date: startDateObj,
          end_date: new Date(end_date),
          start_time,
          end_time,
          room_id: room_id || null,
          meeting_link: meeting_link?.trim() || null,
          created_by_id: user.id,
        },
      });
    }

    // Trigger Notification for Batch Students
    const batchStudents = await db.student.findMany({
      where: { institute_id: institute.id, batch_id, status: "Active" },
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
            title: "New Class Scheduled",
            message: `Class "${title}" has been scheduled for ${startDateObj.toLocaleDateString()} at ${start_time}.`,
            priority: "NORMAL",
            related_entity_type: "CLASS",
            related_entity_id: createdClasses[0].id,
            action_url: "/student/classes",
          },
        })
      );
    }

    if (mentor_id) {
      notifPromises.push(
        db.notification.create({
          data: {
            institute_id: institute.id,
            recipient_user_id: mentor_id,
            type: "CLASS",
            category: "Academic",
            title: "Class Assigned to You",
            message: `You are assigned to mentor "${title}" on ${startDateObj.toLocaleDateString()} at ${start_time}.`,
            priority: "HIGH",
            related_entity_type: "CLASS",
            related_entity_id: createdClasses[0].id,
            action_url: "/dashboard/classes",
          },
        })
      );
    }

    await Promise.allSettled(notifPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${createdClasses.length} class session(s).`,
      count: createdClasses.length,
      warnings: Array.from(new Set(allWarnings)),
      classes: createdClasses,
    });
  } catch (error: any) {
    console.error("POST Schedule Class API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to schedule class" }, { status: 500 });
  }
}

import { db } from "@/lib/db";

/**
 * Converts time strings like "10:00 AM", "14:30", "09:15 PM" to total minutes from midnight.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleanStr = timeStr.trim().toUpperCase();

  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");

  const rawTime = cleanStr.replace("AM", "").replace("PM", "").trim();
  const [hoursStr, minutesStr] = rawTime.split(":");
  let hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Checks if two time intervals [start1, end1] and [start2, end2] overlap.
 */
export function doTimesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return Math.max(s1, s2) < Math.min(e1, e2);
}

export interface ConflictCheckParams {
  institute_id: string;
  date: Date | string;
  start_time: string;
  end_time: string;
  mentor_id?: string | null;
  room_id?: string | null;
  batch_id: string;
  excludeClassId?: string | null;
}

export async function checkClassConflicts(params: ConflictCheckParams) {
  const { institute_id, date, start_time, end_time, mentor_id, room_id, batch_id, excludeClassId } = params;

  const targetDate = new Date(date);
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  // Fetch existing scheduled / live / rescheduled classes on that day
  const existingClasses = await db.class.findMany({
    where: {
      institute_id,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["Scheduled", "Live", "Rescheduled"] },
      ...(excludeClassId ? { id: { not: excludeClassId } } : {}),
    },
    include: {
      mentor: { select: { name: true } },
      roomItem: { select: { name: true, room_number: true } },
      batch: { select: { name: true } },
    },
  });

  let mentorConflict = false;
  let roomConflict = false;
  let batchConflict = false;
  const conflicts: string[] = [];

  for (const cls of existingClasses) {
    if (!cls.start_time || !cls.end_time) continue;

    if (doTimesOverlap(start_time, end_time, cls.start_time, cls.end_time)) {
      // 1. Mentor Conflict
      if (mentor_id && cls.mentor_id === mentor_id) {
        mentorConflict = true;
        conflicts.push(`Mentor is already scheduled during this time (${cls.title} for ${cls.batch.name} at ${cls.start_time} - ${cls.end_time}).`);
      }

      // 2. Room Conflict
      if (room_id && cls.room_id === room_id) {
        roomConflict = true;
        conflicts.push(`Room is already booked during this time (${cls.title} for ${cls.batch.name} at ${cls.start_time} - ${cls.end_time}).`);
      }

      // 3. Batch Conflict
      if (cls.batch_id === batch_id) {
        batchConflict = true;
        conflicts.push(`This batch already has a class during this time (${cls.title} at ${cls.start_time} - ${cls.end_time}).`);
      }
    }
  }

  return {
    hasConflict: mentorConflict || roomConflict || batchConflict,
    mentorConflict,
    roomConflict,
    batchConflict,
    conflicts,
  };
}

export async function checkClassWarnings(params: ConflictCheckParams) {
  const { institute_id, date, mentor_id, room_id, batch_id } = params;

  let capacityWarning: string | null = null;
  let mentorLeaveWarning: string | null = null;
  const warnings: string[] = [];

  // 1. Capacity Warning Check
  if (room_id && batch_id) {
    const [room, batchStudentCount] = await Promise.all([
      db.room.findUnique({ where: { id: room_id } }),
      db.student.count({ where: { institute_id, batch_id, status: "Active" } }),
    ]);

    if (room && batchStudentCount > room.capacity) {
      capacityWarning = `Room capacity (${room.capacity}) is lower than the current batch size (${batchStudentCount} active students).`;
      warnings.push(capacityWarning);
    }
  }

  // 2. Mentor Approved Leave Check
  if (mentor_id) {
    const targetDate = new Date(date);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

    const staffProfile = await db.staffProfile.findUnique({
      where: { user_id: mentor_id },
    });

    if (staffProfile) {
      const leaveOnDate = await db.leaveRequest.findFirst({
        where: {
          institute_id,
          staff_id: staffProfile.id,
          status: "Approved",
          start_date: { lte: dayStart },
          end_date: { gte: dayStart },
        },
      });

      if (leaveOnDate) {
        mentorLeaveWarning = `Mentor is on approved leave (${leaveOnDate.leave_type}) during this class.`;
        warnings.push(mentorLeaveWarning);
      }
    }
  }

  return {
    capacityWarning,
    mentorLeaveWarning,
    warnings,
  };
}

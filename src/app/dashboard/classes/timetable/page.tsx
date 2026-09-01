import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import TimetableClient from "./TimetableClient";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const authContext = await getAuthenticatedUser();

  if (!authContext) redirect("/login");
  if (authContext.user.role === "STUDENT") redirect("/student/classes");

  const { user, institute } = authContext;

  const [courses, batches, mentors, rooms] = await Promise.all([
    db.course.findMany({ where: { institute_id: institute.id }, select: { id: true, name: true } }),
    db.batch.findMany({ where: { institute_id: institute.id }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { institute_id: institute.id, role: { in: ["MENTOR", "STAFF", "ADMIN", "OWNER"] } },
      select: { id: true, name: true },
    }),
    db.room.findMany({ where: { institute_id: institute.id, status: "Available" }, select: { id: true, name: true, room_number: true, capacity: true } }),
  ]);

  return (
    <TimetableClient
      instituteName={institute.name}
      userRole={user.role}
      userId={user.id}
      courses={courses}
      batches={batches}
      mentors={mentors}
      rooms={rooms}
    />
  );
}

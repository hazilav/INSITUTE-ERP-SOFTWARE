import { getAuthenticatedUser } from "./auth";
import { db } from "./db";

export async function getAuthenticatedStudent() {
  const authContext = await getAuthenticatedUser();
  if (!authContext) return null;

  const { user, institute } = authContext;

  const student = await db.student.findFirst({
    where: {
      user_id: user.id,
      institute_id: institute.id,
      is_archived: false,
    },
    include: {
      course: { select: { id: true, name: true, code: true, learning_mode: true } },
      batch: { select: { id: true, name: true, code: true, learning_mode: true } },
    },
  });

  if (!student || student.status === "ARCHIVED") return null;

  return {
    user,
    institute,
    student,
  };
}

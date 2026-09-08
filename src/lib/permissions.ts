/**
 * Role Permissions & Security Engine for Institute Management CRM
 */

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ["*"], // Full system access
  ADMIN: [
    "students.view",
    "students.edit",
    "students.manage",
    "students.freeze",
    "students.unfreeze",
    "courses.view",
    "courses.manage",
    "batches.view",
    "batches.manage",
    "classes.view",
    "classes.manage",
    "attendance.view",
    "attendance.mark",
    "activities.view",
    "activities.manage",
    "marks.view",
    "marks.manage",
    "fees.view",
    "fees.manage",
    "staff.view",
    "staff.manage",
    "recorded_classes.view",
    "recorded_classes.upload",
    "recorded_classes.edit",
    "recorded_classes.delete",
    "recorded_classes.publish",
  ],
  STAFF: [
    "students.view",
    "students.edit",
    "courses.view",
    "batches.view",
    "classes.view",
    "classes.manage",
    "attendance.view",
    "attendance.mark",
    "activities.view",
    "activities.manage",
    "marks.view",
    "fees.view",
    "fees.manage",
    "staff.view",
    "recorded_classes.view",
  ],
  MENTOR: [
    "students.view",
    "courses.view",
    "batches.view",
    "classes.view",
    "attendance.view",
    "attendance.mark",
    "activities.view",
    "activities.manage",
    "marks.view",
    "marks.manage",
    "recorded_classes.view",
  ],
  STUDENT: [
    "profile.self",
    "classes.self",
    "attendance.self",
    "activities.self",
    "marks.self",
    "fees.self",
    "recorded_classes.self",
  ],
};

export function hasPermission(role: string, permissionKey: string): boolean {
  if (!role) return false;
  const uppercaseRole = role.toUpperCase();
  const permissions = ROLE_PERMISSIONS[uppercaseRole] || [];

  if (permissions.includes("*")) return true;
  return permissions.includes(permissionKey);
}

export function generateEmployeeId(prefix = "EMP"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

export function canStaffPerformRecordedClassAction(params: {
  role: string;
  userId?: string;
  staffPermissions?: string | string[] | null;
  action: "view" | "upload" | "edit" | "delete" | "publish";
  creatorId?: string | null;
  assignedCourseId?: string | null;
  courseId?: string | null;
}): boolean {
  const { role, userId, staffPermissions, action, creatorId, assignedCourseId, courseId } = params;

  if (role === "OWNER" || role === "ADMIN") {
    return true;
  }

  if (role === "STUDENT") {
    return action === "view";
  }

  if (role !== "STAFF" && role !== "MENTOR") {
    return false;
  }

  // Parse permissions from StaffProfile
  let permsList: string[] = [];
  if (Array.isArray(staffPermissions)) {
    permsList = staffPermissions.map((p) => p.toLowerCase());
  } else if (typeof staffPermissions === "string") {
    permsList = staffPermissions.split(",").map((p) => p.trim().toLowerCase());
  }

  const hasGeneralRecordedAccess =
    permsList.includes("recorded_classes") ||
    permsList.includes("recorded_content") ||
    permsList.includes("classes") ||
    permsList.includes("courses");

  if (action === "view") {
    // Staff/Mentors can view if assigned to course, or if general access granted
    if (!assignedCourseId || !courseId) return true;
    return assignedCourseId === courseId || hasGeneralRecordedAccess;
  }

  if (action === "upload") {
    return (
      hasGeneralRecordedAccess ||
      permsList.includes("recorded_classes.upload") ||
      permsList.includes("upload_recorded")
    );
  }

  if (action === "edit") {
    // Allow editing if they created it OR have explicit edit permission
    if (creatorId && userId && creatorId === userId) return true;
    return (
      permsList.includes("recorded_classes.edit") ||
      permsList.includes("edit_recorded")
    );
  }

  if (action === "publish") {
    return (
      permsList.includes("recorded_classes.publish") ||
      permsList.includes("publish_recorded")
    );
  }

  if (action === "delete") {
    // Only with explicit delete permission or Owner/Admin
    return (
      permsList.includes("recorded_classes.delete") ||
      permsList.includes("delete_recorded")
    );
  }

  return false;
}

export function canUserManageStudentFreeze(params: {
  role: string;
  staffPermissions?: string | string[] | null;
  action: "freeze" | "unfreeze";
}): boolean {
  const { role, staffPermissions, action } = params;

  if (role === "OWNER" || role === "ADMIN") {
    return true;
  }

  if (role !== "STAFF" && role !== "MENTOR") {
    return false;
  }

  let permsList: string[] = [];
  if (Array.isArray(staffPermissions)) {
    permsList = staffPermissions.map((p) => p.toLowerCase());
  } else if (typeof staffPermissions === "string") {
    permsList = staffPermissions.split(",").map((p) => p.trim().toLowerCase());
  }

  const permKey = action === "freeze" ? "students.freeze" : "students.unfreeze";
  return (
    permsList.includes(permKey) ||
    permsList.includes("students.manage") ||
    permsList.includes("*")
  );
}


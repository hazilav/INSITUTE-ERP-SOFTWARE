/**
 * Role Permissions & Security Engine for Institute Management CRM
 */

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ["*"], // Full system access
  ADMIN: [
    "students.view",
    "students.edit",
    "students.manage",
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
  ],
  STUDENT: [
    "profile.self",
    "classes.self",
    "attendance.self",
    "activities.self",
    "marks.self",
    "fees.self",
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

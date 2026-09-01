import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MODULE_KEYS = [
  "students",
  "courses",
  "classes",
  "attendance",
  "activities",
  "marks",
  "fees",
  "staff",
  "tasks",
  "reports",
  "documents",
  "settings",
];

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const permissions = await db.rolePermission.findMany({
      where: { institute_id: authContext.institute.id },
    });

    return NextResponse.json({ success: true, permissions, module_keys: MODULE_KEYS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (authContext.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Only Institute OWNER can configure role permissions." }, { status: 403 });
    }

    const body = await request.json();
    const { permissions } = body; // Array of { role, module_key, is_allowed }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "permissions array required." }, { status: 400 });
    }

    for (const p of permissions) {
      if (["ADMIN", "STAFF", "MENTOR"].includes(p.role) && MODULE_KEYS.includes(p.module_key)) {
        await db.rolePermission.upsert({
          where: {
            institute_id_role_module_key: {
              institute_id: authContext.institute.id,
              role: p.role,
              module_key: p.module_key,
            },
          },
          update: { is_allowed: Boolean(p.is_allowed) },
          create: {
            institute_id: authContext.institute.id,
            role: p.role,
            module_key: p.module_key,
            is_allowed: Boolean(p.is_allowed),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Role permissions updated successfully.",
    });
  } catch (error: any) {
    console.error("POST Role Permissions Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update permissions" }, { status: 500 });
  }
}

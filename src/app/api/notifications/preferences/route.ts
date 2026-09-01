import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Academic", "Attendance", "Finance", "Tasks", "System"];

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    const existingPrefs = await db.notificationPreference.findMany({
      where: {
        institute_id: institute.id,
        user_id: user.id,
      },
    });

    const prefsMap: Record<string, boolean> = {};
    CATEGORIES.forEach((cat) => {
      const match = existingPrefs.find((p) => p.category === cat);
      prefsMap[cat] = match ? match.enabled : true;
    });

    return NextResponse.json({
      success: true,
      preferences: prefsMap,
    });
  } catch (error: any) {
    console.error("GET Preferences API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;
    const body = await request.json();
    const { category, enabled } = body;

    if (!category || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Category and enabled boolean required" }, { status: 400 });
    }

    if (category === "Account" || category === "Security") {
      return NextResponse.json(
        { error: "Security and Account notifications cannot be disabled." },
        { status: 400 }
      );
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const updated = await db.notificationPreference.upsert({
      where: {
        institute_id_user_id_category: {
          institute_id: institute.id,
          user_id: user.id,
          category,
        },
      },
      update: { enabled },
      create: {
        institute_id: institute.id,
        user_id: user.id,
        category,
        enabled,
      },
    });

    return NextResponse.json({ success: true, preference: updated });
  } catch (error: any) {
    console.error("PATCH Preferences API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification preference" },
      { status: 500 }
    );
  }
}

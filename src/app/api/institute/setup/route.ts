import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { user, institute } = authContext;

    // Role check: Only OWNER (or ADMIN) can configure institute operation mode
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only the Institute Owner or Admin can update institute mode settings." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { institute_mode } = body;

    if (!["offline", "online", "hybrid"].includes(institute_mode)) {
      return NextResponse.json(
        { error: "Invalid institute mode. Must be 'offline', 'online', or 'hybrid'." },
        { status: 400 }
      );
    }

    // Scoped update enforcing multi-tenancy by institute_id
    const updatedInstitute = await db.institute.update({
      where: { id: institute.id },
      data: { institute_mode },
    });

    return NextResponse.json({
      success: true,
      institute: updatedInstitute,
    });
  } catch (error) {
    console.error("Institute setup API error:", error);
    return NextResponse.json(
      { error: "Failed to update institute setup mode" },
      { status: 500 }
    );
  }
}

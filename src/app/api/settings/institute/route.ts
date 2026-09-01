import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const institute = await db.institute.findUnique({
      where: { id: authContext.institute.id },
    });

    return NextResponse.json({ success: true, institute });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch institute settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can edit institute settings." }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      logo,
      phone,
      email,
      website,
      address,
      city,
      state,
      country,
      institute_mode,
      is_deactivated,
    } = body;

    const updated = await db.institute.update({
      where: { id: institute.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(logo !== undefined && { logo }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
        ...(institute_mode && { institute_mode }),
        ...(is_deactivated !== undefined && user.role === "OWNER" && { is_deactivated: Boolean(is_deactivated) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Institute information updated successfully.",
      institute: updated,
    });
  } catch (error: any) {
    console.error("PUT Institute Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update institute settings" }, { status: 500 });
  }
}

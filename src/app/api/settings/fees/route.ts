import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, institute } = authContext;
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can update fee settings." }, { status: 403 });
    }

    const body = await request.json();
    const { default_currency, payment_methods, fee_reminder_days } = body;

    const updated = await db.institute.update({
      where: { id: institute.id },
      data: {
        ...(default_currency && { default_currency: default_currency.trim() }),
        ...(payment_methods !== undefined && { payment_methods: payment_methods }),
        ...(fee_reminder_days !== undefined && { fee_reminder_days: parseInt(fee_reminder_days) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fee settings updated successfully.",
      institute: updated,
    });
  } catch (error: any) {
    console.error("PUT Fee Settings Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update fee settings" }, { status: 500 });
  }
}

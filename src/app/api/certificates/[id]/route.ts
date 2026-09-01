import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only OWNER or ADMIN can revoke or edit certificates." }, { status: 403 });
    }

    const cert = await db.certificate.findFirst({
      where: { id: params.id, institute_id: institute.id },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status } = body; // "Draft", "Issued", "Revoked"

    if (!status) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    const updated = await db.certificate.update({
      where: { id: cert.id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: `Certificate status updated to '${status}'. History retained.`,
      certificate: updated,
    });
  } catch (error: any) {
    console.error("PATCH Certificate API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update certificate" }, { status: 500 });
  }
}

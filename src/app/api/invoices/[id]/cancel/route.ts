import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUserManageFees } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    let staffProfile = null;
    if (user.role === "STAFF") {
      staffProfile = await db.staffProfile.findFirst({
        where: { user_id: user.id, institute_id: institute.id },
      });
    }

    if (
      !canUserManageFees({
        role: user.role,
        staffPermissions: staffProfile?.permissions,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to cancel invoices." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required to cancel this invoice." },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        payments: { where: { is_voided: false } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.is_cancelled) {
      return NextResponse.json(
        { error: "This invoice is already cancelled." },
        { status: 400 }
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const cancelledInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          is_cancelled: true,
          status: "Cancelled",
          cancel_reason: reason,
          cancelled_at: new Date(),
          cancelled_by_id: user.id,
        },
      });

      // Audit Log in StudentActivity
      await tx.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id: invoice.student_id,
          action: "Invoice Cancelled",
          performed_by: user.name || "Administrator",
          details: `Invoice #${invoice.invoice_number} cancelled. Reason: ${reason}.`,
        },
      });

      return cancelledInvoice;
    });

    return NextResponse.json({
      success: true,
      message: "Invoice cancelled successfully.",
      invoice: updated,
    });
  } catch (error: any) {
    console.error("POST Cancel Invoice Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel invoice" },
      { status: 500 }
    );
  }
}

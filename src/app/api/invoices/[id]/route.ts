import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUserViewFees, canUserManageFees } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
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
      !canUserViewFees({
        role: user.role,
        staffPermissions: staffProfile?.permissions,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this invoice." },
        { status: 403 }
      );
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: params.id,
        institute_id: institute.id,
      },
      include: {
        student: {
          select: {
            id: true,
            student_code: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        course: { select: { id: true, name: true, code: true } },
        payments: {
          orderBy: { payment_date: "asc" },
          include: {
            recorded_by: { select: { id: true, name: true } },
            voided_by: { select: { id: true, name: true } },
          },
        },
        created_by: { select: { id: true, name: true } },
        cancelled_by: { select: { id: true, name: true } },
        institute: {
          select: {
            name: true,
            logo: true,
            phone: true,
            email: true,
            website: true,
            address: true,
            city: true,
            state: true,
            country: true,
            tax_number: true,
            tax_name: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    // If Student role, ensure student owns this invoice
    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student || student.id !== invoice.student_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error("GET Invoice Detail Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { error: "Forbidden: You do not have permission to delete invoices." },
        { status: 403 }
      );
    }

    const invoice = await db.invoice.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    // EDIT / DELETE SAFETY (Section 15):
    // For invoice deletion: Only allow deletion if appropriate and if no payment has been recorded.
    // If an invoice already has payments: Do NOT permanently delete it. Use a safe cancellation/void status instead.
    if (invoice.payments && invoice.payments.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete an invoice with recorded payments. Please cancel the invoice instead.",
        },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.invoice.delete({
        where: { id: invoice.id },
      });

      await tx.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id: invoice.student_id,
          action: "Invoice Deleted",
          performed_by: user.name || "Administrator",
          details: `Invoice #${invoice.invoice_number} was permanently removed (no payments recorded).`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE Invoice Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete invoice" },
      { status: 500 }
    );
  }
}

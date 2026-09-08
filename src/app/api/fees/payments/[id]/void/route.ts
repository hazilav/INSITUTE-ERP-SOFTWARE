import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateInvoiceStatus, roundToTwo } from "@/lib/finance";
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
        { error: "Forbidden: You do not have permission to void payments." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required to void this payment." },
        { status: 400 }
      );
    }

    const payment = await db.payment.findFirst({
      where: { id: params.id, institute_id: institute.id },
      include: {
        invoice: true,
        fee_plan: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    if (payment.is_voided) {
      return NextResponse.json(
        { error: "This payment has already been voided." },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Mark payment as voided
      const voidedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          is_voided: true,
          void_reason: reason,
          voided_at: new Date(),
          voided_by_id: user.id,
        },
      });

      // 2. Revert invoice balances if payment was for an invoice
      let updatedInvoice = null;
      if (payment.invoice) {
        const newPaid = Math.max(0, roundToTwo(payment.invoice.paid_amount - payment.amount));
        const newOutstanding = Math.max(0, roundToTwo(payment.invoice.final_amount - newPaid));
        const newStatus = calculateInvoiceStatus({
          finalAmount: payment.invoice.final_amount,
          paidAmount: newPaid,
          dueDate: payment.invoice.due_date,
          isCancelled: payment.invoice.is_cancelled,
        });

        updatedInvoice = await tx.invoice.update({
          where: { id: payment.invoice.id },
          data: {
            paid_amount: newPaid,
            outstanding_amount: newOutstanding,
            status: newStatus,
          },
        });
      }

      // 3. Revert fee_plan balances if payment was for fee_plan
      if (payment.fee_plan) {
        await tx.feePlan.update({
          where: { id: payment.fee_plan.id },
          data: {
            amount_paid: { decrement: payment.amount },
            balance: { increment: payment.amount },
          },
        });
      }

      // 4. Audit Log in StudentActivity
      await tx.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id: payment.student_id,
          action: "Payment Voided",
          performed_by: user.name || "Administrator",
          details: `Payment receipt #${payment.receipt_number} for ₹${payment.amount.toLocaleString("en-IN")} was voided. Reason: ${reason}.`,
        },
      });

      return { payment: voidedPayment, invoice: updatedInvoice };
    });

    return NextResponse.json({
      success: true,
      message: "Payment voided successfully.",
      payment: result.payment,
      invoice: result.invoice,
    });
  } catch (error: any) {
    console.error("POST Void Payment Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to void payment" },
      { status: 500 }
    );
  }
}

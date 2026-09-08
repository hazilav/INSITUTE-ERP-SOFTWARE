import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateFeeStatus,
  calculateInvoiceStatus,
  generateNextReceiptNumber,
  roundToTwo,
} from "@/lib/finance";
import { canUserViewFees, canUserManageFees } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
        { error: "Forbidden: You do not have permission to view payments." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const studentIdFilter = searchParams.get("student_id") || "";
    const invoiceIdFilter = searchParams.get("invoice_id") || "";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student) return NextResponse.json({ success: true, payments: [] });
      whereCondition.student_id = student.id;
    } else {
      if (studentIdFilter) whereCondition.student_id = studentIdFilter;
      if (invoiceIdFilter) whereCondition.invoice_id = invoiceIdFilter;
    }

    if (search) {
      whereCondition.OR = [
        { receipt_number: { contains: search, mode: "insensitive" } },
        { reference_number: { contains: search, mode: "insensitive" } },
        { student: { name: { contains: search, mode: "insensitive" } } },
        { student: { student_code: { contains: search, mode: "insensitive" } } },
        { invoice: { invoice_number: { contains: search, mode: "insensitive" } } },
      ];
    }

    const payments = await db.payment.findMany({
      where: whereCondition,
      include: {
        student: {
          select: {
            id: true,
            student_code: true,
            name: true,
            phone: true,
            email: true,
            course: { select: { name: true } },
          },
        },
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            final_amount: true,
            paid_amount: true,
            outstanding_amount: true,
            status: true,
            course: { select: { name: true } },
          },
        },
        fee_plan: {
          include: {
            course: { select: { name: true } },
          },
        },
        installment: { select: { id: true, name: true } },
        recorded_by: { select: { id: true, name: true } },
        voided_by: { select: { id: true, name: true } },
      },
      orderBy: { payment_date: "desc" },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error("GET Payments API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { error: "Forbidden: You do not have permission to record payments." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      invoice_id,
      fee_plan_id,
      installment_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
    } = body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0." },
        { status: 400 }
      );
    }

    // Process payment against Invoice (Primary workflow)
    if (invoice_id) {
      const invoice = await db.invoice.findFirst({
        where: { id: invoice_id, institute_id: institute.id },
        include: {
          student: true,
          course: true,
          fee_plan: true,
        },
      });

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      }

      if (invoice.is_cancelled) {
        return NextResponse.json(
          { error: "Cannot record payment for a cancelled invoice." },
          { status: 400 }
        );
      }

      // Check if invoice is already fully paid
      if (invoice.status === "Paid" || invoice.outstanding_amount <= 0.001) {
        return NextResponse.json(
          { error: "This invoice is already fully paid." },
          { status: 400 }
        );
      }

      if (amt > invoice.outstanding_amount + 0.01) {
        return NextResponse.json(
          {
            error: `Payment amount (₹${amt.toLocaleString("en-IN")}) cannot exceed remaining outstanding balance of ₹${invoice.outstanding_amount.toLocaleString("en-IN")}.`,
          },
          { status: 400 }
        );
      }

      const payDate = payment_date ? new Date(payment_date) : new Date();

      // Execute transaction with sequential receipt number
      const result = await db.$transaction(async (tx) => {
        const receiptNum = await generateNextReceiptNumber(institute.id, tx);

        const payment = await tx.payment.create({
          data: {
            institute_id: institute.id,
            invoice_id: invoice.id,
            fee_plan_id: invoice.fee_plan_id || fee_plan_id || null,
            student_id: invoice.student_id,
            installment_id: installment_id || null,
            receipt_number: receiptNum,
            amount: amt,
            payment_date: payDate,
            payment_method: payment_method || "Cash",
            reference_number: reference_number?.trim() || null,
            notes: notes?.trim() || null,
            recorded_by_id: user.id,
          },
        });

        const newPaidAmount = roundToTwo(invoice.paid_amount + amt);
        const newOutstanding = Math.max(0, roundToTwo(invoice.final_amount - newPaidAmount));
        const newStatus = calculateInvoiceStatus({
          finalAmount: invoice.final_amount,
          paidAmount: newPaidAmount,
          dueDate: invoice.due_date,
        });

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paid_amount: newPaidAmount,
            outstanding_amount: newOutstanding,
            status: newStatus,
          },
        });

        // If linked to fee_plan, update fee_plan balances too
        if (invoice.fee_plan_id) {
          await tx.feePlan.update({
            where: { id: invoice.fee_plan_id },
            data: {
              amount_paid: { increment: amt },
              balance: { decrement: amt },
            },
          });
        }

        // Audit Log in StudentActivity
        await tx.studentActivity.create({
          data: {
            institute_id: institute.id,
            student_id: invoice.student_id,
            action: "Payment Recorded",
            performed_by: user.name || "Administrator",
            details: `Payment of ₹${amt.toLocaleString("en-IN")} recorded via ${payment_method || "Cash"} for Invoice #${invoice.invoice_number}. Receipt: ${receiptNum}.`,
          },
        });

        return { payment, invoice: updatedInvoice };
      });

      // Send student notification if student has user account
      if (invoice.student?.user_id) {
        try {
          const { createNotification } = await import("@/lib/notifications");
          await createNotification({
            institute_id: institute.id,
            recipient_user_id: invoice.student.user_id,
            type: "Finance",
            category: "Payment Received",
            title: "Payment Received & Receipt Available",
            message: `Payment of ₹${amt.toLocaleString("en-IN")} received (Receipt #${result.payment.receipt_number}). Remaining balance: ₹${result.invoice.outstanding_amount.toLocaleString("en-IN")}.`,
            priority: "Normal",
            related_entity_type: "payment",
            related_entity_id: result.payment.id,
            action_url: "/student/fees",
            event_key: `payment_${result.payment.id}`,
          });
        } catch (notifErr) {
          console.error("Failed to send payment notification:", notifErr);
        }
      }

      return NextResponse.json({
        success: true,
        payment: result.payment,
        invoice: result.invoice,
        receipt: {
          ...result.payment,
          student: {
            student_code: invoice.student.student_code,
            name: invoice.student.name,
            phone: invoice.student.phone,
            email: invoice.student.email,
          },
          course_name: invoice.course?.name || "General Course",
          invoice_number: invoice.invoice_number,
          invoice_total: invoice.final_amount,
          previously_paid: invoice.paid_amount,
          this_payment: amt,
          remaining_balance: result.invoice.outstanding_amount,
          status: result.invoice.status,
          recorded_by_name: user.name || "Staff",
          institute_name: institute.name,
          institute_logo: institute.logo,
        },
      });
    }

    // Fallback: Legacy payment against fee_plan_id
    if (!fee_plan_id) {
      return NextResponse.json(
        { error: "Please select an invoice or fee plan." },
        { status: 400 }
      );
    }

    const feePlan = await db.feePlan.findFirst({
      where: { id: fee_plan_id, institute_id: institute.id },
      include: {
        student: true,
        installments: { orderBy: { due_date: "asc" } },
      },
    });

    if (!feePlan) {
      return NextResponse.json({ error: "Fee plan not found." }, { status: 404 });
    }

    if (amt > feePlan.balance + 0.01) {
      return NextResponse.json(
        { error: `Payment amount (${amt}) cannot exceed remaining balance (${feePlan.balance}).` },
        { status: 400 }
      );
    }

    const payDate = payment_date ? new Date(payment_date) : new Date();

    const result = await db.$transaction(async (tx) => {
      const receiptNum = await generateNextReceiptNumber(institute.id, tx);

      const payment = await tx.payment.create({
        data: {
          institute_id: institute.id,
          fee_plan_id: feePlan.id,
          student_id: feePlan.student_id,
          installment_id: installment_id || null,
          receipt_number: receiptNum,
          amount: amt,
          payment_date: payDate,
          payment_method: payment_method || "Cash",
          reference_number: reference_number?.trim() || null,
          notes: notes?.trim() || null,
          recorded_by_id: user.id,
        },
      });

      const newAmountPaid = parseFloat((feePlan.amount_paid + amt).toFixed(2));
      const newBalance = Math.max(0, parseFloat((feePlan.final_fee - newAmountPaid).toFixed(2)));

      const updatedPlan = await tx.feePlan.update({
        where: { id: feePlan.id },
        data: {
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newBalance <= 0.01 ? "Paid" : "Partially Paid",
        },
      });

      return { payment, plan: updatedPlan };
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      feePlan: result.plan,
    });
  } catch (error: any) {
    console.error("POST Record Payment API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}

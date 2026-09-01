import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateFeeStatus, generateReceiptNumber } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "MENTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student) return NextResponse.json({ success: true, payments: [] });
      whereCondition.student_id = student.id;
    }

    if (search) {
      whereCondition.OR = [
        { receipt_number: { contains: search } },
        { reference_number: { contains: search } },
        { student: { name: { contains: search } } },
        { student: { student_code: { contains: search } } },
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
          },
        },
        fee_plan: {
          include: {
            course: { select: { name: true } },
          },
        },
        installment: { select: { id: true, name: true } },
        recorded_by: { select: { id: true, name: true } },
      },
      orderBy: { payment_date: "desc" },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
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

    if (user.role === "STUDENT" || user.role === "MENTOR") {
      return NextResponse.json({ error: "Forbidden: Only authorized staff can record payments." }, { status: 403 });
    }

    const body = await request.json();
    const {
      fee_plan_id,
      installment_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
    } = body;

    if (!fee_plan_id || amount === undefined) {
      return NextResponse.json(
        { error: "fee_plan_id and amount are required fields." },
        { status: 400 }
      );
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0." },
        { status: 400 }
      );
    }

    const feePlan = await db.feePlan.findFirst({
      where: { id: fee_plan_id, institute_id: institute.id },
      include: {
        student: true,
        installments: {
          orderBy: { due_date: "asc" },
        },
      },
    });

    if (!feePlan) {
      return NextResponse.json({ error: "Fee plan not found for your institute." }, { status: 404 });
    }

    if (amt > feePlan.balance + 0.01) {
      return NextResponse.json(
        { error: `Payment amount (${amt}) cannot exceed remaining balance (${feePlan.balance}).` },
        { status: 400 }
      );
    }

    const receiptNum = generateReceiptNumber("REC");
    const payDate = payment_date ? new Date(payment_date) : new Date();

    // Execute Record Payment Transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          institute_id: institute.id,
          fee_plan_id: feePlan.id,
          student_id: feePlan.student_id,
          installment_id: installment_id || null,
          receipt_number: receiptNum,
          amount: amt,
          payment_date: payDate,
          payment_method: payment_method || "UPI",
          reference_number: reference_number?.trim() || null,
          notes: notes?.trim() || null,
          recorded_by_id: user.id,
        },
      });

      // 2. Update FeePlan amount_paid & balance
      const newAmountPaid = parseFloat((feePlan.amount_paid + amt).toFixed(2));
      const newBalance = Math.max(0, parseFloat((feePlan.final_fee - newAmountPaid).toFixed(2)));

      // 3. Update Installments Status
      let remainingPaymentCredit = amt;
      for (const inst of feePlan.installments) {
        if (remainingPaymentCredit <= 0) break;

        if (installment_id && inst.id === installment_id) {
          await tx.installment.update({
            where: { id: inst.id },
            data: { status: "Paid" },
          });
          remainingPaymentCredit = 0;
        } else if (inst.status !== "Paid") {
          if (remainingPaymentCredit >= inst.amount) {
            await tx.installment.update({
              where: { id: inst.id },
              data: { status: "Paid" },
            });
            remainingPaymentCredit -= inst.amount;
          } else {
            // Partially cover installment
            remainingPaymentCredit = 0;
          }
        }
      }

      // Check earliest unpaid due date for status calculation
      const updatedInstallments = await tx.installment.findMany({
        where: { fee_plan_id: feePlan.id, status: { in: ["Pending", "Overdue"] } },
        orderBy: { due_date: "asc" },
      });

      const earliestUnpaid = updatedInstallments[0]?.due_date || null;
      const newStatus = calculateFeeStatus(feePlan.final_fee, newAmountPaid, earliestUnpaid);

      const updatedPlan = await tx.feePlan.update({
        where: { id: feePlan.id },
        data: {
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
        },
      });

      return { payment, plan: updatedPlan };
    });

    // Send notification to student user if account exists
    if (feePlan.student?.user_id) {
      const { createNotification } = await import("@/lib/notifications");
      await createNotification({
        institute_id: institute.id,
        recipient_user_id: feePlan.student.user_id,
        type: "Finance",
        category: "Payment Received",
        title: "Payment Received & Receipt Available",
        message: `Payment of ₹${amt.toLocaleString("en-IN")} received for receipt #${receiptNum}. Remaining balance: ₹${result.plan.balance.toLocaleString("en-IN")}.`,
        priority: "Normal",
        related_entity_type: "payment",
        related_entity_id: result.payment.id,
        action_url: "/student/fees",
        event_key: `payment_${result.payment.id}`,
      });
    }

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

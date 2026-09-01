import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDateFilter } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    if (user.role === "STUDENT" || user.role === "MENTOR") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rangeType = searchParams.get("range") || "all";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const courseId = searchParams.get("course_id");

    const dateRange = parseDateFilter(rangeType, startDateStr, endDateStr);

    const feePlansWhere: any = { institute_id: institute.id };
    if (courseId && courseId !== "ALL") {
      feePlansWhere.course_id = courseId;
    }

    const feePlans = await db.feePlan.findMany({
      where: feePlansWhere,
      include: {
        student: {
          select: {
            id: true,
            student_code: true,
            name: true,
            course: { select: { name: true } },
          },
        },
        installments: {
          where: { status: { in: ["Pending", "Overdue"] } },
          orderBy: { due_date: "asc" },
        },
      },
    });

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let dueSoonAmount = 0;

    feePlans.forEach((plan) => {
      totalExpected += plan.final_fee;
      totalCollected += plan.amount_paid;
      totalOutstanding += plan.balance;

      const earliestUnpaid = plan.installments[0]?.due_date;
      if (plan.balance > 0 && earliestUnpaid) {
        const dueDate = new Date(earliestUnpaid);
        if (dueDate < now) {
          overdueAmount += plan.balance;
        } else if (dueDate <= sevenDaysLater) {
          dueSoonAmount += plan.balance;
        }
      }
    });

    // Payments Filtering & Grouping
    const paymentsWhere: any = { institute_id: institute.id };
    if (dateRange.start && dateRange.end) {
      paymentsWhere.payment_date = { gte: dateRange.start, lte: dateRange.end };
    }

    const payments = await db.payment.findMany({
      where: paymentsWhere,
      select: { amount: true, payment_method: true, payment_date: true },
      orderBy: { payment_date: "asc" },
    });

    // Payment Methods Breakdown
    const methodMap: Record<string, number> = {};
    payments.forEach((p) => {
      const method = p.payment_method || "Other";
      methodMap[method] = (methodMap[method] || 0) + p.amount;
    });

    const paymentMethods = Object.entries(methodMap).map(([method, amount]) => ({
      method,
      amount: parseFloat(amount.toFixed(2)),
    }));

    // Collection Trend by Date
    const collectionTrendMap: Record<string, number> = {};
    payments.forEach((p) => {
      const dateStr = new Date(p.payment_date).toISOString().slice(0, 10);
      collectionTrendMap[dateStr] = (collectionTrendMap[dateStr] || 0) + p.amount;
    });

    const collectionTrend = Object.entries(collectionTrendMap).map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2)),
    }));

    // Outstanding Fees Table
    const outstandingFeesTable = feePlans
      .filter((plan) => plan.balance > 0)
      .map((plan) => ({
        id: plan.id,
        student_id: plan.student.id,
        student_code: plan.student.student_code,
        name: plan.student.name,
        course_name: plan.student.course?.name || "General Course",
        final_fee: plan.final_fee,
        amount_paid: plan.amount_paid,
        balance: plan.balance,
        status: plan.status,
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalExpected,
        totalCollected,
        totalOutstanding,
        overdueAmount,
        dueSoonAmount,
      },
      paymentMethods,
      collectionTrend,
      outstandingFeesTable,
    });
  } catch (error: any) {
    console.error("GET Finance Report API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch finance report" }, { status: 500 });
  }
}

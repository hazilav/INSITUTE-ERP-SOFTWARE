import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateFinalFee, calculateFeeStatus } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedUser();

    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, institute } = authContext;

    // Mentor Role Check: Mentors have no financial access by default
    if (user.role === "MENTOR") {
      return NextResponse.json({ error: "Forbidden: Mentors do not have financial access." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const courseFilter = searchParams.get("course_id") || "ALL";
    const batchFilter = searchParams.get("batch_id") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student) {
        return NextResponse.json({
          success: true,
          feePlans: [],
          metrics: { totalExpected: 0, totalCollected: 0, totalPending: 0, overdue: 0, dueSoon: 0 },
        });
      }
      whereCondition.student_id = student.id;
    } else {
      if (courseFilter !== "ALL") whereCondition.course_id = courseFilter;
      if (batchFilter !== "ALL") whereCondition.batch_id = batchFilter;
      if (statusFilter !== "ALL") whereCondition.status = statusFilter;
    }

    if (search) {
      whereCondition.student = {
        OR: [
          { name: { contains: search } },
          { student_code: { contains: search } },
          { phone: { contains: search } },
        ],
      };
    }

    // Execute feePlans list, financial metrics scan, active courses, and batches in parallel
    const [feePlans, allInstitutePlans, activeCourses, activeBatches] = await Promise.all([
      db.feePlan.findMany({
        where: whereCondition,
        include: {
          student: {
            select: {
              id: true,
              student_code: true,
              name: true,
              phone: true,
              email: true,
              photo: true,
            },
          },
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true } },
          installments: {
            orderBy: { due_date: "asc" },
          },
          payments: {
            orderBy: { payment_date: "desc" },
            take: 5,
          },
        },
        orderBy: { created_at: "desc" },
        take: 100,
      }),
      db.feePlan.findMany({
        where: { institute_id: institute.id },
        select: {
          final_fee: true,
          amount_paid: true,
          balance: true,
          installments: {
            where: { status: { in: ["Pending", "Overdue"] } },
            select: { due_date: true, status: true },
            orderBy: { due_date: "asc" },
          },
        },
      }),
      db.course.findMany({
        where: { institute_id: institute.id, is_archived: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      db.batch.findMany({
        where: { institute_id: institute.id, is_archived: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueAmount = 0;
    let dueSoonCount = 0;

    allInstitutePlans.forEach((plan) => {
      totalExpected += plan.final_fee;
      totalCollected += plan.amount_paid;
      totalPending += plan.balance;

      const earliestUnpaid = plan.installments[0]?.due_date;
      if (plan.balance > 0 && earliestUnpaid && new Date(earliestUnpaid) < now) {
        overdueAmount += plan.balance;
      }

      // Due soon check: unpaid installments within next 7 days
      plan.installments.forEach((inst) => {
        if (inst.status === "Pending" && new Date(inst.due_date) >= now && new Date(inst.due_date) <= sevenDaysFromNow) {
          dueSoonCount++;
        }
      });
    });

    return NextResponse.json({
      success: true,
      feePlans,
      metrics: {
        totalExpected: parseFloat(totalExpected.toFixed(2)),
        totalCollected: parseFloat(totalCollected.toFixed(2)),
        totalPending: parseFloat(totalPending.toFixed(2)),
        overdue: parseFloat(overdueAmount.toFixed(2)),
        dueSoon: dueSoonCount,
      },
      activeCourses,
      activeBatches,
    });
  } catch (error) {
    console.error("GET Fee Plans API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee plans" },
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      student_id,
      course_id,
      batch_id,
      course_fee,
      discount_type,
      discount_value,
      payment_type,
      installments_data, // Array<{ name: string, amount: number, due_date: string }>
    } = body;

    if (!student_id || !course_id || course_fee === undefined) {
      return NextResponse.json(
        { error: "student_id, course_id, and course_fee are required." },
        { status: 400 }
      );
    }

    const student = await db.student.findFirst({
      where: { id: student_id, institute_id: institute.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found in institute." }, { status: 400 });
    }

    const feeNum = parseFloat(course_fee);
    const discValNum = parseFloat(discount_value || 0);

    const finalFee = calculateFinalFee(feeNum, discount_type || "fixed", discValNum);
    const balance = finalFee; // Initial balance equals final fee before payments

    // Create FeePlan transaction
    const newFeePlan = await db.$transaction(async (tx) => {
      const plan = await tx.feePlan.create({
        data: {
          institute_id: institute.id,
          student_id,
          course_id,
          batch_id: batch_id || student.batch_id || null,
          course_fee: feeNum,
          discount_type: discount_type || "fixed",
          discount_value: discValNum,
          final_fee: finalFee,
          amount_paid: 0.0,
          balance: finalFee,
          payment_type: payment_type || "full",
          status: "Pending",
        },
      });

      // Build Installments if specified
      if (payment_type === "installments" && Array.isArray(installments_data) && installments_data.length > 0) {
        let installmentTotal = 0;
        installments_data.forEach((inst: any) => {
          installmentTotal += parseFloat(inst.amount || 0);
        });

        if (installmentTotal > finalFee + 0.01) {
          throw new Error(`Total installment amount (${installmentTotal}) cannot exceed final fee (${finalFee}).`);
        }

        await tx.installment.createMany({
          data: installments_data.map((inst: any, idx: number) => ({
            institute_id: institute.id,
            fee_plan_id: plan.id,
            name: inst.name || `Installment ${idx + 1}`,
            amount: parseFloat(inst.amount),
            due_date: new Date(inst.due_date),
            status: "Pending",
          })),
        });
      } else {
        // Default single full payment installment due in 14 days if not specified
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        await tx.installment.create({
          data: {
            institute_id: institute.id,
            fee_plan_id: plan.id,
            name: "Full Course Fee Payment",
            amount: finalFee,
            due_date: dueDate,
            status: "Pending",
          },
        });
      }

      return plan;
    });

    return NextResponse.json({
      success: true,
      feePlan: newFeePlan,
    });
  } catch (error: any) {
    console.error("POST FeePlan API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create fee plan" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateInvoiceTotals,
  calculateInvoiceStatus,
  generateNextInvoiceNumber,
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

    // Fetch staff profile if staff role
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
        { error: "Forbidden: You do not have permission to view financial records." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "ALL";
    const studentIdFilter = searchParams.get("student_id") || "";
    const courseIdFilter = searchParams.get("course_id") || "ALL";

    const whereCondition: any = {
      institute_id: institute.id,
    };

    if (user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { user_id: user.id } });
      if (!student) return NextResponse.json({ success: true, invoices: [] });
      whereCondition.student_id = student.id;
    } else {
      if (studentIdFilter) {
        whereCondition.student_id = studentIdFilter;
      }
      if (courseIdFilter !== "ALL") {
        whereCondition.course_id = courseIdFilter;
      }
      if (statusFilter !== "ALL") {
        if (statusFilter.toUpperCase() === "OVERDUE") {
          whereCondition.status = "Overdue";
        } else if (statusFilter.toUpperCase() === "PAID") {
          whereCondition.status = "Paid";
        } else if (statusFilter.toUpperCase() === "PARTIALLY PAID" || statusFilter.toUpperCase() === "PARTIALLY_PAID") {
          whereCondition.status = "Partially Paid";
        } else if (statusFilter.toUpperCase() === "UNPAID") {
          whereCondition.status = "Unpaid";
        } else {
          whereCondition.status = statusFilter;
        }
      }

      // If staff has restricted assignments, restrict to assigned courses/batches
      if (user.role === "STAFF" && staffProfile?.assigned_course_id) {
        whereCondition.course_id = staffProfile.assigned_course_id;
      }
    }

    if (search) {
      whereCondition.OR = [
        { invoice_number: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { student: { name: { contains: search, mode: "insensitive" } } },
        { student: { student_code: { contains: search, mode: "insensitive" } } },
      ];
    }

    const invoices = await db.invoice.findMany({
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
        course: { select: { id: true, name: true, code: true } },
        payments: {
          where: { is_voided: false },
          orderBy: { payment_date: "desc" },
          select: {
            id: true,
            receipt_number: true,
            amount: true,
            payment_date: true,
            payment_method: true,
            reference_number: true,
          },
        },
        created_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (error: any) {
    console.error("GET Invoices API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
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
        { error: "Forbidden: You do not have permission to create invoices." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      student_id,
      course_id,
      description,
      amount,
      discount,
      due_date,
      invoice_date,
      apply_tax,
      notes,
    } = body;

    if (!student_id) {
      return NextResponse.json({ error: "Student is required." }, { status: 400 });
    }

    const baseAmount = parseFloat(amount);
    if (isNaN(baseAmount) || baseAmount < 0) {
      return NextResponse.json(
        { error: "Please provide a valid non-negative invoice amount." },
        { status: 400 }
      );
    }

    const discountAmount = parseFloat(discount || "0");
    if (isNaN(discountAmount) || discountAmount < 0) {
      return NextResponse.json(
        { error: "Discount amount cannot be negative." },
        { status: 400 }
      );
    }

    if (discountAmount > baseAmount) {
      return NextResponse.json(
        { error: "Discount amount cannot exceed the base invoice amount." },
        { status: 400 }
      );
    }

    const student = await db.student.findFirst({
      where: { id: student_id, institute_id: institute.id },
      include: { course: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found in your institute." },
        { status: 404 }
      );
    }

    // Determine institute tax status
    const instRecord = await db.institute.findUnique({
      where: { id: institute.id },
      select: { tax_enabled: true, tax_percentage: true },
    });

    const taxEnabled = Boolean(instRecord?.tax_enabled && apply_tax !== false);
    const taxPercentage = instRecord?.tax_percentage || 0;

    const totals = calculateInvoiceTotals({
      amount: baseAmount,
      discount: discountAmount,
      taxPercentage,
      taxEnabled,
    });

    const invDate = invoice_date ? new Date(invoice_date) : new Date();
    const dueDate = due_date
      ? new Date(due_date)
      : new Date(invDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const initialStatus = calculateInvoiceStatus({
      finalAmount: totals.finalAmount,
      paidAmount: 0,
      dueDate,
    });

    // Execute in transaction to guarantee unique sequential invoice number
    const newInvoice = await db.$transaction(async (tx) => {
      const invoiceNumber = await generateNextInvoiceNumber(institute.id, tx);

      const invoice = await tx.invoice.create({
        data: {
          institute_id: institute.id,
          student_id,
          course_id: course_id || student.course_id || null,
          invoice_number: invoiceNumber,
          invoice_date: invDate,
          due_date: dueDate,
          description: description?.trim() || "Course Tuition & Academic Fee",
          amount: totals.amount,
          discount: totals.discount,
          tax: totals.tax,
          final_amount: totals.finalAmount,
          paid_amount: 0,
          outstanding_amount: totals.finalAmount,
          status: initialStatus,
          notes: notes?.trim() || null,
          created_by_id: user.id,
        },
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
          course: { select: { id: true, name: true, code: true } },
        },
      });

      // Audit Log in StudentActivity
      await tx.studentActivity.create({
        data: {
          institute_id: institute.id,
          student_id,
          action: "Invoice Created",
          performed_by: user.name || "Administrator",
          details: `Invoice #${invoiceNumber} created for ₹${totals.finalAmount.toLocaleString("en-IN")}. Due: ${dueDate.toLocaleDateString("en-IN")}.`,
        },
      });

      return invoice;
    });

    return NextResponse.json({
      success: true,
      invoice: newInvoice,
    });
  } catch (error: any) {
    console.error("POST Create Invoice Error:", error);
    return NextResponse.json(
      { error: error.message || "Unable to generate invoice. Please try again." },
      { status: 500 }
    );
  }
}

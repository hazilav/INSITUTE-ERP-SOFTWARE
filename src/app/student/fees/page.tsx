import { redirect } from "next/navigation";
import { getAuthenticatedStudent } from "@/lib/student";
import { db } from "@/lib/db";
import StudentFeeProfileClient from "./StudentFeeProfileClient";
import StudentPortalWrapper from "@/components/StudentPortalWrapper";

export const dynamic = "force-dynamic";

export default async function StudentFeesPage() {
  const studentContext = await getAuthenticatedStudent();

  if (!studentContext) redirect("/student/login");

  const { student, institute } = studentContext;

  const [feePlan, invoices, payments] = await Promise.all([
    db.feePlan.findFirst({
      where: { institute_id: institute.id, student_id: student.id },
      include: {
        installments: { orderBy: { due_date: "asc" } },
        payments: {
          include: { recorded_by: { select: { name: true } } },
          orderBy: { payment_date: "desc" },
        },
      },
    }),
    db.invoice.findMany({
      where: { institute_id: institute.id, student_id: student.id },
      include: {
        course: { select: { name: true, code: true } },
        payments: {
          where: { is_voided: false },
          orderBy: { payment_date: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    }),
    db.payment.findMany({
      where: { institute_id: institute.id, student_id: student.id },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            final_amount: true,
            outstanding_amount: true,
            paid_amount: true,
            course: { select: { name: true } },
          },
        },
        fee_plan: {
          select: {
            id: true,
            final_fee: true,
            balance: true,
            course: { select: { name: true } },
          },
        },
        recorded_by: { select: { name: true } },
      },
      orderBy: { payment_date: "desc" },
    }),
  ]);

  const formattedFeePlan = feePlan
    ? {
        ...feePlan,
        installments: feePlan.installments.map((i) => ({
          ...i,
          due_date: i.due_date.toISOString(),
        })),
        payments: feePlan.payments.map((p) => ({
          ...p,
          payment_date: p.payment_date.toISOString(),
        })),
      }
    : null;

  const formattedInvoices = invoices.map((inv) => ({
    ...inv,
    invoice_date: inv.invoice_date.toISOString(),
    due_date: inv.due_date.toISOString(),
    created_at: inv.created_at.toISOString(),
    payments: inv.payments.map((p) => ({
      ...p,
      payment_date: p.payment_date.toISOString(),
    })),
  }));

  const formattedPayments = payments.map((p) => ({
    ...p,
    payment_date: p.payment_date.toISOString(),
  }));

  const instituteDetails = {
    name: institute.name,
    code: (institute as any).code || null,
    address: (institute as any).address || null,
    phone: (institute as any).phone || null,
    email: (institute as any).email || null,
    logo: (institute as any).logo_url || (institute as any).logo || null,
    tax_number: (institute as any).tax_number || null,
    tax_name: (institute as any).tax_name || null,
  };

  return (
    <StudentPortalWrapper>
      <StudentFeeProfileClient
        feePlan={formattedFeePlan}
        invoices={formattedInvoices}
        payments={formattedPayments}
        student={{
          id: student.id,
          student_code: student.student_code,
          name: student.name,
          phone: student.phone,
          email: student.email,
          course_name: student.course?.name || "General Course",
        }}
        instituteDetails={instituteDetails}
      />
    </StudentPortalWrapper>
  );
}

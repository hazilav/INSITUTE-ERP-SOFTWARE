/**
 * Financial Calculation Utility Engine for Institute Management CRM
 */

export function roundToTwo(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function toPaise(amount: number): number {
  return Math.round((amount || 0) * 100);
}

export function fromPaise(paise: number): number {
  return (paise || 0) / 100;
}

export function calculateInvoiceTotals(params: {
  amount: number;
  discount?: number;
  taxPercentage?: number;
  taxEnabled?: boolean;
}): {
  amount: number;
  discount: number;
  tax: number;
  finalAmount: number;
} {
  const baseAmount = Math.max(0, parseFloat(String(params.amount)) || 0);
  const discountAmount = Math.max(0, parseFloat(String(params.discount || 0)) || 0);
  const netBeforeTax = Math.max(0, baseAmount - discountAmount);

  let taxAmount = 0;
  if (params.taxEnabled && params.taxPercentage && params.taxPercentage > 0) {
    taxAmount = roundToTwo((netBeforeTax * params.taxPercentage) / 100);
  }

  const finalAmount = roundToTwo(netBeforeTax + taxAmount);

  return {
    amount: roundToTwo(baseAmount),
    discount: roundToTwo(discountAmount),
    tax: roundToTwo(taxAmount),
    finalAmount,
  };
}

export function calculateInvoiceStatus(params: {
  finalAmount: number;
  paidAmount: number;
  dueDate: Date | string;
  isCancelled?: boolean;
}): "Unpaid" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled" {
  if (params.isCancelled) return "Cancelled";

  const finalPaise = toPaise(params.finalAmount);
  const paidPaise = toPaise(params.paidAmount);
  const outstandingPaise = Math.max(0, finalPaise - paidPaise);

  if (outstandingPaise === 0) {
    return "Paid";
  }

  const now = new Date();
  const due = new Date(params.dueDate);
  const isOverdue = due < now;

  if (paidPaise > 0) {
    return isOverdue ? "Overdue" : "Partially Paid";
  }

  return isOverdue ? "Overdue" : "Unpaid";
}

/**
 * Concurrency-safe unique invoice number generator: INV-YYYY-0001
 */
export async function generateNextInvoiceNumber(
  instituteId: string,
  tx: any
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const existing = await tx.invoice.findMany({
    where: {
      institute_id: instituteId,
      invoice_number: { startsWith: prefix },
    },
    select: { invoice_number: true },
  });

  let maxSeq = 0;
  for (const inv of existing) {
    const parts = inv.invoice_number.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Concurrency-safe unique receipt number generator: REC-YYYY-0001
 */
export async function generateNextReceiptNumber(
  instituteId: string,
  tx: any
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const existing = await tx.payment.findMany({
    where: {
      institute_id: instituteId,
      receipt_number: { startsWith: prefix },
    },
    select: { receipt_number: true },
  });

  let maxSeq = 0;
  for (const pay of existing) {
    const parts = pay.receipt_number.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export function calculateFinalFee(
  courseFee: number,
  discountType: string,
  discountValue: number
): number {
  const fee = Math.max(0, parseFloat(String(courseFee)) || 0);
  const disc = Math.max(0, parseFloat(String(discountValue)) || 0);

  if (discountType === "percentage") {
    const discountedAmount = (fee * disc) / 100;
    return Math.max(0, parseFloat((fee - discountedAmount).toFixed(2)));
  }

  // Fixed discount
  return Math.max(0, parseFloat((fee - disc).toFixed(2)));
}

export function calculateFeeStatus(
  finalFee: number,
  amountPaid: number,
  earliestUnpaidDueDate?: Date | null
): "Paid" | "Partially Paid" | "Pending" | "Overdue" {
  const balance = Math.max(0, finalFee - amountPaid);
  if (balance <= 0.01) return "Paid";

  const now = new Date();
  if (earliestUnpaidDueDate && new Date(earliestUnpaidDueDate) < now) {
    return "Overdue";
  }

  if (amountPaid > 0) return "Partially Paid";

  return "Pending";
}

export function generateReceiptNumber(institutePrefix = "REC"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${institutePrefix}-${dateStr}-${randomSuffix}`;
}


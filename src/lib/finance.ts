/**
 * Financial Calculation Utility Engine for Institute Management CRM
 */

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

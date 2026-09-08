/**
 * High-precision, Single-Page A4 PDF & Print Engine for Invoices and Payment Receipts.
 *
 * Guarantees:
 * 1. Exactly 1 A4 page for normal documents (210mm x 297mm).
 * 2. Zero duplicate page rendering or blank overflow pages.
 * 3. Isolated iframe printing (immune to modal positioning, overflows, or browser popup blockers).
 * 4. Professional typography and compact hierarchy adhering to institute branding.
 * 5. Complete INR (₹) formatting.
 */

import { formatCurrency } from "./currency";

export interface PrintableInvoiceData {
  id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  description?: string | null;
  amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  notes?: string | null;
  is_cancelled?: boolean;
  cancel_reason?: string | null;
  student: {
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  course?: {
    name: string;
    code?: string | null;
  } | null;
  payments?: Array<{
    id?: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string | null;
  }>;
  institute?: {
    name: string;
    logo?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    tax_number?: string | null;
    tax_name?: string | null;
  } | null;
}

export interface PrintableReceiptData {
  id?: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  student: {
    student_code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  course_name: string;
  invoice_number?: string | null;
  invoice_total?: number;
  previously_paid?: number;
  this_payment?: number;
  remaining_balance: number;
  status?: string;
  recorded_by_name?: string;
  institute_name: string;
  institute_logo?: string | null;
  institute_address?: string | null;
  institute_phone?: string | null;
  institute_email?: string | null;
  institute_tax_number?: string | null;
}

function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function getInvoiceStatusInfo(inv: PrintableInvoiceData) {
  if (inv.is_cancelled || inv.status === "Cancelled") {
    return {
      text: "CANCELLED",
      color: "#475569",
      bg: "#f1f5f9",
      border: "#cbd5e1",
    };
  }
  if (inv.status === "Paid" || inv.outstanding_amount <= 0.001) {
    return {
      text: "PAID IN FULL",
      color: "#065f46",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    };
  }
  const isOverdue =
    inv.status === "Overdue" ||
    (inv.outstanding_amount > 0 && new Date(inv.due_date) < new Date());

  if (isOverdue) {
    return {
      text: "OVERDUE",
      color: "#9f1239",
      bg: "#fff1f2",
      border: "#fecdd3",
    };
  }
  if (inv.paid_amount > 0) {
    return {
      text: "PARTIALLY PAID",
      color: "#1e40af",
      bg: "#eff6ff",
      border: "#bfdbfe",
    };
  }
  return {
    text: "UNPAID",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#fde68a",
  };
}

function getReceiptStatusInfo(receipt: PrintableReceiptData) {
  const remBal = receipt.remaining_balance !== undefined ? receipt.remaining_balance : 0;
  if (remBal <= 0.001) {
    return {
      text: "PAID IN FULL",
      color: "#065f46",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    };
  }
  return {
    text: "PARTIALLY PAID",
    color: "#1e40af",
    bg: "#eff6ff",
    border: "#bfdbfe",
  };
}

/**
 * Generates clean, standalone, single-page A4 HTML for an Invoice.
 */
export function generateInvoiceHtml(inv: PrintableInvoiceData): string {
  const instName = inv.institute?.name || "Institute Management System";
  const instLogo = inv.institute?.logo;
  const instPhone = inv.institute?.phone;
  const instEmail = inv.institute?.email;
  const instWebsite = inv.institute?.website;
  const instAddress = [
    inv.institute?.address,
    inv.institute?.city,
    inv.institute?.state,
    inv.institute?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const status = getInvoiceStatusInfo(inv);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Invoice #${inv.invoice_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 10px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-table td {
      vertical-align: top;
    }
    .inst-logo {
      max-height: 48px;
      max-width: 130px;
      object-fit: contain;
      display: block;
      margin-right: 10px;
    }
    .inst-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
      line-height: 1.15;
    }
    .inst-sub {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }
    .inst-meta {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-title-block {
      text-align: right;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .meta-row {
      font-size: 9.5px;
      color: #475569;
      margin-bottom: 2px;
    }
    .meta-label {
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      font-size: 8.5px;
      display: inline-block;
      min-width: 65px;
    }
    .meta-val-inv {
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0284c7;
      font-size: 11px;
    }
    .meta-val-due {
      font-weight: 800;
      color: #be123c;
    }

    /* Two column Student Info & Status */
    .info-grid {
      width: 100%;
      margin-bottom: 10px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 10px;
      vertical-align: top;
    }
    .section-title {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .student-name {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .student-line {
      font-size: 9.5px;
      color: #334155;
      margin-bottom: 1.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 9.5px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-top: 3px;
      border: 1px solid ${status.border};
      background: ${status.bg};
      color: ${status.color};
    }

    /* Table */
    .table-container {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
    }
    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 10px;
    }
    table.data-table th.tar {
      text-align: right;
    }
    table.data-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9.5px;
    }
    table.data-table td.tar {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #0f172a;
    }
    table.data-table tfoot td {
      background: #f8fafc;
      border-top: 2px solid #0f172a;
      border-bottom: none;
      font-weight: 800;
      font-size: 11px;
      padding: 7px 10px;
    }

    /* Summary & History */
    .summary-grid {
      width: 100%;
      margin-bottom: 10px;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 4px 6px;
      font-size: 9.5px;
    }
    .sum-val {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
    }

    /* Footer */
    .footer-section {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 8.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="invoice-sheet">
    <!-- Top Header -->
    <table class="header-table" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 60%;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              ${
                instLogo
                  ? `<td><img src="${instLogo}" class="inst-logo" alt="${instName}" /></td>`
                  : ""
              }
              <td>
                <div class="inst-name">${instName}</div>
                ${instAddress ? `<div class="inst-sub">${instAddress}</div>` : ""}
                <div class="inst-meta">
                  ${[
                    instPhone ? `Phone: ${instPhone}` : "",
                    instEmail ? `Email: ${instEmail}` : "",
                    instWebsite ? `Web: ${instWebsite}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
                ${
                  inv.institute?.tax_number
                    ? `<div class="inst-meta" style="font-weight: 700;">GSTIN / Tax ID: ${inv.institute.tax_number}</div>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 40%; text-align: right;" class="doc-title-block">
          <div class="doc-title">FEE INVOICE</div>
          <div class="meta-row">
            <span class="meta-label">Invoice No:</span>
            <span class="meta-val-inv">${inv.invoice_number}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Date:</span>
            <span>${formatDate(inv.invoice_date)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Due Date:</span>
            <span class="meta-val-due">${formatDate(inv.due_date)}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Student & Status Grid -->
    <table class="info-grid" cellpadding="0" cellspacing="0">
      <tr>
        <td class="info-box" style="width: 55%;">
          <div class="section-title">BILL TO (STUDENT)</div>
          <div class="student-name">${inv.student.name}</div>
          <div class="student-line"><strong>Student ID:</strong> ${inv.student.student_code}</div>
          <div class="student-line"><strong>Course:</strong> ${inv.course?.name || "Academic Program"}</div>
          ${
            inv.student.phone || inv.student.email
              ? `<div class="student-line" style="color: #64748b;">${[
                  inv.student.phone,
                  inv.student.email,
                ]
                  .filter(Boolean)
                  .join(" • ")}</div>`
              : ""
          }
          ${
            inv.student.address
              ? `<div class="student-line" style="color: #64748b; font-size: 8.5px;">${inv.student.address}</div>`
              : ""
          }
        </td>
        <td class="info-box" style="width: 45%;">
          <div class="section-title">PAYMENT STATUS</div>
          <div><span class="status-badge">● ${status.text}</span></div>
          <table style="width: 100%; margin-top: 6px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 9px; color: #64748b;">Total Fee:</td>
              <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(
                inv.final_amount
              )}</td>
            </tr>
            <tr>
              <td style="font-size: 9px; color: #047857; font-weight: 600;">Paid to Date:</td>
              <td style="text-align: right; font-weight: 700; color: #047857; font-family: monospace;">${formatCurrency(
                inv.paid_amount
              )}</td>
            </tr>
            <tr>
              <td style="font-size: 9px; color: #be123c; font-weight: 700;">Balance Due:</td>
              <td style="text-align: right; font-weight: 800; color: #be123c; font-size: 11px; font-family: monospace;">${formatCurrency(
                inv.outstanding_amount
              )}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 70%;">Description</th>
            <th class="tar" style="width: 30%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${
                inv.description || "Tuition & Academic Course Fee"
              }</div>
              ${
                inv.course
                  ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">Program: ${inv.course.name}</div>`
                  : ""
              }
            </td>
            <td class="tar">${formatCurrency(inv.amount)}</td>
          </tr>
          ${
            inv.discount > 0
              ? `<tr>
                  <td style="color: #6d28d9; font-weight: 600;">Discount / Scholarship Applied</td>
                  <td class="tar" style="color: #6d28d9;">- ${formatCurrency(inv.discount)}</td>
                </tr>`
              : ""
          }
          ${
            inv.tax > 0
              ? `<tr>
                  <td style="color: #4338ca; font-weight: 600;">${
                    inv.institute?.tax_name || "GST"
                  } / Tax</td>
                  <td class="tar" style="color: #4338ca;">+ ${formatCurrency(inv.tax)}</td>
                </tr>`
              : ""
          }
        </tbody>
        <tfoot>
          <tr>
            <td style="text-transform: uppercase;">Total Invoice Amount</td>
            <td class="tar" style="font-size: 13px; color: #0f172a;">${formatCurrency(
              inv.final_amount
            )}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Payments Applied History if available -->
    ${
      inv.payments && inv.payments.length > 0
        ? `<div style="margin-bottom: 8px;">
            <div class="section-title">PAYMENT LOG FOR THIS INVOICE</div>
            <div style="border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                  <tr style="background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 8px;">
                    <th style="padding: 4px 8px; text-align: left;">Receipt #</th>
                    <th style="padding: 4px 8px; text-align: left;">Date</th>
                    <th style="padding: 4px 8px; text-align: left;">Method</th>
                    <th style="padding: 4px 8px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${inv.payments
                    .map(
                      (p) => `
                    <tr style="border-top: 1px solid #f1f5f9;">
                      <td style="padding: 4px 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${
                        p.receipt_number
                      }</td>
                      <td style="padding: 4px 8px;">${formatDate(p.payment_date)}</td>
                      <td style="padding: 4px 8px;">${p.payment_method}</td>
                      <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #047857;">${formatCurrency(
                        p.amount
                      )}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>`
        : ""
    }

    <!-- Notes or Terms -->
    ${
      inv.is_cancelled
        ? `<div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 6px 10px; border-radius: 5px; margin-bottom: 8px; color: #9f1239; font-size: 9px;">
            <strong>INVOICE CANCELLED:</strong> Reason: ${inv.cancel_reason || "Administrative"}
          </div>`
        : ""
    }

    ${
      inv.notes
        ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 5px; margin-bottom: 8px; font-size: 9px; color: #475569;">
            <strong style="color: #334155;">NOTES / TERMS:</strong> ${inv.notes}
          </div>`
        : ""
    }

    <!-- Bottom Contact & Signoff -->
    <div class="footer-section">
      <div>Thank you for choosing <strong>${instName}</strong>.</div>
      <div>Official Computer-Generated Document • No Signature Required</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates clean, standalone, single-page A4 HTML for a Payment Receipt.
 */
export function generateReceiptHtml(receipt: PrintableReceiptData): string {
  const instName = receipt.institute_name || "Institute Management System";
  const instLogo = receipt.institute_logo;
  const instPhone = receipt.institute_phone;
  const instEmail = receipt.institute_email;
  const instAddress = receipt.institute_address;

  const thisPayment =
    receipt.this_payment !== undefined ? receipt.this_payment : receipt.amount;
  const remBal =
    receipt.remaining_balance !== undefined ? receipt.remaining_balance : 0;
  const prevPaid =
    receipt.previously_paid !== undefined ? receipt.previously_paid : 0;
  const invTotal =
    receipt.invoice_total !== undefined
      ? receipt.invoice_total
      : prevPaid + thisPayment + remBal;

  const status = getReceiptStatusInfo(receipt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payment Receipt #${receipt.receipt_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 10px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-table td {
      vertical-align: top;
    }
    .inst-logo {
      max-height: 48px;
      max-width: 130px;
      object-fit: contain;
      display: block;
      margin-right: 10px;
    }
    .inst-name {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
      line-height: 1.15;
    }
    .inst-sub {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }
    .inst-meta {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-title-block {
      text-align: right;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .meta-row {
      font-size: 9.5px;
      color: #475569;
      margin-bottom: 2px;
    }
    .meta-label {
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      font-size: 8.5px;
      display: inline-block;
      min-width: 75px;
    }
    .meta-val-rec {
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #047857;
      font-size: 11px;
    }

    /* Hero Amount Banner */
    .hero-banner {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .hero-label {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #166534;
    }
    .hero-amount {
      font-size: 22px;
      font-weight: 900;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #15803d;
    }

    /* Info Grid */
    .info-grid {
      width: 100%;
      margin-bottom: 10px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 10px;
      vertical-align: top;
    }
    .section-title {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .student-name {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .student-line {
      font-size: 9.5px;
      color: #334155;
      margin-bottom: 1.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 2.5px 8px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 9px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: 1px solid ${status.border};
      background: ${status.bg};
      color: ${status.color};
    }

    /* Financial Summary Table */
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .summary-header {
      background: #0f172a;
      color: #ffffff;
      padding: 5px 10px;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 5px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9.5px;
    }
    .summary-table td.tar {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
    }
    .summary-table tr.highlight {
      background: #f8fafc;
      font-weight: 800;
      font-size: 10.5px;
    }

    /* Footer */
    .footer-section {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 8.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="receipt-sheet">
    <!-- Top Header -->
    <table class="header-table" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 60%;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              ${
                instLogo
                  ? `<td><img src="${instLogo}" class="inst-logo" alt="${instName}" /></td>`
                  : ""
              }
              <td>
                <div class="inst-name">${instName}</div>
                ${instAddress ? `<div class="inst-sub">${instAddress}</div>` : ""}
                <div class="inst-meta">
                  ${[
                    instPhone ? `Phone: ${instPhone}` : "",
                    instEmail ? `Email: ${instEmail}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
                ${
                  receipt.institute_tax_number
                    ? `<div class="inst-meta" style="font-weight: 700;">GSTIN: ${receipt.institute_tax_number}</div>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 40%; text-align: right;" class="doc-title-block">
          <div class="doc-title">PAYMENT RECEIPT</div>
          <div class="meta-row">
            <span class="meta-label">Receipt No:</span>
            <span class="meta-val-rec">${receipt.receipt_number}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Receipt Date:</span>
            <span>${formatDate(receipt.payment_date)}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Hero Amount Banner -->
    <div class="hero-banner">
      <div>
        <div class="hero-label">AMOUNT RECEIVED</div>
        <div style="font-size: 9px; color: #15803d; margin-top: 2px;">
          Method: <strong>${receipt.payment_method}</strong>
          ${receipt.reference_number ? ` • Ref: <strong>${receipt.reference_number}</strong>` : ""}
        </div>
      </div>
      <div class="hero-amount">${formatCurrency(thisPayment)}</div>
    </div>

    <!-- Student & Payment Meta Grid -->
    <table class="info-grid" cellpadding="0" cellspacing="0">
      <tr>
        <td class="info-box" style="width: 50%;">
          <div class="section-title">RECEIVED FROM (STUDENT)</div>
          <div class="student-name">${receipt.student.name}</div>
          <div class="student-line"><strong>Student ID:</strong> ${receipt.student.student_code}</div>
          <div class="student-line"><strong>Course:</strong> ${receipt.course_name}</div>
          ${
            receipt.student.phone || receipt.student.email
              ? `<div class="student-line" style="color: #64748b;">${[
                  receipt.student.phone,
                  receipt.student.email,
                ]
                  .filter(Boolean)
                  .join(" • ")}</div>`
              : ""
          }
        </td>
        <td class="info-box" style="width: 50%;">
          <div class="section-title">PAYMENT DETAILS</div>
          <div class="student-line">
            <strong>Invoice No:</strong> ${receipt.invoice_number || "Direct Account Credit"}
          </div>
          <div class="student-line">
            <strong>Payment Date:</strong> ${formatDate(receipt.payment_date)}
          </div>
          <div class="student-line">
            <strong>Payment Method:</strong> ${receipt.payment_method}
          </div>
          ${
            receipt.reference_number
              ? `<div class="student-line"><strong>Reference No:</strong> ${receipt.reference_number}</div>`
              : ""
          }
          ${
            receipt.recorded_by_name
              ? `<div class="student-line"><strong>Received By:</strong> ${receipt.recorded_by_name}</div>`
              : ""
          }
        </td>
      </tr>
    </table>

    <!-- Payment Summary Breakdown -->
    <div class="summary-card">
      <div class="summary-header">PAYMENT & BALANCE RECONCILIATION</div>
      <table class="summary-table">
        <tbody>
          <tr>
            <td style="width: 70%; color: #475569;">Total Course / Invoice Fee</td>
            <td class="tar">${formatCurrency(invTotal)}</td>
          </tr>
          <tr>
            <td style="color: #475569;">Previously Paid</td>
            <td class="tar" style="color: #047857;">${formatCurrency(prevPaid)}</td>
          </tr>
          <tr style="background: #f0fdf4;">
            <td style="font-weight: 700; color: #166534;">This Payment Received</td>
            <td class="tar" style="font-weight: 800; color: #15803d; font-size: 11px;">${formatCurrency(
              thisPayment
            )}</td>
          </tr>
          <tr class="highlight">
            <td style="color: ${remBal <= 0.001 ? "#047857" : "#be123c"}; font-weight: 800;">
              ${remBal <= 0.001 ? "Balance Remaining (Fully Cleared)" : "Balance Remaining"}
            </td>
            <td class="tar" style="color: ${
              remBal <= 0.001 ? "#047857" : "#be123c"
            }; font-size: 12px; font-weight: 900;">
              ${formatCurrency(remBal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Status Badge -->
    <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 5px;">
      <span style="font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase;">
        Account Standing:
      </span>
      <span class="status-badge">● ${status.text}</span>
    </div>

    ${
      receipt.notes
        ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 5px; margin-bottom: 8px; font-size: 9px; color: #475569;">
            <strong style="color: #334155;">REMARKS:</strong> ${receipt.notes}
          </div>`
        : ""
    }

    <!-- Signoff & Footer -->
    <div class="footer-section">
      <div>Thank you for your payment to <strong>${instName}</strong>.</div>
      <div>Official Payment Receipt • Computer Generated</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers the native browser print/save-as-PDF dialog using an isolated, hidden iframe.
 * Prevents modal clipping, duplicate page artifacts, and popup blocker interference.
 */
export function printHtmlViaIframe(htmlContent: string, documentTitle: string) {
  if (typeof window === "undefined") return;

  const existingIframe = document.getElementById("erp-print-iframe");
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "erp-print-iframe";
  iframe.setAttribute(
    "style",
    "position: fixed; width: 0; height: 0; border: 0; left: -9999px; top: -9999px; visibility: hidden;"
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Print execution failed:", err);
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => {
      setTimeout(doPrint, 150);
    };
    setTimeout(doPrint, 350);
  }
}

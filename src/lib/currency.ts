/**
 * Central Indian Rupees (INR) currency utility for Institute Management CRM.
 * Configured for Indian locale (en-IN) and symbol (₹).
 */

export const CURRENCY_CODE = "INR";
export const CURRENCY_SYMBOL = "₹";
export const CURRENCY_LOCALE = "en-IN";

/**
 * Formats a monetary number into Indian Rupees (INR) using Indian Number System.
 * Example: 50000 -> "₹50,000", 100000 -> "₹1,00,000", 1050000 -> "₹10,50,000"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return `${CURRENCY_SYMBOL}0`;
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return `${CURRENCY_SYMBOL}0`;
  }

  try {
    const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(num);

    return `${CURRENCY_SYMBOL}${formatted}`;
  } catch (err) {
    return `${CURRENCY_SYMBOL}${num.toLocaleString("en-IN")}`;
  }
}

/**
 * Formats a monetary number into Indian Rupees (INR) with decimal places (paisa).
 * Example: 50000.5 -> "₹50,000.50"
 */
export function formatCurrencyWithDecimals(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return `${CURRENCY_SYMBOL}0.00`;
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return `${CURRENCY_SYMBOL}0.00`;
  }

  try {
    const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(num);

    return `${CURRENCY_SYMBOL}${formatted}`;
  } catch (err) {
    return `${CURRENCY_SYMBOL}${num.toFixed(2)}`;
  }
}

/**
 * User-friendly error message formatter to prevent raw technical Prisma / Server errors
 * from being exposed to institute owners, staff, and students.
 */
export function formatErrorMessage(
  error: any,
  fallbackMessage = "Unable to process request. Please try again."
): string {
  if (!error) return fallbackMessage;

  const msg = typeof error === "string" ? error : error.message || String(error);

  // Unique constraint violation (Prisma P2002)
  if (msg.includes("P2002") || msg.includes("Unique constraint failed")) {
    if (msg.toLowerCase().includes("email")) {
      return "An account with this email address already exists in your institute.";
    }
    if (msg.toLowerCase().includes("student_code")) {
      return "Student ID already exists. Please enter or generate a unique Student ID.";
    }
    if (msg.toLowerCase().includes("employee_id")) {
      return "Staff ID already exists. Please enter a unique Staff ID.";
    }
    return "This record already exists in your institute.";
  }

  // Database connection errors (Prisma P1000, P1001, P1002)
  if (msg.includes("P1000") || msg.includes("P1001") || msg.includes("P1002")) {
    return "Unable to connect to database. Please check connection and try again.";
  }

  // Record not found (Prisma P2025)
  if (msg.includes("P2025")) {
    return "The requested record was not found or has been deleted.";
  }

  // Clean user-facing text message
  if (typeof error === "string" && !error.includes("Prisma") && !error.includes("at ")) {
    return error;
  }

  if (error.message && !error.message.includes("PrismaClient") && !error.message.includes("at ")) {
    return error.message;
  }

  return fallbackMessage;
}

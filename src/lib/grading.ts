/**
 * Configurable Grading Utility for Institute Management CRM
 */

export function calculatePercentage(obtained: number, max: number): number {
  if (!max || max <= 0) return 0;
  const pct = (obtained / max) * 100;
  return Math.min(100, Math.max(0, parseFloat(pct.toFixed(2))));
}

export function determinePassStatus(obtained: number, passingMarks: number): boolean {
  return obtained >= passingMarks;
}

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export interface DateRange {
  start?: Date;
  end?: Date;
}

export function parseDateFilter(
  rangeType: string,
  startDateStr?: string | null,
  endDateStr?: string | null
): DateRange {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (rangeType) {
    case "today": {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start: startOfDay, end: endOfDay };
    }
    case "week": {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end: endOfDay };
    }
    case "month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: startOfMonth, end: endOfDay };
    }
    case "year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start: startOfYear, end: endOfDay };
    }
    case "custom": {
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      return {};
    }
    default:
      return {};
  }
}

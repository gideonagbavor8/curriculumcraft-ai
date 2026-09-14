/**
 * Distributes a week's indicators across N teaching days, balanced (earlier
 * days absorb any remainder) and order-preserving (so related/sequential
 * indicators - which schemes almost always list in teaching order - stay
 * adjacent). When there are more days than indicators, the extra day(s) are
 * treated as practice/consolidation days that repeat the previous day's
 * indicators rather than being left with nothing to teach.
 */
export interface DayPlan<T> {
  dayIndex: number;
  indicators: T[];
  isPracticeDay: boolean;
}

export function distributeIndicatorsAcrossDays<T>(items: T[], totalDays: number): DayPlan<T>[] {
  const days = Math.max(1, totalDays);
  if (items.length === 0) {
    return Array.from({ length: days }, (_, dayIndex) => ({ dayIndex, indicators: [], isPracticeDay: true }));
  }

  const base = Math.floor(items.length / days);
  const extra = items.length % days;
  const plan: DayPlan<T>[] = [];
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const count = base + (dayIndex < extra ? 1 : 0);
    const slice = items.slice(cursor, cursor + count);
    cursor += count;

    if (slice.length > 0) {
      plan.push({ dayIndex, indicators: slice, isPracticeDay: false });
    } else {
      // No indicators left for this day (more days than indicators) - reuse
      // the previous day's as a practice/consolidation focus rather than
      // leaving the day with nothing.
      const previous = plan[plan.length - 1]?.indicators ?? items.slice(-1);
      plan.push({ dayIndex, indicators: previous, isPracticeDay: true });
    }
  }

  return plan;
}

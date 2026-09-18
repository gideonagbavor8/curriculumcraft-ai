const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

/**
 * The date a lesson is taught, from the week-ending date (a Friday on a GES
 * lesson plan) and the day it falls on - so the plan's Date cell says
 * "14 Oct 2026", not the week's last day. Empty when either is unset.
 */
export function lessonDateFor(weekEnding: string, day: string): string {
  const dayIndex = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
  if (!weekEnding || dayIndex < 0) return "";
  const date = new Date(`${weekEnding}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() - (WEEKDAYS.length - 1 - dayIndex));
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

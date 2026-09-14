/**
 * Lesson duration and class size are typed by the teacher, not picked from a
 * fixed menu - a double period runs 70 minutes and a JHS stream can carry 52
 * pupils, and the generated plan's phase timings and group sizes are built
 * from these numbers. The bounds here only rule out values that could not be a
 * real lesson; everything between them is the teacher's to state.
 *
 * Shared by the input components and by the generation core, so the browser
 * and the server agree on what is acceptable - a request that skips the form
 * is checked just the same.
 */

export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 240;
export const MIN_CLASS_SIZE = 1;
export const MAX_CLASS_SIZE = 200;

export const DEFAULT_DURATION_MINUTES = "60";
export const DEFAULT_CLASS_SIZE = "35";

/** Whether a typed value is a whole number inside the given range. */
export function isWithin(value: string | undefined, min: number, max: number): boolean {
  if (value === undefined || value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

export function isValidDuration(value: string | undefined): boolean {
  return isWithin(value, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES);
}

export function isValidClassSize(value: string | undefined): boolean {
  return isWithin(value, MIN_CLASS_SIZE, MAX_CLASS_SIZE);
}

/**
 * The duration to generate with. An out-of-range or missing value falls back
 * to the default rather than failing the request, because a lesson built to a
 * sane length is more use to a teacher than an error - but a value the teacher
 * actually typed is always honoured exactly.
 */
export function resolveDuration(value: string | undefined): string {
  return isValidDuration(value) ? String(Number(value)) : DEFAULT_DURATION_MINUTES;
}

export function resolveClassSize(value: string | undefined): string {
  return isValidClassSize(value) ? String(Number(value)) : DEFAULT_CLASS_SIZE;
}

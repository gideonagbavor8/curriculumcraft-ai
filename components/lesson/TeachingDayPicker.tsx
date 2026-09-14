"use client";

/** The school week. A lesson is generated per selected day, and the day's name prints on the lesson itself. */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

interface TeachingDayPickerProps {
  selected: Weekday[];
  onChange: (days: Weekday[]) => void;
  disabled?: boolean;
}

/**
 * Which days of the week this subject is actually taught. The teacher picks
 * the days by name rather than a count, because the day is not just a
 * quantity - it prints on each generated lesson plan, where "Tuesday" is what
 * a head teacher checks against the timetable and "day 2" means nothing.
 */
export default function TeachingDayPicker({ selected, onChange, disabled }: TeachingDayPickerProps) {
  const toggle = (day: Weekday) => {
    const next = selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day];
    // Keep the week in timetable order however the teacher clicked them.
    onChange(WEEKDAYS.filter((d) => next.includes(d)));
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Teaching days this week
      </span>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day) => {
          const isSelected = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              disabled={disabled}
              aria-pressed={isSelected}
              // A fixed width keeps the five days an even row - "Wed" is wider
              // than "Fri", so text-sized buttons come out ragged.
              className={`w-14 text-center text-xs font-semibold px-2 py-1.5 rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "bg-green-700 border-green-700 text-white"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

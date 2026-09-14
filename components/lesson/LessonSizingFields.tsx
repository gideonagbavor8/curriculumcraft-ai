"use client";

import {
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_CLASS_SIZE,
  MAX_CLASS_SIZE,
  isWithin,
} from "@/lib/lessonSizing";

export { isValidDuration, isValidClassSize } from "@/lib/lessonSizing";

interface NumberFieldProps {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

function NumberField({ label, value, min, max, onChange, disabled, compact }: NumberFieldProps) {
  const invalid = value !== "" && !isWithin(value, min, max);
  return (
    <div className="min-w-0">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">{label}</label>
      <div>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          aria-invalid={invalid}
          className={`w-full rounded-lg border bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 disabled:opacity-60 ${
            compact ? "py-1.5" : "py-2.5"
          } ${
            invalid
              ? "border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-500"
              : "border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
          }`}
        />
      </div>
      {invalid && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
          Enter a whole number between {min} and {max}.
        </p>
      )}
    </div>
  );
}

interface LessonSizingFieldsProps {
  duration: string;
  classSize: string;
  onDurationChange: (value: string) => void;
  onClassSizeChange: (value: string) => void;
  disabled?: boolean;
  /** Shorter fields, for sitting in a row beside other controls rather than in a form column. */
  compact?: boolean;
}

export default function LessonSizingFields({
  duration,
  classSize,
  onDurationChange,
  onClassSizeChange,
  disabled,
  compact,
}: LessonSizingFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField
        label="Duration (minutes)"
        value={duration}
        min={MIN_DURATION_MINUTES}
        max={MAX_DURATION_MINUTES}
        onChange={onDurationChange}
        disabled={disabled}
        compact={compact}
      />
      <NumberField
        label="Class size (learners)"
        value={classSize}
        min={MIN_CLASS_SIZE}
        max={MAX_CLASS_SIZE}
        onChange={onClassSizeChange}
        disabled={disabled}
        compact={compact}
      />
    </div>
  );
}

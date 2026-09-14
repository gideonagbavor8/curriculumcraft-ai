// Internal UI feature toggles - flip a flag to re-enable in one place,
// without touching the underlying generation/storage/export code that stays
// intact regardless of visibility.

// Visual Prompts are generated, saved, and exportable as before; only the
// teacher-facing tab/section is hidden while this is false.
export const SHOW_VISUAL_PROMPTS = false;

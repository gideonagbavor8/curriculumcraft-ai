// Internal UI feature toggles - flip a flag to re-enable in one place,
// without touching the underlying generation/storage/export code that stays
// intact regardless of visibility.

// Visual Prompts are generated, saved, and exportable as before; only the
// teacher-facing tab/section is hidden while this is false.
export const SHOW_VISUAL_PROMPTS = false;

// Feedback widget - the compact floating "Feedback" button
// on public and teacher pages. Uses the existing Google Form with pre-filled
// responses. With no form configured, the widget stays hidden.
export const SHOW_BETA_FEEDBACK_WIDGET = true;
export const FEEDBACK_FORM_URL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL?.trim() ?? "";
// Legacy destination retained for deployment compatibility.
export const BUG_REPORT_FORM_URL = process.env.NEXT_PUBLIC_BUG_REPORT_FORM_URL?.trim() || FEEDBACK_FORM_URL;

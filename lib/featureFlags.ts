// Internal UI feature toggles - flip a flag to re-enable in one place,
// without touching the underlying generation/storage/export code that stays
// intact regardless of visibility.

// Visual Prompts are generated, saved, and exportable as before; only the
// teacher-facing tab/section is hidden while this is false.
export const SHOW_VISUAL_PROMPTS = false;

// During the private beta the app steers everyone to the Scheme of Learning,
// which is the one path that is finished end to end. The other pages stay in
// the navigation and stay reachable - a teacher who lands on one gets a short
// note explaining where to go instead, rather than a dead link or a silent
// redirect. Set this to false to open the whole app up again.
export const BETA_FOCUS_ON_SCHEME = true;

/**
 * Where the beta wants everyone to end up, and the routes that don't get the
 * nudge. Remove a path from this list to put it behind the notice too.
 *
 * "/settings" is here on purpose rather than as an oversight: it is where a
 * teacher records their region, district and school, and the Scheme of
 * Learning reads that to set its lessons in the teacher's own community.
 * Blocking it would quietly downgrade every generated lesson to generic
 * examples. "/" is the front door and sells the scheme feature rather than
 * competing with it.
 */
export const BETA_FOCUS_DESTINATION = "/scheme-of-learning";
export const BETA_FOCUS_ALLOWED_PATHS = ["/", BETA_FOCUS_DESTINATION, "/settings", "/access"];

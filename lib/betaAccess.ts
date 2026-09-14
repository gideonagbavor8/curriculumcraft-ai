import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Temporary private-beta gate.
 *
 * Until the real authentication system lands, the whole app sits behind one
 * shared access code held in the BETA_ACCESS_CODE environment variable. The
 * code is checked on the server and never sent to the browser, so it cannot be
 * read out of the JavaScript bundle; what the browser gets back is a signed,
 * httpOnly cookie that `proxy.ts` checks on every request.
 *
 * This is a gate, not an identity system: everyone shares one code, so it
 * keeps strangers out of a private beta but tells you nothing about who is
 * using the app. Replace it wholesale when real auth arrives - see
 * `BETA_ACCESS_COOKIE` for the one name the rest of the code depends on.
 */

export const BETA_ACCESS_COOKIE = "cc_beta_access";

/** How long a granted pass lasts before the code must be entered again. */
export const BETA_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const TOKEN_VERSION = "v1";

/**
 * The configured access code, or null when none is set.
 *
 * With no code configured the gate is inactive and the app is open - that
 * keeps local development and existing deployments working untouched. It also
 * means a deployment that forgets the variable is NOT protected, so set it
 * wherever the beta is actually hosted.
 */
export function getBetaAccessCode(): string | null {
  const code = process.env.BETA_ACCESS_CODE?.trim();
  return code ? code : null;
}

/** Whether requests should be gated at all. */
export function isBetaGateEnabled(): boolean {
  return getBetaAccessCode() !== null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Constant-time string comparison, so a wrong code leaks nothing through timing. */
function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length - so compare a fixed-size digest of each side instead.
  const leftDigest = createHmac("sha256", "length-safe").update(left).digest();
  const rightDigest = createHmac("sha256", "length-safe").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

/** Whether a submitted code matches the configured one. */
export function isValidAccessCode(submitted: string): boolean {
  const expected = getBetaAccessCode();
  if (!expected) return false;
  return safeEquals(submitted.trim(), expected);
}

/**
 * Mints the cookie value proving the code was entered. Keyed by the access
 * code itself, so rotating the code immediately invalidates every pass already
 * issued - no separate secret to manage, and no way to revoke half a beta.
 */
export function createAccessToken(now: number = Date.now()): string | null {
  const secret = getBetaAccessCode();
  if (!secret) return null;
  const expiresAt = now + BETA_ACCESS_MAX_AGE_SECONDS * 1000;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Whether a cookie value is a pass this server issued and has not expired. */
export function isValidAccessToken(token: string | undefined, now: number = Date.now()): boolean {
  const secret = getBetaAccessCode();
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAtRaw, signature] = parts;
  if (version !== TOKEN_VERSION) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  return safeEquals(signature, sign(`${version}.${expiresAtRaw}`, secret));
}

/** The cookie attributes a granted pass is stored with. */
export function accessCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure,
    path: "/",
    maxAge: BETA_ACCESS_MAX_AGE_SECONDS,
  };
}

import { NextRequest, NextResponse } from "next/server";
import {
  BETA_ACCESS_COOKIE,
  accessCookieOptions,
  createAccessToken,
  isBetaGateEnabled,
  isValidAccessCode,
  isValidAccessToken,
} from "@/lib/betaAccess";

/**
 * Grants a private-beta pass in exchange for the access code.
 *
 * The code itself is only ever compared here, on the server - it is never sent
 * to the browser, so it cannot be lifted out of the JavaScript bundle. What
 * goes back is a signed httpOnly cookie that proxy.ts checks on later
 * requests.
 */

/**
 * Best-effort brute-force brake, per server instance. A shared beta code is
 * short enough to guess at machine speed, and this makes that slow and noisy
 * without needing a datastore. It is per-instance memory, so it is a speed
 * bump rather than a real rate limiter - the access code's own length is what
 * actually has to carry the weight.
 */
const MAX_ATTEMPTS_PER_WINDOW = 10;
const ATTEMPT_WINDOW_MS = 60_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(key: string, now: number): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS_PER_WINDOW;
}

/** Clears out windows that have already lapsed, so the map can't grow without bound. */
function pruneAttempts(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Whether this browser currently holds a valid pass. The access page calls
 * this straight after a successful unlock, before sending the teacher on: if
 * the browser refused to store the cookie (site data blocked, strict privacy
 * settings) the pass is silently missing, and without this check the only
 * symptom would be the gate reappearing as if the button had done nothing.
 */
export async function GET(request: NextRequest) {
  const unlocked = !isBetaGateEnabled() || isValidAccessToken(request.cookies.get(BETA_ACCESS_COOKIE)?.value);
  return NextResponse.json(
    { success: true, data: { gateEnabled: isBetaGateEnabled(), unlocked } },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isBetaGateEnabled()) {
      // No code configured means no gate - say so plainly rather than
      // rejecting a code that could never match.
      return NextResponse.json({ success: true, data: { gateEnabled: false } });
    }

    const now = Date.now();
    pruneAttempts(now);
    if (tooManyAttempts(clientKey(request), now)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code.trim()) {
      return NextResponse.json({ success: false, error: "Enter your access code." }, { status: 400 });
    }

    if (!isValidAccessCode(code)) {
      return NextResponse.json({ success: false, error: "That access code isn't right." }, { status: 401 });
    }

    const token = createAccessToken(now);
    if (!token) {
      return NextResponse.json({ success: false, error: "Access is not configured." }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, data: { gateEnabled: true } });
    response.cookies.set({
      name: BETA_ACCESS_COOKIE,
      value: token,
      ...accessCookieOptions(request.nextUrl.protocol === "https:"),
    });
    return response;
  } catch (error) {
    console.error("Beta access error:", error);
    return NextResponse.json({ success: false, error: "Could not check that access code." }, { status: 500 });
  }
}

/** Signs out of the beta - mainly so a shared machine can be handed over. */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: BETA_ACCESS_COOKIE,
    value: "",
    ...accessCookieOptions(request.nextUrl.protocol === "https:"),
    maxAge: 0,
  });
  return response;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BETA_ACCESS_COOKIE, isBetaGateEnabled, isValidAccessToken } from "@/lib/betaAccess";

/**
 * Holds the private beta shut. Runs before every request that the matcher
 * below lets through, and turns away anyone without a valid pass - a browser
 * gets sent to the access page, an API call gets a 401 rather than an HTML
 * redirect it cannot read.
 *
 * Gating the API routes matters as much as the pages: /api/generate spends
 * real money per call, so leaving it open while only the pages were gated
 * would protect nothing worth protecting.
 *
 * In Next.js 16 this file is `proxy.ts` - the former `middleware.ts`. It runs
 * on the Node.js runtime, which is what lets it share lib/betaAccess.ts and
 * its node:crypto signing with the route handler.
 */

/** Reachable without a pass: the gate itself, and the endpoint that grants one. */
const PUBLIC_PATHS = ["/access", "/api/beta-access", "/api/health"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  if (!isBetaGateEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  if (isValidAccessToken(request.cookies.get(BETA_ACCESS_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "This is a private beta - an access code is required." },
      { status: 401 }
    );
  }

  // Carry where they were headed, so entering the code lands them there
  // rather than dumping everyone on the home page.
  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  // Everything except Next's own build output, Vercel's analytics script and
  // static assets. Public files are matched by extension so images, fonts and
  // the favicon still load on the access page itself.
  matcher: ["/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};

import { NextResponse, type NextRequest } from "next/server";
import { userForToken } from "@/lib/auth";
import { isSameOrigin, SESSION_COOKIE } from "@/lib/authSecurity";

const TEACHER_PAGES = ["/dashboard", "/lesson-builder", "/activity-suite", "/scheme-of-learning", "/saved", "/settings", "/account"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const api = pathname.startsWith("/api/");
  const protectedApi = api && !pathname.startsWith("/api/auth/") && pathname !== "/api/health";
  const protectedPage = TEACHER_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!protectedApi && !protectedPage) return NextResponse.next();
  if (api && !["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: "Request origin is not allowed." }, { status: 403 });
  }
  try {
    const user = await userForToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!user) {
      if (api) return NextResponse.json({ success: false, error: "Sign in to use CurriculumCraft AI." }, { status: 401 });
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("Authentication service unavailable:", error);
    return NextResponse.json({ success: false, error: "Account service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};

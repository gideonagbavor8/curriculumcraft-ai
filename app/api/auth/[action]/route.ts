import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teacherAccounts, teacherSessions } from "@/db/schema";
import { consumeAuthAttempt, createSession, publicUserFields, userForToken } from "@/lib/auth";
import {
  hashPassword, hashToken, isSameOrigin, normaliseEmail, SESSION_COOKIE,
  SESSION_SECONDS, sessionCookieOptions, validPassword, verifyPassword,
} from "@/lib/authSecurity";

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "session") return failure("Not found.", 404);
  try {
    const user = await userForToken(request.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json({ success: true, data: user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return failure("Unable to load your account. Please try again.", 503);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!["sign-up", "sign-in", "sign-out", "profile"].includes(action)) return failure("Not found.", 404);
  if (!isSameOrigin(request)) return failure("Request origin is not allowed.", 403);
  try {
    if (action === "sign-out") {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (token) await db.delete(teacherSessions).where(eq(teacherSessions.tokenHash, hashToken(token)));
      const response = NextResponse.json({ success: true });
      response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
      return response;
    }
    const raw = await request.text();
    if (raw.length > 4096) return failure("Request is too large.", 413);
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return failure("Invalid request.", 400);
      body = parsed as Record<string, unknown>;
    } catch {
      return failure("Invalid JSON request.", 400);
    }
    if (action === "profile") {
      const user = await userForToken(request.cookies.get(SESSION_COOKIE)?.value);
      if (!user) return failure("Sign in to update your profile.", 401);
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100) {
        return failure("Enter a name between 2 and 100 characters.", 400);
      }
      const [updated] = await db.update(teacherAccounts).set({ name: body.name.trim() })
        .where(eq(teacherAccounts.id, user.id)).returning(publicUserFields);
      return NextResponse.json({ success: true, data: updated });
    }
    const email = normaliseEmail(body.email);
    if (!email || !validPassword(body.password)) {
      return failure("Enter a valid email and a password of 12 to 128 characters.", 400);
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (action === "sign-up" && (name.length < 2 || name.length > 100)) {
      return failure("Enter a name between 2 and 100 characters.", 400);
    }
    if (!await consumeAuthAttempt(`${action}:global`, 100)
      || !await consumeAuthAttempt(`${action}:${email}`, 10)) {
      return NextResponse.json({ success: false, error: "Too many attempts. Please try again in 10 minutes." },
        { status: 429, headers: { "Retry-After": "600" } });
    }
    let userId: string;
    if (action === "sign-up") {
      const [created] = await db.insert(teacherAccounts).values({
        name, email, passwordHash: await hashPassword(body.password),
      }).onConflictDoNothing({ target: teacherAccounts.email }).returning({ id: teacherAccounts.id });
      if (!created) return failure("Unable to create an account with these details. Try signing in instead.", 409);
      userId = created.id;
    } else {
      const [account] = await db.select().from(teacherAccounts).where(eq(teacherAccounts.email, email)).limit(1);
      // Equal-cost verification for unknown accounts reduces timing enumeration.
      const dummyHash = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
      const valid = await verifyPassword(body.password, account?.passwordHash ?? dummyHash);
      if (!account || !valid) return failure("Email or password is incorrect.", 401);
      userId = account.id;
    }
    const token = await createSession(userId);
    const response = NextResponse.json({ success: true }, { status: action === "sign-up" ? 201 : 200 });
    response.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge: SESSION_SECONDS });
    return response;
  } catch (error) {
    console.error("Account request failed:", error);
    return failure("Unable to complete your account request. Please try again.", 503);
  }
}

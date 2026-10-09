import { randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authRateLimits, teacherAccounts, teacherSessions } from "@/db/schema";
import { hashToken, isSameOrigin, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/authSecurity";

export const publicUserFields = {
  id: teacherAccounts.id,
  name: teacherAccounts.name,
  email: teacherAccounts.email,
  createdAt: teacherAccounts.createdAt,
};

export async function userForToken(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [user] = await db.select(publicUserFields).from(teacherSessions)
    .innerJoin(teacherAccounts, eq(teacherAccounts.id, teacherSessions.userId))
    .where(and(eq(teacherSessions.tokenHash, hashToken(token)), gt(teacherSessions.expiresAt, new Date())))
    .limit(1);
  return user ?? null;
}

export async function currentUser() {
  return userForToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.insert(teacherSessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
  });
  return token;
}

export async function authorize(request?: NextRequest) {
  if (request && !["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: "Request origin is not allowed." }, { status: 403 });
  }
  const user = request
    ? await userForToken(request.cookies.get(SESSION_COOKIE)?.value)
    : await currentUser();
  return user ?? NextResponse.json({ success: false, error: "Sign in to access your teaching workspace." }, { status: 401 });
}

// Atomic, shared across server instances. Keys contain hashes, not email addresses.
export async function consumeAuthAttempt(key: string, limit: number) {
  const [row] = await db.insert(authRateLimits).values({
    key: hashToken(key), attempts: 1, expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  }).onConflictDoUpdate({
    target: authRateLimits.key,
    set: {
      attempts: sql`case when ${authRateLimits.expiresAt} <= now() then 1 else ${authRateLimits.attempts} + 1 end`,
      expiresAt: sql`case when ${authRateLimits.expiresAt} <= now() then now() + interval '10 minutes' else ${authRateLimits.expiresAt} end`,
    },
  }).returning({ attempts: authRateLimits.attempts });
  return row.attempts <= limit;
}

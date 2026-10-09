import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "cc_teacher_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algorithm, salt, key] = hash.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(key ?? "")) {
    throw new Error("Invalid stored password hash");
  }
  return timingSafeEqual(await derive(password, salt), Buffer.from(key, "hex"));
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeReturnPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !/[\\\x00-\x1f]/.test(value)
    && !value.startsWith("/sign-in") && !value.startsWith("/sign-up")
    ? value : "/account";
}

export function isSameOrigin(request: Request): boolean {
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  return request.headers.get("origin") === expected;
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

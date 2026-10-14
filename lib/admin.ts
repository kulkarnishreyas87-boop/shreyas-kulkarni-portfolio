import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

export const ADMIN_COOKIE = "pf_admin";
export const SESSION_HOURS = 12;

const secret = () => (process.env.ADMIN_SESSION_SECRET || "").trim();
export const adminConfigured = () => !!(process.env.ADMIN_PASSWORD || "").trim() && secret().length >= 16;

const sign = (payload: string, key = secret()) => createHmac("sha256", key).update(payload).digest("base64url");

/** "<expiry ms>.<signature>": nothing secret inside, it only proves the server issued it. */
export function makeSession(now = Date.now(), key = secret()): string {
  const exp = String(now + SESSION_HOURS * 3600_000);
  return `${exp}.${sign(exp, key)}`;
}

export function verifySession(value: string | undefined, now = Date.now(), key = secret()): boolean {
  if (!value || !key) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp, key));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Constant-time password check (both sides hashed first so lengths match). */
export function passwordMatches(given: string, expected = (process.env.ADMIN_PASSWORD || "").trim()): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  return verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in");
}

/** A salted hash of the caller's IP, so rate limits and stored messages never keep the raw address. */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return createHash("sha256").update(`${secret() || "portfolio"}:${ip}`).digest("hex").slice(0, 32);
}

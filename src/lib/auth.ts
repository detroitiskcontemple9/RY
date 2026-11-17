import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { bootstrapAdminEmails } from "./config";
import { hmac, timingSafeEqual } from "./crypto";

const COOKIE = "seva_session";
const SESSION_DAYS = 30;

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-insecure-session-secret";
  throw new Error("SESSION_SECRET is not set");
}

export async function isAllowedAdmin(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (bootstrapAdminEmails().includes(e)) return true;
  const db = await getDb();
  const rows = await db.select().from(schema.admins).where(eq(schema.admins.email, e)).limit(1);
  return rows.length > 0;
}

export async function createSession(email: string) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${email.toLowerCase()}|${exp}`;
  const sig = await hmac(sessionSecret(), payload);
  const jar = await cookies();
  jar.set(COOKIE, `${btoa(payload)}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in admin's email, or null. */
export async function getSessionEmail(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [b64, sig] = raw.split(".");
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = atob(b64);
  } catch {
    return null;
  }
  const expected = await hmac(sessionSecret(), payload);
  if (!timingSafeEqual(sig, expected)) return null;
  const [email, exp] = payload.split("|");
  if (!email || Number(exp) < Date.now()) return null;
  // Re-check so removed admins lose access immediately.
  if (!(await isAllowedAdmin(email))) return null;
  return email;
}

export async function requireAdmin(): Promise<string> {
  const email = await getSessionEmail();
  if (!email) redirect("/admin/login");
  return email;
}

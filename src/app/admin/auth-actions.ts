"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { destroySession, isAllowedAdmin } from "@/lib/auth";
import { randomToken, sha256 } from "@/lib/crypto";
import { getConfig } from "@/lib/config";
import { sendEmail } from "@/lib/email";
import { loginEmail } from "@/lib/email-templates";

export type LoginState = { sent?: boolean; error?: string; devLink?: string } | undefined;

export async function requestLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Please enter a valid email." };
  const email = parsed.data;

  // Always respond the same way so the form doesn't reveal who is an admin.
  if (!(await isAllowedAdmin(email))) return { sent: true };

  const token = randomToken(32);
  const db = await getDb();
  await db.insert(schema.loginTokens).values({
    tokenHash: await sha256(token),
    email,
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });
  const base = getConfig().appUrl || `https://${(await headers()).get("host")}`;
  const link = `${base}/admin/auth/verify?token=${encodeURIComponent(token)}`;
  await sendEmail({ to: email, ...loginEmail(link) });

  // In local development without email configured, show the link directly.
  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) return { sent: true, devLink: link };
  return { sent: true };
}

export async function signOut() {
  await destroySession();
  redirect("/admin/login");
}

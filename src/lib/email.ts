import "server-only";
import { getConfig } from "./config";

type Email = { to: string; subject: string; html: string; text: string; replyTo?: string };

/** Sends via Resend's HTTP API. Without RESEND_API_KEY (local dev) it logs instead. */
export async function sendEmail(email: Email): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY is not set; email not sent:", email.subject);
      return { ok: false, error: "Email is not configured" };
    }
    console.log(`\n📧 [dev email] To: ${email.to}\nSubject: ${email.subject}\n${email.text}\n`);
    return { ok: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: cfg.emailFrom,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo || cfg.orgEmail || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error", res.status, body);
    return { ok: false, error: `Resend ${res.status}` };
  }
  return { ok: true };
}

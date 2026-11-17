import "server-only";
import { getConfig } from "./config";
import { formatUSD } from "./money";
import { formatDate } from "./dates";
import { methodLabel } from "./labels";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, bodyHtml: string): string {
  const cfg = getConfig();
  return `<!doctype html><html><body style="margin:0;background:#fbf6ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b1d14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #f0e2cf">
<tr><td style="background:#b4440e;color:#fff;padding:20px 24px;font-size:18px;font-weight:600">${esc(cfg.orgName)} Seva</td></tr>
<tr><td style="padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 24px;background:#fbf6ef;font-size:12px;color:#7a6556">
${esc(cfg.orgLegalName)}${cfg.orgAddress ? ` · ${esc(cfg.orgAddress)}` : ""}<br/>
Tax ID (EIN): ${esc(cfg.orgEin)}${cfg.orgEmail ? ` · ${esc(cfg.orgEmail)}` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#b4440e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${esc(label)}</a></p>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#7a6556">${esc(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(value)}</td></tr>`;
}

export function receiptEmail(d: {
  donorName: string;
  eventTitle: string | null;
  tierName: string | null;
  amountCents: number;
  feeCoveredCents: number;
  totalCents: number;
  method: string | null;
  date: string;
  receiptId: string;
  dedication: string | null;
}) {
  const cfg = getConfig();
  const lines: [string, string][] = [
    ["Receipt #", d.receiptId.slice(0, 8).toUpperCase()],
    ["Date", d.date],
    ["Campaign", d.eventTitle ?? "General donation"],
    ...(d.tierName ? ([["Seva", d.tierName]] as [string, string][]) : []),
    ["Donation", formatUSD(d.amountCents, { cents: true })],
    ...(d.feeCoveredCents
      ? ([["Processing fees you covered", formatUSD(d.feeCoveredCents, { cents: true })]] as [string, string][])
      : []),
    ["Total contribution", formatUSD(d.totalCents, { cents: true })],
    ...(d.method ? ([["Payment method", methodLabel(d.method)]] as [string, string][]) : []),
  ];
  const statement = `${cfg.orgLegalName} is a tax-exempt 501(c)(3) organization (EIN ${cfg.orgEin}). No goods or services were provided in exchange for this contribution. Please keep this receipt for your tax records.`;
  const html = layout(
    "Thank you for your seva! 🙏",
    `<p>Hare Krishna ${esc(d.donorName)},</p>
<p>Thank you for your generous offering${d.eventTitle ? ` for <b>${esc(d.eventTitle)}</b>` : ""}. May Their Lordships bless you and your family.</p>
${d.dedication ? `<p style="font-style:italic">Offered: ${esc(d.dedication)}</p>` : ""}
<table role="presentation" width="100%" style="border-top:1px solid #f0e2cf;border-bottom:1px solid #f0e2cf;margin:16px 0;font-size:14px">${lines.map(([l, v]) => row(l, v)).join("")}</table>
<p style="font-size:13px;color:#7a6556">${esc(statement)}</p>`,
  );
  const text = `Hare Krishna ${d.donorName},\n\nThank you for your offering${d.eventTitle ? ` for ${d.eventTitle}` : ""}.\n\n${lines.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\n${statement}\n\n${cfg.orgLegalName}`;
  return { subject: `Your donation receipt — ${cfg.orgName}`, html, text };
}

export function pledgeConfirmationEmail(p: {
  donorName: string;
  eventTitle: string | null;
  amountCents: number;
  dueDate: string;
  payUrl: string;
}) {
  const cfg = getConfig();
  const html = layout(
    "Your pledge is confirmed",
    `<p>Hare Krishna ${esc(p.donorName)},</p>
<p>Thank you for pledging <b>${formatUSD(p.amountCents)}</b>${p.eventTitle ? ` for <b>${esc(p.eventTitle)}</b>` : ""}. We'll send you a friendly reminder before <b>${formatDate(p.dueDate)}</b>.</p>
<p>You can pay any time, in full or in parts, using your personal link:</p>
${button(p.payUrl, "Pay my pledge")}
<p style="font-size:13px;color:#7a6556">Keep this email — the link above always shows your remaining balance.</p>`,
  );
  const text = `Hare Krishna ${p.donorName},\n\nThank you for pledging ${formatUSD(p.amountCents)}${p.eventTitle ? ` for ${p.eventTitle}` : ""}. Due by ${formatDate(p.dueDate)}.\n\nPay any time: ${p.payUrl}\n\n${cfg.orgName}`;
  return { subject: `Pledge confirmed — ${p.eventTitle ?? cfg.orgName}`, html, text };
}

export type ReminderKind = "before" | "due" | "overdue" | "manual";

export function pledgeReminderEmail(p: {
  kind: ReminderKind;
  donorName: string;
  eventTitle: string | null;
  amountCents: number;
  balanceCents: number;
  dueDate: string;
  payUrl: string;
}) {
  const cfg = getConfig();
  const what = p.eventTitle ? ` for ${p.eventTitle}` : "";
  const intro: Record<ReminderKind, string> = {
    before: `This is a gentle reminder that your pledge${what} is due on ${formatDate(p.dueDate)}.`,
    due: `Your pledge${what} is due today. Thank you for your commitment to this seva!`,
    overdue: `Just a kind reminder that your pledge${what} was due on ${formatDate(p.dueDate)}. If you've already paid by cash, check, or Zelle, please ignore this note.`,
    manual: `A friendly reminder about your pledge${what}, due ${formatDate(p.dueDate)}.`,
  };
  const subject: Record<ReminderKind, string> = {
    before: `Reminder: your pledge is due ${formatDate(p.dueDate)}`,
    due: "Your pledge is due today",
    overdue: "Friendly reminder about your pledge",
    manual: "Reminder about your pledge",
  };
  const zelle = cfg.zelleRecipient
    ? `<p style="font-size:13px;color:#7a6556">Prefer Zelle? Send to <b>${esc(cfg.zelleRecipient)}</b> and include your name in the memo.</p>`
    : "";
  const html = layout(
    "Pledge reminder",
    `<p>Hare Krishna ${esc(p.donorName)},</p>
<p>${esc(intro[p.kind])}</p>
<table role="presentation" width="100%" style="border-top:1px solid #f0e2cf;border-bottom:1px solid #f0e2cf;margin:16px 0;font-size:14px">
${row("Pledged", formatUSD(p.amountCents))}${row("Remaining", formatUSD(p.balanceCents))}${row("Due", formatDate(p.dueDate))}</table>
${button(p.payUrl, `Pay ${formatUSD(p.balanceCents)} now`)}
${zelle}`,
  );
  const text = `Hare Krishna ${p.donorName},\n\n${intro[p.kind]}\n\nPledged: ${formatUSD(p.amountCents)}\nRemaining: ${formatUSD(p.balanceCents)}\n\nPay now: ${p.payUrl}\n${cfg.zelleRecipient ? `\nZelle: ${cfg.zelleRecipient}\n` : ""}\n${cfg.orgName}`;
  return { subject: subject[p.kind], html, text };
}

export function loginEmail(link: string) {
  const html = layout(
    "Sign in to Seva admin",
    `<p>Click below to sign in. This link expires in 15 minutes and can be used once.</p>${button(link, "Sign in")}<p style="font-size:13px;color:#7a6556">If you didn't request this, you can ignore this email.</p>`,
  );
  return { subject: "Your Seva admin sign-in link", html, text: `Sign in: ${link}\n\nExpires in 15 minutes.` };
}

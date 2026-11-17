import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Pledge } from "@/db/schema";
import { getConfig } from "./config";
import { todayIn } from "./dates";
import { dueReminder } from "./reminder-schedule";
import { sendEmail } from "./email";
import { pledgeReminderEmail, type ReminderKind } from "./email-templates";
import { pledgePaidCents } from "./donations";

export async function sendPledgeReminder(p: Pledge, kind: ReminderKind) {
  const db = await getDb();
  const cfg = getConfig();
  const [event] = p.eventId ? await db.select().from(schema.events).where(eq(schema.events.id, p.eventId)) : [];
  const balance = p.amountCents - (await pledgePaidCents(p.id));
  if (balance <= 0) return { ok: false, error: "Pledge already paid" };

  const res = await sendEmail({
    to: p.donorEmail,
    ...pledgeReminderEmail({
      kind,
      donorName: p.donorName,
      eventTitle: event?.title ?? null,
      amountCents: p.amountCents,
      balanceCents: balance,
      dueDate: p.dueDate,
      payUrl: `${cfg.appUrl}/pledge/${p.token}`,
    }),
  });
  if (res.ok) {
    const now = new Date();
    const field =
      kind === "before"
        ? { reminderBeforeSentAt: now }
        : kind === "due"
          ? { reminderDueSentAt: now }
          : kind === "overdue"
            ? { reminderOverdueSentAt: now }
            : { lastManualReminderAt: now };
    await db.update(schema.pledges).set(field).where(eq(schema.pledges.id, p.id));
  }
  return res;
}

/** Daily job: sends at most one reminder per open pledge. */
export async function runPledgeReminders() {
  const db = await getDb();
  const today = todayIn(getConfig().timezone);
  const open = await db.select().from(schema.pledges).where(eq(schema.pledges.status, "open"));
  const result = { checked: open.length, sent: 0, failed: 0 };
  for (const p of open) {
    const kind = dueReminder(p, today);
    if (!kind) continue;
    const res = await sendPledgeReminder(p, kind);
    if (res.ok) result.sent++;
    else result.failed++;
  }
  return result;
}

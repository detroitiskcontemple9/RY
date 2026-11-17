import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, schema } from "@/db";
import type { DonationMethod } from "@/db/schema";
import { getConfig } from "./config";
import { sendEmail } from "./email";
import { receiptEmail } from "./email-templates";
import { formatDateTime } from "./dates";

const { donations, events, sevaTiers, pledges } = schema;

/** Maps a Stripe PaymentMethod to our method label (Apple Pay is a card wallet). */
export function methodFromStripe(pm: Stripe.PaymentMethod | string | null | undefined): DonationMethod | null {
  if (!pm || typeof pm === "string") return null;
  if (pm.type === "card") {
    const wallet = pm.card?.wallet?.type;
    if (wallet === "apple_pay") return "apple_pay";
    if (wallet === "google_pay") return "google_pay";
    return "card";
  }
  if (pm.type === "us_bank_account") return "us_bank_account";
  if (pm.type === "link") return "link";
  return "other";
}

/**
 * Applies a Checkout Session's state to our donation. Idempotent: safe to call
 * from the webhook and from the thank-you page.
 */
export async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const donationId = session.metadata?.donationId;
  if (!donationId) return;
  const pi = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const method = methodFromStripe(pi?.payment_method as Stripe.PaymentMethod | null);
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : pi?.id ?? null;

  if (session.payment_status === "paid") {
    await markDonationPaid(donationId, { method, paymentIntentId: piId });
  } else if (session.status === "complete" && session.payment_status === "unpaid") {
    // Bank (ACH) payments take a few business days to clear.
    const db = await getDb();
    await db
      .update(donations)
      .set({ status: "processing", method: method ?? "us_bank_account", stripePaymentIntentId: piId })
      .where(and(eq(donations.id, donationId), eq(donations.status, "pending")));
  } else if (session.status === "expired") {
    const db = await getDb();
    await db
      .update(donations)
      .set({ status: "cancelled" })
      .where(and(eq(donations.id, donationId), eq(donations.status, "pending")));
  }
}

export async function markDonationFailed(donationId: string) {
  const db = await getDb();
  await db
    .update(donations)
    .set({ status: "failed" })
    .where(and(eq(donations.id, donationId), inArray(donations.status, ["pending", "processing"])));
}

/** Marks paid (once), updates the linked pledge, and emails the receipt. */
export async function markDonationPaid(
  donationId: string,
  info: { method?: DonationMethod | null; paymentIntentId?: string | null } = {},
) {
  const db = await getDb();
  const updated = await db
    .update(donations)
    .set({
      status: "paid",
      paidAt: new Date(),
      ...(info.method ? { method: info.method } : {}),
      ...(info.paymentIntentId ? { stripePaymentIntentId: info.paymentIntentId } : {}),
    })
    .where(and(eq(donations.id, donationId), inArray(donations.status, ["pending", "processing"])))
    .returning();
  const donation = updated[0];
  if (!donation) return null; // already handled

  if (donation.pledgeId) await refreshPledgeStatus(donation.pledgeId);
  await sendReceipt(donation.id);
  return donation;
}

export async function refreshPledgeStatus(pledgeId: string) {
  const db = await getDb();
  const [pledge] = await db.select().from(pledges).where(eq(pledges.id, pledgeId));
  if (!pledge || pledge.status === "cancelled") return;
  const paid = await pledgePaidCents(pledgeId);
  const status = paid >= pledge.amountCents ? "fulfilled" : "open";
  if (status !== pledge.status) {
    await db.update(pledges).set({ status }).where(eq(pledges.id, pledgeId));
  }
}

export async function pledgePaidCents(pledgeId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amountCents}), 0)` })
    .from(donations)
    .where(and(eq(donations.pledgeId, pledgeId), eq(donations.status, "paid")));
  return Number(row?.total ?? 0);
}

export async function sendReceipt(donationId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ d: donations, eventTitle: events.title, tierName: sevaTiers.name })
    .from(donations)
    .leftJoin(events, eq(donations.eventId, events.id))
    .leftJoin(sevaTiers, eq(donations.tierId, sevaTiers.id))
    .where(eq(donations.id, donationId));
  if (!row || !row.d.donorEmail) return false;
  const d = row.d;
  const cfg = getConfig();
  const email = receiptEmail({
    donorName: d.donorName,
    eventTitle: row.eventTitle,
    tierName: row.tierName,
    amountCents: d.amountCents,
    feeCoveredCents: d.feeCoveredCents,
    totalCents: d.totalCents,
    method: d.method,
    date: formatDateTime(d.paidAt ?? d.createdAt, cfg.timezone),
    receiptId: d.id,
    dedication: d.dedication,
  });
  const res = await sendEmail({ to: row.d.donorEmail, ...email });
  if (res.ok) await db.update(donations).set({ receiptSentAt: new Date() }).where(eq(donations.id, d.id));
  return res.ok;
}

/** Sum of paid gifts for an event (online + manually recorded). */
export async function eventRaisedCents(eventId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${donations.amountCents}), 0)` })
    .from(donations)
    .where(and(eq(donations.eventId, eventId), eq(donations.status, "paid")));
  return Number(row?.total ?? 0);
}

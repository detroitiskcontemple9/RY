"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getConfig } from "@/lib/config";
import { feeToCover, parseDollarsToCents } from "@/lib/money";
import { checkoutUrlFor } from "@/lib/checkout";
import { randomToken } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { pledgeConfirmationEmail } from "@/lib/email-templates";
import { addDays, todayIn } from "@/lib/dates";
import { pledgePaidCents } from "@/lib/donations";

export type FormState = { error?: string } | undefined;

const MIN_CENTS = 100;
const MAX_CENTS = 100_000_00;

const giftSchema = z.object({
  slug: z.string().min(1),
  mode: z.enum(["donate", "pledge"]),
  tierId: z.string().optional(),
  amount: z.string().optional(),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().max(30).optional(),
  dedication: z.string().trim().max(200).optional(),
  anonymous: z.string().optional(),
  coverFees: z.string().optional(),
  dueDate: z.string().optional(),
  website: z.string().optional(), // honeypot
});

export async function submitGift(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = giftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const f = parsed.data;
  if (f.website) return { error: "Something went wrong. Please try again." };

  const db = await getDb();
  const cfg = getConfig();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.slug, f.slug));
  if (!event || event.status !== "published") return { error: "This campaign is not accepting donations right now." };

  // Amount: a seva tier's fixed amount wins over a typed amount.
  let tier: typeof schema.sevaTiers.$inferSelect | undefined;
  let amountCents: number;
  if (f.tierId) {
    [tier] = await db
      .select()
      .from(schema.sevaTiers)
      .where(and(eq(schema.sevaTiers.id, f.tierId), eq(schema.sevaTiers.eventId, event.id)));
    if (!tier) return { error: "That seva option is no longer available." };
    if (tier.quantityLimit != null) {
      const [{ n }] = await db
        .select({ n: sql<string>`count(*)` })
        .from(schema.donations)
        .where(and(eq(schema.donations.tierId, tier.id), inArray(schema.donations.status, ["paid", "processing"])));
      const [{ p }] = await db
        .select({ p: sql<string>`count(*)` })
        .from(schema.pledges)
        .where(and(eq(schema.pledges.tierId, tier.id), eq(schema.pledges.status, "open")));
      if (Number(n) + Number(p) >= tier.quantityLimit) return { error: `${tier.name} is fully sponsored. Thank you!` };
    }
    amountCents = tier.amountCents;
  } else {
    amountCents = parseDollarsToCents(f.amount ?? "");
  }
  if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS) return { error: "Please choose an amount of at least $1." };
  if (amountCents > MAX_CENTS) return { error: "For gifts over $100,000 please contact the temple office." };

  if (f.mode === "pledge") {
    if (!event.allowPledges) return { error: "Pledges are not enabled for this campaign." };
    const today = todayIn(cfg.timezone);
    const due = f.dueDate ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < today) return { error: "Please choose a due date from today onward." };
    if (due > addDays(today, 366)) return { error: "Please choose a due date within the next year." };

    const token = randomToken(18);
    const [pledge] = await db
      .insert(schema.pledges)
      .values({
        eventId: event.id,
        tierId: tier?.id,
        donorName: f.name,
        donorEmail: f.email,
        donorPhone: f.phone || null,
        amountCents,
        dueDate: due,
        token,
      })
      .returning();
    await sendEmail({
      to: pledge.donorEmail,
      ...pledgeConfirmationEmail({
        donorName: pledge.donorName,
        eventTitle: event.title,
        amountCents,
        dueDate: due,
        payUrl: `${cfg.appUrl}/pledge/${token}`,
      }),
    });
    redirect(`/pledge/${token}?new=1`);
  }

  const feeCoveredCents = f.coverFees ? feeToCover(amountCents, cfg.feePercent, cfg.feeFixedCents) : 0;
  const [donation] = await db
    .insert(schema.donations)
    .values({
      eventId: event.id,
      tierId: tier?.id,
      donorName: f.name,
      donorEmail: f.email,
      donorPhone: f.phone || null,
      amountCents,
      feeCoveredCents,
      totalCents: amountCents + feeCoveredCents,
      dedication: f.dedication || null,
      isAnonymous: Boolean(f.anonymous),
    })
    .returning();

  let url: string;
  try {
    url = await checkoutUrlFor(donation, {
      title: tier ? `${tier.name} — ${event.title}` : `Donation — ${event.title}`,
      description: `Thank you for supporting ${cfg.orgName}`,
      cancelPath: `/${event.slug}`,
    });
  } catch (e) {
    console.error("checkout error", e);
    return { error: "We couldn't start the payment. Please try again in a moment." };
  }
  redirect(url);
}

const payPledgeSchema = z.object({
  token: z.string().min(10),
  amount: z.string(),
  coverFees: z.string().optional(),
});

export async function payPledge(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = payPledgeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the amount." };
  const f = parsed.data;
  const db = await getDb();
  const cfg = getConfig();
  const [row] = await db
    .select({ p: schema.pledges, event: schema.events })
    .from(schema.pledges)
    .leftJoin(schema.events, eq(schema.pledges.eventId, schema.events.id))
    .where(eq(schema.pledges.token, f.token));
  if (!row || row.p.status !== "open") return { error: "This pledge is not open for payment." };

  const balance = row.p.amountCents - (await pledgePaidCents(row.p.id));
  const amountCents = parseDollarsToCents(f.amount);
  if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS) return { error: "Please enter at least $1." };
  if (amountCents > balance) return { error: "That's more than your remaining balance." };

  const feeCoveredCents = f.coverFees ? feeToCover(amountCents, cfg.feePercent, cfg.feeFixedCents) : 0;
  const [donation] = await db
    .insert(schema.donations)
    .values({
      eventId: row.p.eventId,
      tierId: row.p.tierId,
      pledgeId: row.p.id,
      donorName: row.p.donorName,
      donorEmail: row.p.donorEmail,
      donorPhone: row.p.donorPhone,
      amountCents,
      feeCoveredCents,
      totalCents: amountCents + feeCoveredCents,
    })
    .returning();

  let url: string;
  try {
    url = await checkoutUrlFor(donation, {
      title: `Pledge payment — ${row.event?.title ?? cfg.orgName}`,
      cancelPath: `/pledge/${f.token}`,
    });
  } catch (e) {
    console.error("checkout error", e);
    return { error: "We couldn't start the payment. Please try again in a moment." };
  }
  redirect(url);
}

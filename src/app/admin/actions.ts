"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { DONATION_METHODS } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parseDollarsToCents } from "@/lib/money";
import { refreshPledgeStatus, sendReceipt } from "@/lib/donations";
import { sendPledgeReminder } from "@/lib/reminders";

export type ActionState = { error?: string; ok?: string } | undefined;

const RESERVED_SLUGS = new Set(["admin", "api", "pledge", "thank-you", "dev", "_next", "favicon.ico", "robots.txt"]);

const eventSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Link name may use lowercase letters, numbers and dashes")
    .max(60),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(10_000).optional(),
  imageUrl: z.union([z.literal(""), z.string().trim().url("Image must be a full https:// link")]).optional(),
  goal: z.string().optional(),
  eventDate: z.string().optional(),
  presetAmounts: z.string().optional(),
  allowPledges: z.string().optional(),
  status: z.enum(["draft", "published", "closed"]),
});

export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const f = parsed.data;
  if (RESERVED_SLUGS.has(f.slug)) return { error: "That link name is reserved. Please choose another." };

  const goalCents = f.goal ? parseDollarsToCents(f.goal) : null;
  if (goalCents !== null && !Number.isFinite(goalCents)) return { error: "Goal must be a dollar amount." };
  const presets = (f.presetAmounts ?? "")
    .split(/[,\s]+/)
    .map((s) => parseInt(s.replace(/\$/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 6);
  if (!presets.length) return { error: "Add at least one suggested amount, e.g. 51, 101, 251." };

  const db = await getDb();
  const clash = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(f.id ? and(eq(schema.events.slug, f.slug), ne(schema.events.id, f.id)) : eq(schema.events.slug, f.slug));
  if (clash.length) return { error: "Another event already uses that link name." };

  const values = {
    title: f.title,
    slug: f.slug,
    tagline: f.tagline || null,
    description: f.description || null,
    imageUrl: f.imageUrl || null,
    goalCents,
    eventDate: f.eventDate || null,
    presetAmounts: presets,
    allowPledges: Boolean(f.allowPledges),
    status: f.status,
    updatedAt: new Date(),
  };

  let id = f.id;
  if (id) {
    await db.update(schema.events).set(values).where(eq(schema.events.id, id));
  } else {
    const [row] = await db.insert(schema.events).values(values).returning({ id: schema.events.id });
    id = row.id;
  }
  revalidatePath("/", "layout");
  if (!f.id) redirect(`/admin/events/${id}?created=1`);
  return { ok: "Saved" };
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = await getDb();
  const used = await db.select({ id: schema.donations.id }).from(schema.donations).where(eq(schema.donations.eventId, id)).limit(1);
  if (used.length) {
    // Keep history: events with donations are closed, not deleted.
    await db.update(schema.events).set({ status: "closed" }).where(eq(schema.events.id, id));
  } else {
    await db.delete(schema.events).where(eq(schema.events.id, id));
  }
  redirect("/admin/events");
}

const tierSchema = z.object({
  eventId: z.string(),
  tierId: z.string().optional(),
  name: z.string().trim().min(1, "Seva name is required").max(80),
  description: z.string().trim().max(200).optional(),
  amount: z.string(),
  quantityLimit: z.string().optional(),
  sortOrder: z.string().optional(),
});

export async function saveTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = tierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const f = parsed.data;
  const amountCents = parseDollarsToCents(f.amount);
  if (!Number.isFinite(amountCents) || amountCents < 100) return { error: "Amount must be at least $1." };
  const qty = f.quantityLimit ? parseInt(f.quantityLimit, 10) : null;
  const values = {
    eventId: f.eventId,
    name: f.name,
    description: f.description || null,
    amountCents,
    quantityLimit: qty && qty > 0 ? qty : null,
    sortOrder: f.sortOrder ? parseInt(f.sortOrder, 10) || 0 : 0,
  };
  const db = await getDb();
  if (f.tierId) await db.update(schema.sevaTiers).set(values).where(eq(schema.sevaTiers.id, f.tierId));
  else await db.insert(schema.sevaTiers).values(values);
  revalidatePath(`/admin/events/${f.eventId}`);
  return { ok: f.tierId ? "Seva updated" : "Seva added" };
}

export async function deleteTier(formData: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.sevaTiers).where(eq(schema.sevaTiers.id, String(formData.get("tierId"))));
  revalidatePath(`/admin/events/${formData.get("eventId")}`);
}

const manualSchema = z.object({
  eventId: z.string().optional(),
  pledgeId: z.string().optional(),
  donorName: z.string().trim().min(1, "Donor name is required").max(120),
  donorEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email()]).optional(),
  donorPhone: z.string().trim().max(30).optional(),
  amount: z.string(),
  method: z.enum(DONATION_METHODS),
  note: z.string().trim().max(500).optional(),
  sendReceipt: z.string().optional(),
});

/** Records a cash / check / Zelle gift so reports include every donation. */
export async function recordManualDonation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const f = parsed.data;
  const amountCents = parseDollarsToCents(f.amount);
  if (!Number.isFinite(amountCents) || amountCents < 1) return { error: "Enter a valid amount." };

  const db = await getDb();
  let eventId = f.eventId || null;
  if (f.pledgeId) {
    const [p] = await db.select().from(schema.pledges).where(eq(schema.pledges.id, f.pledgeId));
    if (!p) return { error: "Pledge not found." };
    eventId = p.eventId;
  }
  const [d] = await db
    .insert(schema.donations)
    .values({
      eventId,
      pledgeId: f.pledgeId || null,
      donorName: f.donorName,
      donorEmail: f.donorEmail || null,
      donorPhone: f.donorPhone || null,
      amountCents,
      totalCents: amountCents,
      method: f.method,
      source: "manual",
      status: "paid",
      paidAt: new Date(),
      note: f.note || null,
      recordedBy: admin,
    })
    .returning();
  if (d.pledgeId) await refreshPledgeStatus(d.pledgeId);
  if (f.sendReceipt && d.donorEmail) await sendReceipt(d.id);
  revalidatePath("/admin", "layout");
  redirect(f.pledgeId ? "/admin/pledges?recorded=1" : "/admin/donations?recorded=1");
}

export async function resendReceipt(formData: FormData) {
  await requireAdmin();
  await sendReceipt(String(formData.get("id")));
  revalidatePath("/admin/donations");
}

export async function remindPledge(formData: FormData) {
  await requireAdmin();
  const db = await getDb();
  const [p] = await db.select().from(schema.pledges).where(eq(schema.pledges.id, String(formData.get("id"))));
  if (p && p.status === "open") await sendPledgeReminder(p, "manual");
  revalidatePath("/admin/pledges");
}

export async function setPledgeStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const db = await getDb();
  if (status === "cancelled") {
    await db.update(schema.pledges).set({ status: "cancelled" }).where(eq(schema.pledges.id, id));
  } else if (status === "open") {
    await db.update(schema.pledges).set({ status: "open" }).where(eq(schema.pledges.id, id));
    await refreshPledgeStatus(id);
  }
  revalidatePath("/admin/pledges");
}

export async function addAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email." };
  const name = String(formData.get("name") ?? "").trim() || null;
  const db = await getDb();
  await db.insert(schema.admins).values({ email: email.data, name }).onConflictDoNothing();
  revalidatePath("/admin/settings");
  return { ok: `${email.data} can now sign in.` };
}

export async function removeAdmin(formData: FormData) {
  const me = await requireAdmin();
  const email = String(formData.get("email"));
  if (email === me) return; // don't lock yourself out
  const db = await getDb();
  await db.delete(schema.admins).where(eq(schema.admins.email, email));
  revalidatePath("/admin/settings");
}

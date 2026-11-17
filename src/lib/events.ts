import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { events, sevaTiers, donations, pledges } = schema;

export async function listPublicEvents() {
  const db = await getDb();
  const rows = await db
    .select({
      event: events,
      raised: sql<string>`coalesce((select sum(${donations.amountCents}) from ${donations} where ${donations.eventId} = ${events.id} and ${donations.status} = 'paid'), 0)`,
    })
    .from(events)
    .where(ne(events.status, "draft"))
    .orderBy(asc(sql`case when ${events.status} = 'published' then 0 else 1 end`), desc(events.eventDate));
  return rows.map((r) => ({ ...r.event, raisedCents: Number(r.raised) }));
}

export async function getEventPage(slug: string) {
  const db = await getDb();
  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) return null;

  const tiers = await db
    .select()
    .from(sevaTiers)
    .where(eq(sevaTiers.eventId, event.id))
    .orderBy(asc(sevaTiers.sortOrder), desc(sevaTiers.amountCents));

  const [stats] = await db
    .select({
      raised: sql<string>`coalesce(sum(${donations.amountCents}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(donations)
    .where(and(eq(donations.eventId, event.id), eq(donations.status, "paid")));

  // How many of each limited tier are taken (paid, clearing, or pledged).
  const tierIds = tiers.filter((t) => t.quantityLimit != null).map((t) => t.id);
  const taken = new Map<string, number>();
  if (tierIds.length) {
    const d = await db
      .select({ tierId: donations.tierId, n: sql<string>`count(*)` })
      .from(donations)
      .where(and(inArray(donations.tierId, tierIds), inArray(donations.status, ["paid", "processing"])))
      .groupBy(donations.tierId);
    const p = await db
      .select({ tierId: pledges.tierId, n: sql<string>`count(*)` })
      .from(pledges)
      .where(and(inArray(pledges.tierId, tierIds), eq(pledges.status, "open")))
      .groupBy(pledges.tierId);
    for (const r of [...d, ...p]) if (r.tierId) taken.set(r.tierId, (taken.get(r.tierId) ?? 0) + Number(r.n));
  }

  return {
    event,
    tiers: tiers.map((t) => ({
      ...t,
      remaining: t.quantityLimit == null ? null : Math.max(0, t.quantityLimit - (taken.get(t.id) ?? 0)),
    })),
    raisedCents: Number(stats?.raised ?? 0),
    donorCount: Number(stats?.count ?? 0),
  };
}

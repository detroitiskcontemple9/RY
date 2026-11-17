import type { DB } from "./index";
import { events, sevaTiers } from "./schema";

/** Adds a sample Gaura Purnima event if the database has no events yet. */
export async function seedSampleData(db: DB) {
  const existing = await db.select({ id: events.id }).from(events).limit(1);
  if (existing.length) return false;

  const [ev] = await db
    .insert(events)
    .values({
      slug: "gaura-purnima",
      title: "Gaura Purnima 2027",
      tagline: "Celebrate the appearance of Sri Chaitanya Mahaprabhu",
      description:
        "Join us for the most auspicious appearance day of Sri Chaitanya Mahaprabhu, the golden avatar who inaugurated the sankirtan movement.\n\nYour seva supports the abhishek, festival feast for the whole community, flower decorations, and kirtan through the evening. Every contribution, large or small, is an offering to Their Lordships.",
      goalCents: 15_000_00,
      eventDate: "2027-03-22",
      presetAmounts: [51, 108, 251, 501, 1008],
      allowPledges: true,
      status: "published",
    })
    .returning();

  await db.insert(sevaTiers).values([
    { eventId: ev.id, name: "Abhishek Seva", description: "Sponsor the bathing ceremony of Sri Sri Gaura Nitai", amountCents: 1008_00, sortOrder: 1 },
    { eventId: ev.id, name: "Feast Sponsor", description: "Sponsor prasadam for the whole community", amountCents: 501_00, quantityLimit: 10, sortOrder: 2 },
    { eventId: ev.id, name: "Flower Decoration", description: "Garlands and altar flowers for the festival", amountCents: 251_00, sortOrder: 3 },
  ]);
  return true;
}

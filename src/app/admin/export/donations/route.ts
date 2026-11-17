import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionEmail } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { methodLabel } from "@/lib/labels";

const { donations, events, sevaTiers } = schema;

export async function GET(req: Request) {
  if (!(await getSessionEmail())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const filters: SQL[] = [];
  const eventId = sp.get("event");
  const status = sp.get("status") ?? "paid";
  if (eventId) filters.push(eq(donations.eventId, eventId));
  if (status !== "all") filters.push(eq(donations.status, status as "paid"));

  const db = await getDb();
  const rows = await db
    .select({ d: donations, eventTitle: events.title, tierName: sevaTiers.name })
    .from(donations)
    .leftJoin(events, eq(donations.eventId, events.id))
    .leftJoin(sevaTiers, eq(donations.tierId, sevaTiers.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(donations.createdAt));

  const csv = toCsv([
    ["Date", "Receipt #", "Donor", "Email", "Phone", "Event", "Seva", "Gift", "Fees covered", "Total charged", "Method", "Source", "Status", "Pledge payment", "Dedication", "Note", "Recorded by", "Stripe payment"],
    ...rows.map(({ d, eventTitle, tierName }) => [
      (d.paidAt ?? d.createdAt).toISOString(),
      d.id.slice(0, 8).toUpperCase(),
      d.donorName,
      d.donorEmail,
      d.donorPhone,
      eventTitle,
      tierName,
      (d.amountCents / 100).toFixed(2),
      (d.feeCoveredCents / 100).toFixed(2),
      (d.totalCents / 100).toFixed(2),
      methodLabel(d.method),
      d.source,
      d.status,
      d.pledgeId ? "yes" : "",
      d.dedication,
      d.note,
      d.recordedBy,
      d.stripePaymentIntentId,
    ]),
  ]);
  return csvResponse(`donations-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

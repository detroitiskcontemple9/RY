import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionEmail } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

const { pledges, events, donations } = schema;

export async function GET(req: Request) {
  if (!(await getSessionEmail())) return new Response("Unauthorized", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const filters: SQL[] = [];
  const eventId = sp.get("event");
  const status = sp.get("status") ?? "all";
  if (eventId) filters.push(eq(pledges.eventId, eventId));
  if (status !== "all") filters.push(eq(pledges.status, status as "open"));

  const db = await getDb();
  const rows = await db
    .select({
      p: pledges,
      eventTitle: events.title,
      paid: sql<string>`coalesce((select sum(${donations.amountCents}) from ${donations} where ${donations.pledgeId} = ${pledges.id} and ${donations.status} = 'paid'), 0)`,
    })
    .from(pledges)
    .leftJoin(events, eq(pledges.eventId, events.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(pledges.createdAt));

  const csv = toCsv([
    ["Created", "Donor", "Email", "Phone", "Event", "Pledged", "Paid", "Remaining", "Due date", "Status"],
    ...rows.map(({ p, eventTitle, paid }) => [
      p.createdAt.toISOString(),
      p.donorName,
      p.donorEmail,
      p.donorPhone,
      eventTitle,
      (p.amountCents / 100).toFixed(2),
      (Number(paid) / 100).toFixed(2),
      (Math.max(0, p.amountCents - Number(paid)) / 100).toFixed(2),
      p.dueDate,
      p.status,
    ]),
  ]);
  return csvResponse(`pledges-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

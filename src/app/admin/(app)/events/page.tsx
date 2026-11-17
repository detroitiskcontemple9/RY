import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/admin";

export default async function EventsPage() {
  const db = await getDb();
  const rows = await db
    .select({
      e: schema.events,
      raised: sql<string>`coalesce(sum(${schema.donations.amountCents}) filter (where ${schema.donations.status} = 'paid'), 0)`,
    })
    .from(schema.events)
    .leftJoin(schema.donations, eq(schema.donations.eventId, schema.events.id))
    .groupBy(schema.events.id)
    .orderBy(desc(schema.events.createdAt));

  return (
    <>
      <PageHeader title="Events">
        <ButtonLink href="/admin/events/new">New event</ButtonLink>
      </PageHeader>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted border-b border-line">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Raised</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No events yet. Create your first festival page.
                </td>
              </tr>
            )}
            {rows.map(({ e, raised }) => (
              <tr key={e.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${e.id}`} className="font-medium hover:text-saffron-700">{e.title}</Link>
                  <p className="text-xs text-muted">/{e.slug}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{e.eventDate ? formatDate(e.eventDate) : "—"}</td>
                <td className="px-4 py-3"><Badge status={e.status} /></td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatUSD(Number(raised))}
                  {e.goalCents ? <span className="block text-xs font-normal text-muted">of {formatUSD(e.goalCents)}</span> : null}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/admin/events/${e.id}`} className="text-saffron-700">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

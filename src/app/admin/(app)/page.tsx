import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatUSD } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { getConfig } from "@/lib/config";
import { methodLabel } from "@/lib/labels";
import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/admin";

const { donations, events, pledges } = schema;

export default async function Dashboard() {
  const db = await getDb();
  const cfg = getConfig();

  const [totals] = await db
    .select({
      raised: sql<string>`coalesce(sum(${donations.amountCents}) filter (where ${donations.status} = 'paid'), 0)`,
      fees: sql<string>`coalesce(sum(${donations.feeCoveredCents}) filter (where ${donations.status} = 'paid'), 0)`,
      count: sql<string>`count(*) filter (where ${donations.status} = 'paid')`,
      clearing: sql<string>`coalesce(sum(${donations.amountCents}) filter (where ${donations.status} = 'processing'), 0)`,
    })
    .from(donations);

  const [pledgeTotals] = await db
    .select({ count: sql<string>`count(*)`, amount: sql<string>`coalesce(sum(${pledges.amountCents}), 0)` })
    .from(pledges)
    .where(eq(pledges.status, "open"));

  const byEvent = await db
    .select({
      id: events.id,
      title: events.title,
      status: events.status,
      goal: events.goalCents,
      raised: sql<string>`coalesce(sum(${donations.amountCents}) filter (where ${donations.status} = 'paid'), 0)`,
      count: sql<string>`count(${donations.id}) filter (where ${donations.status} = 'paid')`,
    })
    .from(events)
    .leftJoin(donations, eq(donations.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));

  const recent = await db
    .select({ d: donations, eventTitle: events.title })
    .from(donations)
    .leftJoin(events, eq(donations.eventId, events.id))
    .where(and(sql`${donations.status} in ('paid','processing')`))
    .orderBy(desc(donations.createdAt))
    .limit(8);

  return (
    <>
      <PageHeader title="Dashboard">
        <ButtonLink href="/admin/donations/new" variant="secondary">Record cash / Zelle</ButtonLink>
        <ButtonLink href="/admin/events/new">New event</ButtonLink>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total raised" value={formatUSD(Number(totals.raised))} sub={`${totals.count} gifts`} />
        <StatCard label="Fees covered by donors" value={formatUSD(Number(totals.fees))} />
        <StatCard label="Bank payments clearing" value={formatUSD(Number(totals.clearing))} />
        <StatCard label="Open pledges" value={formatUSD(Number(pledgeTotals.amount))} sub={`${pledgeTotals.count} pledges`} />
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="px-4 pt-4 font-semibold">By event</h2>
          <ul className="divide-y divide-line mt-2">
            {byEvent.length === 0 && <li className="px-4 py-6 text-sm text-muted">No events yet.</li>}
            {byEvent.map((e) => {
              const pct = e.goal ? Math.min(100, Math.round((Number(e.raised) / e.goal) * 100)) : null;
              return (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <Link href={`/admin/events/${e.id}`} className="font-medium hover:text-saffron-700">{e.title}</Link>
                    <span className="font-semibold">{formatUSD(Number(e.raised))}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge status={e.status} />
                    <span className="text-xs text-muted">{e.count} gifts{e.goal ? ` · goal ${formatUSD(e.goal)}` : ""}</span>
                  </div>
                  {pct != null && (
                    <div className="mt-2 h-1.5 rounded-full bg-saffron-100 overflow-hidden">
                      <div className="h-full bg-saffron-600" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <div className="px-4 pt-4 flex justify-between">
            <h2 className="font-semibold">Recent gifts</h2>
            <Link href="/admin/donations" className="text-sm text-saffron-700">View all</Link>
          </div>
          <ul className="divide-y divide-line mt-2">
            {recent.length === 0 && <li className="px-4 py-6 text-sm text-muted">No gifts yet.</li>}
            {recent.map(({ d, eventTitle }) => (
              <li key={d.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{d.donorName}</p>
                  <p className="text-xs text-muted truncate">
                    {eventTitle ?? "General"} · {methodLabel(d.method)} · {formatDateTime(d.paidAt ?? d.createdAt, cfg.timezone)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatUSD(d.amountCents)}</p>
                  {d.status !== "paid" && <Badge status={d.status} />}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatUSD } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { getConfig } from "@/lib/config";
import { methodLabel } from "@/lib/labels";
import { Badge, ButtonLink, Card, PageHeader, btnSecondaryCls, inputCls } from "@/components/admin";
import { resendReceipt } from "../../actions";

const { donations, events, sevaTiers } = schema;
const STATUSES = ["paid", "processing", "pending", "failed", "refunded", "cancelled"] as const;

export default async function DonationsPage({ searchParams }: PageProps<"/admin/donations">) {
  const sp = await searchParams;
  const eventId = typeof sp.event === "string" ? sp.event : "";
  const status = typeof sp.status === "string" ? sp.status : "paid";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const db = await getDb();
  const cfg = getConfig();

  const filters: SQL[] = [];
  if (eventId) filters.push(eq(donations.eventId, eventId));
  if (status !== "all" && (STATUSES as readonly string[]).includes(status)) filters.push(eq(donations.status, status as (typeof STATUSES)[number]));
  if (q) filters.push(or(ilike(donations.donorName, `%${q}%`), ilike(donations.donorEmail, `%${q}%`))!);
  const where = filters.length ? and(...filters) : undefined;

  const [rows, eventList, [sum]] = await Promise.all([
    db
      .select({ d: donations, eventTitle: events.title, tierName: sevaTiers.name })
      .from(donations)
      .leftJoin(events, eq(donations.eventId, events.id))
      .leftJoin(sevaTiers, eq(donations.tierId, sevaTiers.id))
      .where(where)
      .orderBy(desc(donations.createdAt))
      .limit(500),
    db.select({ id: events.id, title: events.title }).from(events).orderBy(desc(events.createdAt)),
    db
      .select({ total: sql<string>`coalesce(sum(${donations.amountCents}), 0)`, n: sql<string>`count(*)` })
      .from(donations)
      .where(where),
  ]);

  const exportQs = new URLSearchParams({ ...(eventId && { event: eventId }), status }).toString();

  return (
    <>
      <PageHeader title="Donations">
        <a href={`/admin/export/donations?${exportQs}`} className={btnSecondaryCls}>Export CSV</a>
        <ButtonLink href="/admin/donations/new">Record cash / check / Zelle</ButtonLink>
      </PageHeader>
      {sp.recorded && (
        <p className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">Donation recorded.</p>
      )}

      <form className="grid gap-2 sm:grid-cols-[1fr_180px_160px_auto] mb-4">
        <input name="q" defaultValue={q} placeholder="Search name or email" className={inputCls} />
        <select name="event" defaultValue={eventId} className={inputCls}>
          <option value="">All events</option>
          {eventList.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={inputCls}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className={btnSecondaryCls}>Filter</button>
      </form>

      <p className="text-sm text-muted mb-2">
        {sum.n} donations · <b className="text-ink">{formatUSD(Number(sum.total))}</b>
      </p>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted border-b border-line">
            <tr>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Donor</th>
              <th className="px-3 py-3">Event / seva</th>
              <th className="px-3 py-3">Method</th>
              <th className="px-3 py-3 text-right">Gift</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No donations match.</td></tr>
            )}
            {rows.map(({ d, eventTitle, tierName }) => (
              <tr key={d.id} className="align-top">
                <td className="px-3 py-2.5 whitespace-nowrap text-muted">{formatDateTime(d.paidAt ?? d.createdAt, cfg.timezone)}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium">{d.donorName}{d.isAnonymous && <span className="text-xs text-muted"> (private)</span>}</p>
                  <p className="text-xs text-muted">{d.donorEmail}{d.donorPhone ? ` · ${d.donorPhone}` : ""}</p>
                  {d.dedication && <p className="text-xs italic text-muted">“{d.dedication}”</p>}
                  {d.note && <p className="text-xs text-muted">Note: {d.note}</p>}
                </td>
                <td className="px-3 py-2.5">
                  {eventTitle ?? "General"}
                  {tierName && <p className="text-xs text-muted">{tierName}</p>}
                  {d.pledgeId && <p className="text-xs text-saffron-700">Pledge payment</p>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {methodLabel(d.method)}
                  {d.source === "manual" && <p className="text-xs text-muted">by {d.recordedBy}</p>}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <b>{formatUSD(d.amountCents, { cents: d.amountCents % 100 !== 0 })}</b>
                  {d.feeCoveredCents > 0 && <p className="text-xs text-muted">+{formatUSD(d.feeCoveredCents, { cents: true })} fees</p>}
                </td>
                <td className="px-3 py-2.5"><Badge status={d.status} /></td>
                <td className="px-3 py-2.5 text-right">
                  {d.status === "paid" && d.donorEmail && (
                    <form action={resendReceipt}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="text-xs text-saffron-700 hover:underline whitespace-nowrap">
                        {d.receiptSentAt ? "Resend receipt" : "Send receipt"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

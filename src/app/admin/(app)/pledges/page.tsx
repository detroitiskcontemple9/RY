import Link from "next/link";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatUSD } from "@/lib/money";
import { formatDate, formatDateTime, todayIn } from "@/lib/dates";
import { getConfig } from "@/lib/config";
import { Badge, Card, PageHeader, btnSecondaryCls, inputCls } from "@/components/admin";
import { remindPledge, setPledgeStatus } from "../../actions";

const { pledges, events, donations } = schema;

export default async function PledgesPage({ searchParams }: PageProps<"/admin/pledges">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const eventId = typeof sp.event === "string" ? sp.event : "";
  const db = await getDb();
  const cfg = getConfig();
  const today = todayIn(cfg.timezone);

  const filters: SQL[] = [];
  if (status !== "all") filters.push(eq(pledges.status, status as "open" | "fulfilled" | "cancelled"));
  if (eventId) filters.push(eq(pledges.eventId, eventId));

  const [rows, eventList] = await Promise.all([
    db
      .select({
        p: pledges,
        eventTitle: events.title,
        paid: sql<string>`coalesce((select sum(${donations.amountCents}) from ${donations} where ${donations.pledgeId} = ${pledges.id} and ${donations.status} = 'paid'), 0)`,
      })
      .from(pledges)
      .leftJoin(events, eq(pledges.eventId, events.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(status === "open" ? asc(pledges.dueDate) : desc(pledges.createdAt))
      .limit(500),
    db.select({ id: events.id, title: events.title }).from(events).orderBy(desc(events.createdAt)),
  ]);

  const totalPledged = rows.reduce((s, r) => s + r.p.amountCents, 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.paid), 0);
  const exportQs = new URLSearchParams({ ...(eventId && { event: eventId }), status }).toString();

  return (
    <>
      <PageHeader title="Pledges">
        <a href={`/admin/export/pledges?${exportQs}`} className={btnSecondaryCls}>Export CSV</a>
      </PageHeader>
      {sp.recorded && (
        <p className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">Payment recorded.</p>
      )}
      <form className="grid gap-2 sm:grid-cols-[220px_160px_auto] mb-4">
        <select name="event" defaultValue={eventId} className={inputCls}>
          <option value="">All events</option>
          {eventList.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={inputCls}>
          <option value="open">Open</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
        <button className={`${btnSecondaryCls} justify-self-start`}>Filter</button>
      </form>
      <p className="text-sm text-muted mb-2">
        {rows.length} pledges · pledged <b className="text-ink">{formatUSD(totalPledged)}</b> · paid{" "}
        <b className="text-ink">{formatUSD(totalPaid)}</b> · remaining <b className="text-ink">{formatUSD(Math.max(0, totalPledged - totalPaid))}</b>
      </p>
      <p className="text-xs text-muted mb-3">
        Automatic reminder emails go out 7 days before, on, and 7 days after each due date.
      </p>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted border-b border-line">
            <tr>
              <th className="px-3 py-3">Donor</th>
              <th className="px-3 py-3">Event</th>
              <th className="px-3 py-3 text-right">Pledged</th>
              <th className="px-3 py-3 text-right">Remaining</th>
              <th className="px-3 py-3">Due</th>
              <th className="px-3 py-3">Reminders</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No pledges.</td></tr>
            )}
            {rows.map(({ p, eventTitle, paid }) => {
              const remaining = Math.max(0, p.amountCents - Number(paid));
              const overdue = p.status === "open" && p.dueDate < today;
              const last = [p.reminderBeforeSentAt, p.reminderDueSentAt, p.reminderOverdueSentAt, p.lastManualReminderAt]
                .filter((d): d is Date => !!d)
                .sort((a, b) => b.getTime() - a.getTime())[0];
              const sentCount = [p.reminderBeforeSentAt, p.reminderDueSentAt, p.reminderOverdueSentAt].filter(Boolean).length;
              return (
                <tr key={p.id} className="align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{p.donorName}</p>
                    <p className="text-xs text-muted">{p.donorEmail}{p.donorPhone ? ` · ${p.donorPhone}` : ""}</p>
                  </td>
                  <td className="px-3 py-2.5">{eventTitle ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right">{formatUSD(p.amountCents)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{formatUSD(remaining)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatDate(p.dueDate)}
                    <div className="mt-0.5">
                      {overdue ? <Badge status="overdue" label="overdue" /> : <Badge status={p.status} />}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted">
                    {sentCount}/3 auto
                    {last && <p>last {formatDateTime(last, cfg.timezone)}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-end gap-1 text-xs">
                      {p.status === "open" && (
                        <>
                          <form action={remindPledge}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="text-saffron-700 hover:underline whitespace-nowrap">Send reminder</button>
                          </form>
                          <Link href={`/admin/donations/new?pledge=${p.id}`} className="text-saffron-700 hover:underline whitespace-nowrap">
                            Record cash / Zelle
                          </Link>
                          <a href={`/pledge/${p.token}`} target="_blank" className="text-muted hover:underline whitespace-nowrap">Pay link ↗</a>
                          <form action={setPledgeStatus}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="status" value="cancelled" />
                            <button className="text-red-700 hover:underline">Cancel</button>
                          </form>
                        </>
                      )}
                      {p.status === "cancelled" && (
                        <form action={setPledgeStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="open" />
                          <button className="text-saffron-700 hover:underline">Reopen</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

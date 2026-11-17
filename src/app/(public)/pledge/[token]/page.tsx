import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { pledgePaidCents } from "@/lib/donations";
import { formatDate } from "@/lib/dates";
import { formatUSD } from "@/lib/money";
import { getConfig } from "@/lib/config";
import { PayPledgeForm } from "./PayPledgeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your pledge", robots: { index: false } };

export default async function PledgePage({ params, searchParams }: PageProps<"/pledge/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const [row] = await db
    .select({ p: schema.pledges, event: schema.events, tier: schema.sevaTiers })
    .from(schema.pledges)
    .leftJoin(schema.events, eq(schema.pledges.eventId, schema.events.id))
    .leftJoin(schema.sevaTiers, eq(schema.pledges.tierId, schema.sevaTiers.id))
    .where(eq(schema.pledges.token, token));
  if (!row) notFound();
  const { p, event, tier } = row;
  const paid = await pledgePaidCents(p.id);
  const balance = Math.max(0, p.amountCents - paid);
  const cfg = getConfig();
  const pct = Math.min(100, Math.round((paid / p.amountCents) * 100));

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {sp.new && (
        <div className="mb-6 rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
          <p className="font-semibold text-green-900">🙏 Thank you! Your pledge is confirmed.</p>
          <p className="text-sm text-green-800 mt-1">We emailed this link to {p.donorEmail}. Pay now or any time before the due date.</p>
        </div>
      )}
      <div className="rounded-2xl bg-white border border-line p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-saffron-700">Pledge</p>
        <h1 className="font-serif text-2xl font-semibold text-maroon-900 mt-1">{event?.title ?? cfg.orgName}</h1>
        {tier && <p className="text-muted">{tier.name}</p>}
        <p className="mt-3">Hare Krishna {p.donorName},</p>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Pledged" value={formatUSD(p.amountCents)} />
          <Stat label="Paid" value={formatUSD(paid)} />
          <Stat label="Remaining" value={formatUSD(balance)} highlight />
        </dl>
        <div className="mt-3 h-2 rounded-full bg-saffron-100 overflow-hidden">
          <div className="h-full bg-saffron-600" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">Due by {formatDate(p.dueDate)}</p>

        <div className="mt-6">
          {p.status === "fulfilled" ? (
            <p className="rounded-xl bg-green-50 p-4 text-center text-green-900 font-medium">
              Your pledge is complete. Thank you for your seva! 🙏
            </p>
          ) : p.status === "cancelled" ? (
            <p className="rounded-xl bg-saffron-50 p-4 text-center">This pledge has been closed.</p>
          ) : (
            <PayPledgeForm
              token={token}
              balanceCents={balance}
              feePercent={cfg.feePercent}
              feeFixedCents={cfg.feeFixedCents}
              zelleRecipient={cfg.zelleRecipient}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-saffron-50" : "bg-cream"}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-semibold ${highlight ? "text-saffron-800" : ""}`}>{value}</dd>
    </div>
  );
}

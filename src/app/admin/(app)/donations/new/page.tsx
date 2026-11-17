import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { pledgePaidCents } from "@/lib/donations";
import { formatUSD } from "@/lib/money";
import { Card, PageHeader } from "@/components/admin";
import { ManualDonationForm } from "./ManualDonationForm";

export default async function NewManualDonation({ searchParams }: PageProps<"/admin/donations/new">) {
  const sp = await searchParams;
  const pledgeId = typeof sp.pledge === "string" ? sp.pledge : undefined;
  const db = await getDb();
  const eventList = await db.select({ id: schema.events.id, title: schema.events.title }).from(schema.events).orderBy(desc(schema.events.createdAt));

  let pledge: { id: string; label: string; donorName: string; donorEmail: string; donorPhone: string | null; balance: string } | undefined;
  if (pledgeId) {
    const [p] = await db.select().from(schema.pledges).where(eq(schema.pledges.id, pledgeId));
    if (p) {
      const balance = p.amountCents - (await pledgePaidCents(p.id));
      pledge = {
        id: p.id,
        label: `${p.donorName} — pledged ${formatUSD(p.amountCents)}, ${formatUSD(balance)} remaining`,
        donorName: p.donorName,
        donorEmail: p.donorEmail,
        donorPhone: p.donorPhone,
        balance: String(Math.max(0, balance) / 100),
      };
    }
  }

  return (
    <>
      <PageHeader title={pledge ? "Record pledge payment" : "Record a donation"} />
      <Card className="p-5 max-w-xl">
        <p className="text-sm text-muted mb-4">
          For cash, checks, and Zelle received outside the app — so totals and receipts stay complete.
        </p>
        <ManualDonationForm events={eventList} pledge={pledge} />
      </Card>
    </>
  );
}

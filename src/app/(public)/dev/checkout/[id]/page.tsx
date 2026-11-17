import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fakePaymentsEnabled } from "@/lib/stripe";
import { markDonationPaid } from "@/lib/donations";
import { formatUSD } from "@/lib/money";

export const dynamic = "force-dynamic";

// Local development only: stands in for Stripe Checkout when no Stripe key is set.
export default async function FakeCheckout({ params }: PageProps<"/dev/checkout/[id]">) {
  if (!fakePaymentsEnabled()) notFound();
  const { id } = await params;
  const db = await getDb();
  const [d] = await db.select().from(schema.donations).where(eq(schema.donations.id, id));
  if (!d) notFound();

  async function pay(formData: FormData) {
    "use server";
    if (!fakePaymentsEnabled()) return;
    const method = String(formData.get("method") ?? "card") as "card" | "apple_pay" | "us_bank_account";
    await markDonationPaid(id, { method });
    redirect(`/thank-you?d=${id}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-saffron-400 bg-white p-6">
        <p className="text-xs font-bold uppercase text-saffron-700">Development mode — no real payment</p>
        <h1 className="mt-2 text-xl font-semibold">Simulated checkout</h1>
        <p className="mt-1 text-muted">Stripe isn&apos;t configured, so this page stands in for Stripe Checkout.</p>
        <p className="mt-4 text-3xl font-semibold">{formatUSD(d.totalCents, { cents: true })}</p>
        <form action={pay} className="mt-6 space-y-2">
          {(["apple_pay", "card", "us_bank_account"] as const).map((m) => (
            <button key={m} name="method" value={m} className="w-full rounded-xl bg-saffron-700 text-white py-3 font-semibold">
              Pay with {m === "apple_pay" ? "Apple Pay" : m === "card" ? "card" : "bank"}
            </button>
          ))}
        </form>
      </div>
    </div>
  );
}

import Link from "next/link";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, schema } from "@/db";
import { fakePaymentsEnabled, getStripe, stripeConfigured } from "@/lib/stripe";
import { syncCheckoutSession } from "@/lib/donations";
import { formatUSD } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thank you", robots: { index: false } };

export default async function ThankYou({ searchParams }: PageProps<"/thank-you">) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  // `d` is only used by the local fake checkout (no Stripe key in development).
  const donationIdParam = fakePaymentsEnabled() && typeof sp.d === "string" ? sp.d : null;
  const db = await getDb();

  // If the webhook hasn't arrived yet, confirm directly with Stripe.
  if (sessionId && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent.payment_method"],
      });
      await syncCheckoutSession(session as Stripe.Checkout.Session);
    } catch (e) {
      console.error("thank-you sync failed", e);
    }
  }

  const where = sessionId
    ? eq(schema.donations.stripeCheckoutSessionId, sessionId)
    : donationIdParam
      ? eq(schema.donations.id, donationIdParam)
      : null;
  const [row] = where
    ? await db
        .select({ d: schema.donations, event: schema.events })
        .from(schema.donations)
        .leftJoin(schema.events, eq(schema.donations.eventId, schema.events.id))
        .where(where)
    : [];

  const processing = row?.d.status === "processing";

  return (
    <div className="mx-auto max-w-lg px-4 py-14 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-saffron-100 flex items-center justify-center text-3xl">🙏</div>
      <h1 className="mt-5 font-serif text-3xl font-semibold text-maroon-900">Hare Krishna! Thank you.</h1>
      {row ? (
        <>
          <p className="mt-3 text-lg">
            Your offering of <b>{formatUSD(row.d.totalCents, { cents: row.d.totalCents % 100 !== 0 })}</b>
            {row.event ? <> for <b>{row.event.title}</b></> : null} {processing ? "is on its way." : "was received."}
          </p>
          <p className="mt-2 text-muted">
            {processing
              ? "Bank payments take 3–5 business days to clear. We'll email your tax receipt once it does."
              : row.d.donorEmail
                ? `Your tax receipt has been emailed to ${row.d.donorEmail}.`
                : null}
          </p>
        </>
      ) : (
        <p className="mt-3 text-muted">Your offering is being processed. You&apos;ll receive an email receipt shortly.</p>
      )}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {row?.event && (
          <Link href={`/${row.event.slug}`} className="rounded-xl border border-line bg-white px-5 py-3 font-semibold">
            Back to {row.event.title}
          </Link>
        )}
        <Link href="/" className="rounded-xl bg-saffron-700 text-white px-5 py-3 font-semibold">
          See all festivals
        </Link>
      </div>
    </div>
  );
}

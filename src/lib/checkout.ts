import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Donation } from "@/db/schema";
import { getConfig } from "./config";
import { fakePaymentsEnabled, getStripe } from "./stripe";

/** Creates a Stripe Checkout Session for a pending donation and returns its URL. */
export async function checkoutUrlFor(
  donation: Donation,
  opts: { title: string; description?: string; cancelPath: string },
): Promise<string> {
  const cfg = getConfig();
  if (fakePaymentsEnabled()) return `/dev/checkout/${donation.id}`;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    submit_type: "donate",
    // Payment methods (card, Apple Pay, Google Pay, bank/ACH) come from the
    // Stripe Dashboard settings, so they can be turned on/off without code.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: donation.totalCents,
          product_data: {
            name: opts.title,
            ...(opts.description ? { description: opts.description.slice(0, 500) } : {}),
          },
        },
      },
    ],
    customer_email: donation.donorEmail ?? undefined,
    metadata: { donationId: donation.id },
    payment_intent_data: {
      metadata: { donationId: donation.id },
      description: opts.title,
    },
    success_url: `${cfg.appUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cfg.appUrl}${opts.cancelPath}`,
  });

  const db = await getDb();
  await db
    .update(schema.donations)
    .set({ stripeCheckoutSessionId: session.id })
    .where(eq(schema.donations.id, donation.id));

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

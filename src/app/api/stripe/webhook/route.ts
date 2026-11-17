import type Stripe from "stripe";
import { getStripe, webCrypto } from "@/lib/stripe";
import { markDonationFailed, refreshPledgeStatus, syncCheckoutSession } from "@/lib/donations";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, webCrypto);
  } catch (e) {
    console.error("Webhook signature verification failed", e);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired": {
      // Re-fetch with the payment method so we can record card / Apple Pay / bank.
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
        expand: ["payment_intent.payment_method"],
      });
      await syncCheckoutSession(session);
      break;
    }
    case "checkout.session.async_payment_failed": {
      const id = event.data.object.metadata?.donationId;
      if (id) await markDonationFailed(id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      if (charge.refunded) {
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (piId) {
          const db = await getDb();
          const rows = await db
            .update(schema.donations)
            .set({ status: "refunded" })
            .where(eq(schema.donations.stripePaymentIntentId, piId))
            .returning();
          for (const d of rows) if (d.pledgeId) await refreshPledgeStatus(d.pledgeId);
        }
      }
      break;
    }
  }
  return Response.json({ received: true });
}

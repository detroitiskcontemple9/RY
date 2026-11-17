import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) {
    // Fetch-based client so it runs on Cloudflare Workers.
    client = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  }
  return client;
}

export const webCrypto = Stripe.createSubtleCryptoProvider();

/** Dev-only: simulate payments locally when no Stripe key is configured. */
export function fakePaymentsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !stripeConfigured();
}

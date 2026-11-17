# ISKCON Detroit Seva

Festival donation pages for ISKCON Detroit. Devotees scan a QR code (from a printed
poster, an iPad at the table, or a shared link) and give in seconds with **Apple Pay,
Google Pay, card, or bank (ACH)**, or make a **pledge** and get email reminders with a
one-tap pay link.

- **Event pages** for any festival: banner, story, goal and progress bar, suggested amounts, and optional seva sponsorships (e.g. "Feast Sponsor — $501", with optional quantity limits)
- **Give now** through Stripe Checkout, with an optional, clearly shown "cover the fees" checkbox
- **Pledge, pay later**: donor picks an amount and a date. Reminder emails go out 7 days before, on the date, and 7 days after. Donors can pay in parts using the same link.
- **Instant tax receipts** by email (501(c)(3) wording, EIN)
- **Admin** (email sign-in link, no passwords): events, seva options, printable QR posters, donations, pledges, recording of cash/check/Zelle, CSV export, and admin users

Stack: Next.js 16 · Cloudflare Workers (OpenNext) · Neon Postgres (Drizzle) · Stripe · Resend.
Fully separate from the Reium portal: its own repo, Neon project, Resend key, Stripe
keys/webhook and Cloudflare Worker.

---

## Run locally (no accounts needed)

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open http://localhost:3000. Locally:

- **Database:** an embedded Postgres (PGlite) is created in `./.data`, with a sample Gaura Purnima event.
- **Payments:** with no Stripe key, a **simulated checkout** page stands in for Stripe.
- **Email:** with no Resend key, emails are **printed in the terminal**.
- **Admin:** go to http://localhost:3000/admin and sign in with an address in `ADMIN_EMAILS`. The sign-in link is shown on screen.

To use real test services locally, add `STRIPE_SECRET_KEY`, `RESEND_API_KEY` or `DATABASE_URL` to `.env.local`.

Checks: `npm test` · `npm run typecheck` · `npm run lint`

---

## Go-live setup (one time)

### 1. Domain (Cloudflare Registrar)
Buy the domain in the Cloudflare dashboard (**Domain Registration → Register Domains**),
e.g. `iskcondetroitseva.org`. Optional: in Bluehost, create `seva.iskcondetroit.com` as a
**redirect** to the new domain so the familiar address works too.

### 2. Neon database (new project, separate from Reium)
1. Neon console → **New project** → name it `iskcon-detroit-seva`.
2. Copy the connection string (pooled is fine).
3. Create the tables:

   ```bash
   DATABASE_URL="postgres://..." npm run db:migrate
   ```

### 3. Stripe (the temple's existing account)
1. **Apply for the nonprofit rate** (2.2% + 30¢): email Stripe support with your 501(c)(3) determination letter.
2. **Settings → Payment methods**: turn on **Cards, Apple Pay, Google Pay, ACH Direct Debit** (and optionally Link). Checkout shows whatever is enabled, so no code change is needed.
3. **Developers → API keys**: create a **restricted or secret key** for Seva → `STRIPE_SECRET_KEY`.
4. **Developers → Webhooks → Add endpoint**: `https://YOUR-DOMAIN/api/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`

   Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
5. **Settings → Public details / Branding**: temple name, logo and colors (shown on Checkout).

### 4. Resend (existing account, new key)
1. **Domains → Add domain**: your new domain. Add the DNS records it shows in Cloudflare DNS (one click if the domain is on Cloudflare).
2. **API Keys → Create** a key just for Seva → `RESEND_API_KEY`.

### 5. Cloudflare Worker
1. Edit `wrangler.jsonc` → `vars`:
   - `APP_URL`
   - `ORG_LEGAL_NAME`
   - `ORG_EIN`
   - `ORG_ADDRESS`
   - `EMAIL_FROM` (e.g. `ISKCON Detroit Seva <seva@your-domain>`)
   - `ZELLE_RECIPIENT`
   - `ADMIN_EMAILS` (comma-separated owner emails)
2. Log in and add the secrets:

   ```bash
   npx wrangler login
   ```

   ```bash
   npx wrangler secret put DATABASE_URL
   ```

   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   ```

   ```bash
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

   ```bash
   npx wrangler secret put SESSION_SECRET
   ```

   ```bash
   npx wrangler secret put CRON_SECRET
   ```

   For `SESSION_SECRET` and `CRON_SECRET`, use long random strings, e.g. from `openssl rand -base64 32`.
3. Deploy:

   ```bash
   npm run deploy
   ```

4. Cloudflare dashboard → **Workers → iskcon-detroit-seva → Settings → Domains & Routes → Add custom domain** → your domain.
5. Sign in at `https://YOUR-DOMAIN/admin`, check **Settings → Setup status** (all ✅), then create your event.

Pledge reminders run daily at 14:00 UTC (9–10 AM Detroit) through the Cron Trigger in
`wrangler.jsonc`.

Optional: connect the GitHub repo in **Workers → Settings → Builds** so every push deploys
automatically. Build command: `npx opennextjs-cloudflare build`, deploy command:
`npx wrangler deploy`.

---

## Running a festival

1. **Admin → Events → New event**: title, short link (e.g. `gaura-purnima`), description, banner image link, goal, and suggested amounts. Add seva options, then set the status to **Published**.
2. **Print QR poster** from the event page. Put it on the donation table, the entrance and the prasadam line. Open the same poster page on an **iPad** at the table.
3. Share the link in WhatsApp groups and newsletters.
4. **Tap to Pay** (devotee taps their card or phone on a volunteer's iPhone): use the free **Stripe Dashboard app** on an iPhone XS or newer (Payments → "Tap to Pay"). Then record it under **Donations → Record**, method "Card (Stripe app / Tap to Pay)", so it counts toward the event. A custom Tap to Pay app that tags the event automatically is a later phase.
5. **Cash, checks and Zelle**: **Donations → Record cash / check / Zelle**. For pledges, use "Record cash / Zelle" on the pledge so its balance updates.
6. After the festival, set the event to **Closed** and export CSVs for the accountant.

## How money flows
- **Card / Apple Pay / Google Pay**: paid immediately and the receipt is emailed instantly.
- **Bank (ACH)**: marked *processing* for 3–5 business days. The receipt is emailed when it clears (Stripe webhook).
- **Refunds**: refund in the Stripe dashboard. The donation is marked *refunded* automatically, and any pledge balance reopens.
- Card details never touch this app (Stripe Checkout), which keeps PCI scope minimal.

## Project layout
```
src/app/(public)        donor pages: home, /[slug] event, /pledge/[token], /thank-you
src/app/admin           admin (sign-in link auth), poster, CSV exports
src/app/api             Stripe webhook, cron reminders endpoint
src/lib                 donations, checkout, reminders, email templates, auth
src/db                  Drizzle schema, Neon client, local PGlite + seed
drizzle/                SQL migrations (npm run db:generate after schema changes)
worker.ts               Cloudflare entry: app + daily cron
```

## Later phases
SMS reminders, recurring monthly giving, volunteer referral links and leaderboard, iPad
kiosk mode with a Stripe card reader, custom Tap to Pay app, year-end giving statements,
image uploads (R2), Cloudflare Turnstile on forms.

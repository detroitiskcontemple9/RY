import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  imageUrl: text("image_url"),
  goalCents: integer("goal_cents"),
  eventDate: date("event_date", { mode: "string" }),
  /** Suggested amounts in whole dollars, e.g. [51, 101, 251]. */
  presetAmounts: integer("preset_amounts").array().notNull().default([51, 101, 251, 501, 1001]),
  allowPledges: boolean("allow_pledges").notNull().default(true),
  /** draft = hidden, published = live, closed = visible but not accepting gifts */
  status: text("status", { enum: ["draft", "published", "closed"] }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sevaTiers = pgTable(
  "seva_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    /** Optional cap, e.g. only 10 chariot sponsorships. */
    quantityLimit: integer("quantity_limit"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("seva_tiers_event_idx").on(t.eventId)],
);

export const pledges = pgTable(
  "pledges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    tierId: uuid("tier_id").references(() => sevaTiers.id, { onDelete: "set null" }),
    donorName: text("donor_name").notNull(),
    donorEmail: text("donor_email").notNull(),
    donorPhone: text("donor_phone"),
    amountCents: integer("amount_cents").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: text("status", { enum: ["open", "fulfilled", "cancelled"] }).notNull().default("open"),
    /** Secret used in the "pay your pledge" link. */
    token: text("token").notNull().unique(),
    note: text("note"),
    reminderBeforeSentAt: timestamp("reminder_before_sent_at", { withTimezone: true }),
    reminderDueSentAt: timestamp("reminder_due_sent_at", { withTimezone: true }),
    reminderOverdueSentAt: timestamp("reminder_overdue_sent_at", { withTimezone: true }),
    lastManualReminderAt: timestamp("last_manual_reminder_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pledges_event_idx").on(t.eventId), index("pledges_status_idx").on(t.status)],
);

export const DONATION_METHODS = [
  "card",
  "apple_pay",
  "google_pay",
  "link",
  "us_bank_account",
  "cash",
  "check",
  "zelle",
  "other",
] as const;

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    tierId: uuid("tier_id").references(() => sevaTiers.id, { onDelete: "set null" }),
    pledgeId: uuid("pledge_id").references(() => pledges.id, { onDelete: "set null" }),
    donorName: text("donor_name").notNull(),
    donorEmail: text("donor_email"),
    donorPhone: text("donor_phone"),
    /** The gift itself. */
    amountCents: integer("amount_cents").notNull(),
    /** Extra the donor chose to add to cover processing fees. */
    feeCoveredCents: integer("fee_covered_cents").notNull().default(0),
    /** amount + feeCovered: what was charged. */
    totalCents: integer("total_cents").notNull(),
    method: text("method", { enum: DONATION_METHODS }),
    source: text("source", { enum: ["online", "manual"] }).notNull().default("online"),
    status: text("status", {
      enum: ["pending", "processing", "paid", "failed", "refunded", "cancelled"],
    })
      .notNull()
      .default("pending"),
    dedication: text("dedication"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    note: text("note"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    recordedBy: text("recorded_by"),
    receiptSentAt: timestamp("receipt_sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("donations_event_idx").on(t.eventId),
    index("donations_pledge_idx").on(t.pledgeId),
    index("donations_status_idx").on(t.status),
  ],
);

export const admins = pgTable("admins", {
  email: text("email").primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginTokens = pgTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export type Event = typeof events.$inferSelect;
export type SevaTier = typeof sevaTiers.$inferSelect;
export type Pledge = typeof pledges.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type DonationMethod = (typeof DONATION_METHODS)[number];

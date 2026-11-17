CREATE TABLE "admins" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"tier_id" uuid,
	"pledge_id" uuid,
	"donor_name" text NOT NULL,
	"donor_email" text,
	"donor_phone" text,
	"amount_cents" integer NOT NULL,
	"fee_covered_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"method" text,
	"source" text DEFAULT 'online' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"dedication" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"note" text,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"recorded_by" text,
	"receipt_sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"description" text,
	"image_url" text,
	"goal_cents" integer,
	"event_date" date,
	"preset_amounts" integer[] DEFAULT '{51,101,251,501,1001}' NOT NULL,
	"allow_pledges" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"tier_id" uuid,
	"donor_name" text NOT NULL,
	"donor_email" text NOT NULL,
	"donor_phone" text,
	"amount_cents" integer NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"token" text NOT NULL,
	"note" text,
	"reminder_before_sent_at" timestamp with time zone,
	"reminder_due_sent_at" timestamp with time zone,
	"reminder_overdue_sent_at" timestamp with time zone,
	"last_manual_reminder_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pledges_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "seva_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount_cents" integer NOT NULL,
	"quantity_limit" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_tier_id_seva_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."seva_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_pledge_id_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_tier_id_seva_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."seva_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seva_tiers" ADD CONSTRAINT "seva_tiers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donations_event_idx" ON "donations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "donations_pledge_idx" ON "donations" USING btree ("pledge_id");--> statement-breakpoint
CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pledges_event_idx" ON "pledges" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "pledges_status_idx" ON "pledges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seva_tiers_event_idx" ON "seva_tiers" USING btree ("event_id");
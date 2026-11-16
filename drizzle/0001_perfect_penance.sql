CREATE TABLE "lineup_notification_state" (
	"service_id" integer PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"subscription_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease" text,
	"sent_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "notification_deliveries_eventId_subscriptionId_unique" UNIQUE("event_id","subscription_id")
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"service_id" integer,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_runtime" (
	"id" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"member_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_test_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_deviceId_unique" UNIQUE("device_id"),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "lineup_notification_state" ADD CONSTRAINT "lineup_notification_state_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_notification_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."notification_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_due_idx" ON "notification_deliveries" USING btree ("status","available_at");
--> statement-breakpoint
-- Establish a baseline; installing notifications must not announce old published lineups.
INSERT INTO lineup_notification_state (service_id, fingerprint, status, version)
SELECT services.id, md5(jsonb_build_object(
  'details', jsonb_build_array(services.date, services.language, services.palette, services.occasion, services.notes, services.status,
    (select theme from months where id = services.month_id), (select note from months where id = services.month_id)),
  'songs', (select jsonb_agg(jsonb_build_array(title, artist, "set", is_backup) order by position, id) from service_songs where service_id = services.id),
  'people', (select jsonb_agg(jsonb_build_array(member_id, role) order by role, position, id) from assignments where service_id = services.id)
)::text), services.status, 0 FROM services;

CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" integer,
	"author_name" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notification_events" ADD COLUMN "announcement_id" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_feed_idx" ON "announcements" USING btree ("archived_at","created_at");--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"role" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assignments_serviceId_role_memberId_unique" UNIQUE("service_id","role","member_id")
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"member_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"answer" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_member_id_service_id_pk" PRIMARY KEY("member_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "availability_notes" (
	"member_id" integer NOT NULL,
	"month_id" text NOT NULL,
	"open_to" text[] DEFAULT '{}' NOT NULL,
	"try_lead" boolean DEFAULT false NOT NULL,
	"song_idea" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_notes_member_id_month_id_pk" PRIMARY KEY("member_id","month_id")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sings" boolean DEFAULT false NOT NULL,
	"instruments" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "months" (
	"id" text PRIMARY KEY NOT NULL,
	"theme" text,
	"note" text,
	"availability_open" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"set" text,
	"is_backup" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"month_id" text NOT NULL,
	"language" text NOT NULL,
	"palette" text,
	"occasion" text,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_notes" ADD CONSTRAINT "availability_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_notes" ADD CONSTRAINT "availability_notes_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_songs" ADD CONSTRAINT "service_songs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE cascade ON UPDATE no action;
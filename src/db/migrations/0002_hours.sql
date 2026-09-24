CREATE TABLE IF NOT EXISTS "opening_hour_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"custom_opens_at" time,
	"custom_closes_at" time,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "opening_hour_exceptions_site_id_date_unique" UNIQUE("site_id","date"),
	CONSTRAINT "opening_hour_exceptions_closed_or_times" CHECK ("opening_hour_exceptions"."is_closed" OR ("opening_hour_exceptions"."custom_opens_at" IS NOT NULL AND "opening_hour_exceptions"."custom_closes_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opening_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "opening_hours_site_id_weekday_unique" UNIQUE("site_id","weekday"),
	CONSTRAINT "opening_hours_weekday_range" CHECK ("opening_hours"."weekday" between 0 and 6),
	CONSTRAINT "opening_hours_times_differ" CHECK ("opening_hours"."opens_at" <> "opening_hours"."closes_at")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opening_hour_exceptions" ADD CONSTRAINT "opening_hour_exceptions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

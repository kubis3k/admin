CREATE TABLE IF NOT EXISTS "page_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"page_key" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "page_content_site_id_page_key_unique" UNIQUE("site_id","page_key"),
	CONSTRAINT "page_content_page_key_format" CHECK ("page_content"."page_key" ~ '^[a-z0-9-]{1,50}$')
);
--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "modules" SET DEFAULT '{"menu":false,"hours":false,"events":false,"gallery":false,"content":false}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page_content" ADD CONSTRAINT "page_content_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

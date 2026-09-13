CREATE TABLE "image_uploads" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"payload_hash" text,
	"admin_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"generation" integer NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"result" jsonb
);
--> statement-breakpoint
ALTER TABLE "media_objects" ADD COLUMN "eligible_at" timestamp with time zone DEFAULT now()+interval '24 hours' NOT NULL;
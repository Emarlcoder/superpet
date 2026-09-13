CREATE TABLE "login_failures" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tokens" ADD COLUMN "email" text;
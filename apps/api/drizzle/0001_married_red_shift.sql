CREATE TABLE "media_objects" (
	"key" text PRIMARY KEY NOT NULL,
	"private_file" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

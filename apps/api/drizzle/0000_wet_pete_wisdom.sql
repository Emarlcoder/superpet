CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"password_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"payload_hash" text,
	"result" jsonb,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_sku_id" uuid NOT NULL,
	"target_sku_id" uuid NOT NULL,
	"grams_per_bag" bigint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "bulk_weight" CHECK ("bulk_configs"."grams_per_bag">0 and "bulk_configs"."source_sku_id"<>"bulk_configs"."target_sku_id")
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"status" text NOT NULL,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"admin_id" uuid,
	"kind" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"alt" text NOT NULL,
	"position" integer NOT NULL,
	"original_key" text NOT NULL,
	"variants" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"delta" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movement_bounds" CHECK ("stock_movements"."delta"<>0 and "stock_movements"."balance_after">=0)
);
--> statement-breakpoint
CREATE TABLE "inventory_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"purchase_id" uuid,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid NOT NULL,
	"brand_id" uuid,
	"species" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_status" CHECK ("products"."status" in ('draft','published','archived'))
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"delivery_mode" text NOT NULL,
	"shipping_minor" bigint,
	"notes" text DEFAULT '' NOT NULL,
	"lines" jsonb NOT NULL,
	"effective_lines" jsonb NOT NULL,
	"subtotal_minor" bigint NOT NULL,
	"effective_subtotal_minor" bigint NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "purchases_reference_unique" UNIQUE("reference"),
	CONSTRAINT "purchase_status" CHECK ("purchases"."status" in ('pending','completed','cancelled')),
	CONSTRAINT "purchase_channel" CHECK ("purchases"."channel" in ('web','local','whatsapp_manual')),
	CONSTRAINT "delivery_mode" CHECK ("purchases"."delivery_mode" in ('pickup','shipping')),
	CONSTRAINT "web_contact" CHECK ("purchases"."channel"<>'web' or ("purchases"."customer_name" is not null and "purchases"."customer_phone" is not null)),
	CONSTRAINT "purchase_amounts" CHECK ("purchases"."subtotal_minor">=0 and "purchases"."effective_subtotal_minor">=0 and ("purchases"."shipping_minor" is null or "purchases"."shipping_minor">=0))
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lines" jsonb NOT NULL,
	"delivery_mode" text NOT NULL,
	"store_version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"effective_line_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"restock_quantity" integer NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "return_quantity" CHECK ("returns"."quantity">0 and "returns"."restock_quantity">=0 and "returns"."restock_quantity"<="returns"."quantity")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"admin_id" uuid,
	"csrf" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"sale_unit" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"net_weight_grams" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "skus_code_unique" UNIQUE("code"),
	CONSTRAINT "sku_unit" CHECK ("skus"."sale_unit" in ('unit','kg')),
	CONSTRAINT "sku_price" CHECK ("skus"."price_minor">0 and "skus"."price_minor"<=999999999),
	CONSTRAINT "sku_weight" CHECK ("skus"."net_weight_grams" is null or "skus"."net_weight_grams">0)
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"sku_id" uuid PRIMARY KEY NOT NULL,
	"quantity" bigint DEFAULT 0 NOT NULL,
	"minimum" bigint DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stock_bounds" CHECK ("stocks"."quantity">=0 and "stocks"."quantity"<=999999999999 and "stocks"."minimum">=0)
);
--> statement-breakpoint
CREATE TABLE "store" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "taxonomy_kind" CHECK ("taxonomies"."kind" in ('category','brand'))
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "bulk_configs" ADD CONSTRAINT "bulk_configs_source_sku_id_skus_id_fk" FOREIGN KEY ("source_sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_configs" ADD CONSTRAINT "bulk_configs_target_sku_id_skus_id_fk" FOREIGN KEY ("target_sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_events" ADD CONSTRAINT "purchase_events_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_events" ADD CONSTRAINT "purchase_events_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_operation_id_inventory_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."inventory_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_operations" ADD CONSTRAINT "inventory_operations_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_operations" ADD CONSTRAINT "inventory_operations_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_taxonomies_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."taxonomies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_taxonomies_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."taxonomies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_event_id_purchase_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."purchase_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skus" ADD CONSTRAINT "skus_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_key" ON "attempts" USING btree ("scope","key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "bulk_pair" ON "bulk_configs" USING btree ("source_sku_id","target_sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_sku" ON "stock_movements" USING btree ("operation_id","sku_id");--> statement-breakpoint
CREATE INDEX "product_catalog" ON "products" USING btree ("status","category_id");--> statement-breakpoint
CREATE INDEX "purchase_list" ON "purchases" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_bulk_per_product" ON "skus" USING btree ("product_id") WHERE "skus"."sale_unit"='kg';--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_slug" ON "taxonomies" USING btree ("kind","slug");
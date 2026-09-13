import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  bigint,
  check,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { Line, StoreData } from '../domain/types.js';

const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });
export const mediaObjects = pgTable('media_objects', {
  key: text('key').primaryKey(),
  privateFile: boolean('private_file').notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
  eligibleAt: time('eligible_at')
    .notNull()
    .default(sql`now()+interval '24 hours'`),
});
export const imageUploads = pgTable('image_uploads', {
  keyHash: text('key_hash').primaryKey(),
  payloadHash: text('payload_hash'),
  adminId: uuid('admin_id').notNull(),
  productId: uuid('product_id').notNull(),
  imageId: uuid('image_id').notNull(),
  generation: integer('generation').notNull(),
  leaseUntil: time('lease_until').notNull(),
  expiresAt: time('expires_at').notNull(),
  result: jsonb('result').$type<{ status: number; body: unknown }>(),
});
export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email'),
  emailVerified: boolean('email_verified').notNull().default(false),
  active: boolean('active').notNull().default(true),
  passwordVersion: integer('password_version').notNull().default(1),
});
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  adminId: uuid('admin_id').references(() => admins.id),
  csrf: text('csrf').notNull(),
  expiresAt: time('expires_at').notNull(),
  lastActivityAt: time('last_activity_at').notNull().defaultNow(),
});
export const tokens = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => admins.id),
  tokenHash: text('token_hash').notNull().unique(),
  purpose: text('purpose').notNull(),
  email: text('email'),
  expiresAt: time('expires_at').notNull(),
  consumed: boolean('consumed').notNull().default(false),
});
export const deliveries = pgTable('email_deliveries', {
  id: uuid('id').primaryKey(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => admins.id),
  tokenId: uuid('token_id')
    .notNull()
    .references(() => tokens.id),
  status: text('status').notNull(),
  providerId: text('provider_id'),
  createdAt: time('created_at').notNull().defaultNow(),
});
export const rates = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: time('expires_at').notNull(),
});
export const loginFailures = pgTable('login_failures', {
  key: text('key').primaryKey(),
  failures: integer('failures').notNull(),
  windowStart: time('window_start').notNull(),
  blockedUntil: time('blocked_until').notNull(),
});
export const taxonomies = pgTable(
  'taxonomies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('taxonomy_slug').on(t.kind, t.slug),
    check('taxonomy_kind', sql`${t.kind} in ('category','brand')`),
  ],
);
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => taxonomies.id),
    brandId: uuid('brand_id').references(() => taxonomies.id),
    species: jsonb('species').$type<Array<'dog' | 'cat'>>().notNull(),
    status: text('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'product_status',
      sql`${t.status} in ('draft','published','archived')`,
    ),
    index('product_catalog').on(t.status, t.categoryId),
  ],
);
export const skus = pgTable(
  'skus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    code: text('code').notNull().unique(),
    label: text('label').notNull(),
    saleUnit: text('sale_unit').notNull(),
    priceMinor: bigint('price_minor', { mode: 'bigint' }).notNull(),
    netWeightGrams: bigint('net_weight_grams', { mode: 'bigint' }),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    check('sku_unit', sql`${t.saleUnit} in ('unit','kg')`),
    check('sku_price', sql`${t.priceMinor}>0 and ${t.priceMinor}<=999999999`),
    check(
      'sku_weight',
      sql`${t.netWeightGrams} is null or ${t.netWeightGrams}>0`,
    ),
    uniqueIndex('one_bulk_per_product')
      .on(t.productId)
      .where(sql`${t.saleUnit}='kg'`),
  ],
);
export const stocks = pgTable(
  'stocks',
  {
    skuId: uuid('sku_id')
      .primaryKey()
      .references(() => skus.id),
    quantity: bigint('quantity', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    minimum: bigint('minimum', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    check(
      'stock_bounds',
      sql`${t.quantity}>=0 and ${t.quantity}<=999999999999 and ${t.minimum}>=0`,
    ),
  ],
);
export const store = pgTable('store', {
  id: integer('id').primaryKey(),
  data: jsonb('data').$type<StoreData>().notNull(),
  version: integer('version').notNull().default(1),
});
export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  lines: jsonb('lines').$type<Line[]>().notNull(),
  deliveryMode: text('delivery_mode').notNull(),
  storeVersion: integer('store_version').notNull(),
  expiresAt: time('expires_at').notNull(),
});
export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reference: text('reference').notNull().unique(),
    channel: text('channel').notNull(),
    status: text('status').notNull().default('pending'),
    customerName: text('customer_name'),
    customerPhone: text('customer_phone'),
    deliveryMode: text('delivery_mode').notNull(),
    shippingMinor: bigint('shipping_minor', { mode: 'bigint' }),
    notes: text('notes').notNull().default(''),
    lines: jsonb('lines').$type<Line[]>().notNull(),
    effectiveLines: jsonb('effective_lines').$type<Line[]>().notNull(),
    subtotalMinor: bigint('subtotal_minor', { mode: 'bigint' }).notNull(),
    effectiveSubtotalMinor: bigint('effective_subtotal_minor', {
      mode: 'bigint',
    }).notNull(),
    version: integer('version').notNull().default(1),
    createdAt: time('created_at').notNull().defaultNow(),
    completedAt: time('completed_at'),
  },
  (t) => [
    check(
      'purchase_status',
      sql`${t.status} in ('pending','completed','cancelled')`,
    ),
    check(
      'purchase_channel',
      sql`${t.channel} in ('web','local','whatsapp_manual')`,
    ),
    check('delivery_mode', sql`${t.deliveryMode} in ('pickup','shipping')`),
    check(
      'web_contact',
      sql`${t.channel}<>'web' or (${t.customerName} is not null and ${t.customerPhone} is not null)`,
    ),
    check(
      'purchase_amounts',
      sql`${t.subtotalMinor}>=0 and ${t.effectiveSubtotalMinor}>=0 and (${t.shippingMinor} is null or ${t.shippingMinor}>=0)`,
    ),
    index('purchase_list').on(t.status, t.createdAt),
  ],
);
export const events = pgTable('purchase_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id')
    .notNull()
    .references(() => purchases.id),
  adminId: uuid('admin_id').references(() => admins.id),
  kind: text('kind').notNull(),
  reason: text('reason').notNull().default(''),
  detail: jsonb('detail').$type<Record<string, unknown>>().notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
});
export const returns = pgTable(
  'returns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id),
    effectiveLineId: uuid('effective_line_id').notNull(),
    quantity: integer('quantity').notNull(),
    restockQuantity: integer('restock_quantity').notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
  },
  (t) => [
    check(
      'return_quantity',
      sql`${t.quantity}>0 and ${t.restockQuantity}>=0 and ${t.restockQuantity}<=${t.quantity}`,
    ),
  ],
);
export const operations = pgTable('inventory_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => admins.id),
  kind: text('kind').notNull(),
  reason: text('reason').notNull(),
  purchaseId: uuid('purchase_id').references(() => purchases.id),
  detail: jsonb('detail').$type<Record<string, unknown>>().notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
});
export const movements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => operations.id),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    delta: bigint('delta', { mode: 'bigint' }).notNull(),
    balanceAfter: bigint('balance_after', { mode: 'bigint' }).notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('operation_sku').on(t.operationId, t.skuId),
    check('movement_bounds', sql`${t.delta}<>0 and ${t.balanceAfter}>=0`),
  ],
);
export const bulkConfigs = pgTable(
  'bulk_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceSkuId: uuid('source_sku_id')
      .notNull()
      .references(() => skus.id),
    targetSkuId: uuid('target_sku_id')
      .notNull()
      .references(() => skus.id),
    gramsPerBag: bigint('grams_per_bag', { mode: 'bigint' }).notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('bulk_pair').on(t.sourceSkuId, t.targetSkuId),
    check(
      'bulk_weight',
      sql`${t.gramsPerBag}>0 and ${t.sourceSkuId}<>${t.targetSkuId}`,
    ),
  ],
);
export const attempts = pgTable(
  'attempts',
  {
    scope: text('scope').notNull(),
    keyHash: text('key_hash').notNull(),
    payloadHash: text('payload_hash'),
    result: jsonb('result').$type<{ status: number; body: unknown }>(),
    expiresAt: time('expires_at').notNull(),
  },
  (t) => [uniqueIndex('attempt_key').on(t.scope, t.keyHash)],
);
export const images = pgTable('images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  alt: text('alt').notNull(),
  position: integer('position').notNull(),
  originalKey: text('original_key').notNull(),
  variants: jsonb('variants')
    .$type<Array<{ key: string; width: number; height: number }>>()
    .notNull(),
  createdAt: time('created_at').notNull().defaultNow(),
});

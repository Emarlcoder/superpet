import { randomUUID, createHash, createHmac } from 'node:crypto';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Database, QueryDb, Transaction } from '../db/database.js';
import * as s from '../db/schema.js';
import { DomainError, ensure, json } from './errors.js';
import { publicImageUrl } from './media-url.js';
import type { Line } from './types.js';

const total = (lines: Line[]) =>
  lines.reduce((sum, l) => sum + BigInt(l.lineTotalMinor), 0n);
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
export class Commerce {
  constructor(
    public db: Database,
    public epoch: string,
    private secret: string,
  ) {}

  async mutate(
    scope: string,
    key: string,
    payload: unknown,
    fn: (tx: Transaction) => Promise<unknown>,
  ) {
    ensure(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      ),
      'INVALID_IDEMPOTENCY_KEY',
      400,
    );
    const keyHash = createHash('sha256').update(key).digest('hex');
    const payloadHash = createHmac('sha256', this.secret)
      .update(canonical(payload))
      .digest('hex');
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`set local lock_timeout = '5s'`);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${scope + keyHash},0))`,
      );
      const where = and(
        eq(s.attempts.scope, scope),
        eq(s.attempts.keyHash, keyHash),
      );
      const [previous] = await tx.select().from(s.attempts).where(where);
      if (previous) {
        if (previous.expiresAt <= new Date()) {
          await tx
            .update(s.attempts)
            .set({ payloadHash: null, result: null })
            .where(where);
          return {
            status: 409,
            body: { code: 'IDEMPOTENCY_EXPIRED' },
            replayed: true,
          };
        }
        ensure(previous.payloadHash === payloadHash, 'IDEMPOTENCY_CONFLICT');
        ensure(previous.result, 'IDEMPOTENCY_IN_PROGRESS');
        return { ...previous.result, replayed: true };
      }
      let result: { status: number; body: unknown };
      try {
        const body = await tx.transaction((inner) => fn(inner));
        result = { status: 200, body: json(body) };
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        result = {
          status: error.statusCode,
          body: { code: error.code, message: error.message },
        };
      }
      await tx.insert(s.attempts).values({
        scope,
        keyHash,
        payloadHash,
        result,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      });
      return { ...result, replayed: false };
    });
  }
  async settings(db: QueryDb = this.db) {
    const [row] = await db.select().from(s.store).where(eq(s.store.id, 1));
    ensure(row, 'STORE_NOT_CONFIGURED', 503);
    return row;
  }
  async publicStore() {
    const row = await this.settings();
    return { ...row.data, version: row.version, operationEpoch: this.epoch };
  }
  async catalogPage(query: {
    q?: string | undefined;
    species?: 'dog' | 'cat' | undefined;
    category?: string | undefined;
    brand?: string | undefined;
    sort?: 'name_asc' | 'price_asc' | 'price_desc' | undefined;
    limit: number;
    cursor?: string | undefined;
  }) {
    const offset = query.cursor
      ? Number(Buffer.from(query.cursor, 'base64url').toString())
      : 0;
    ensure(Number.isSafeInteger(offset) && offset >= 0, 'INVALID_CURSOR', 422);
    // A bag/unit defines the displayed price; loose food must not affect sorting.
    const price = sql`(select ${s.skus.priceMinor} from ${s.skus}
      inner join ${s.stocks} on ${s.stocks.skuId} = ${s.skus.id}
      where ${s.skus.productId} = ${s.products.id}
      and ${s.skus.active} = true and ${s.skus.saleUnit} = 'unit'
      order by ${s.skus.id} limit 1)`;
    const rows = await this.db
      .select()
      .from(s.products)
      .where(
        and(
          eq(s.products.status, 'published'),
          query.q
            ? sql`strpos(lower(${s.products.name}), lower(${query.q})) > 0`
            : undefined,
          query.species
            ? sql`${s.products.species} @> ${JSON.stringify([query.species])}::jsonb`
            : undefined,
          query.category
            ? eq(s.products.categoryId, query.category)
            : undefined,
          query.brand ? eq(s.products.brandId, query.brand) : undefined,
        ),
      )
      .orderBy(
        ...(query.sort === 'price_asc'
          ? [sql`${price} asc nulls last`, asc(s.products.id)]
          : query.sort === 'price_desc'
            ? [sql`${price} desc nulls first`, asc(s.products.id)]
            : [asc(s.products.name), asc(s.products.id)]),
      )
      .limit(query.limit + 1)
      .offset(offset);
    return {
      items: await this.catalogRows(rows.slice(0, query.limit), false),
      nextCursor:
        rows.length > query.limit
          ? Buffer.from(String(offset + query.limit)).toString('base64url')
          : null,
    };
  }
  async catalogProduct(slug: string) {
    const rows = await this.db
      .select()
      .from(s.products)
      .where(and(eq(s.products.status, 'published'), eq(s.products.slug, slug)))
      .limit(1);
    ensure(rows.length, 'NOT_FOUND', 404);
    return (await this.catalogRows(rows, false))[0]!;
  }
  async catalog(admin = false) {
    const rows = await this.db
      .select()
      .from(s.products)
      .where(admin ? undefined : eq(s.products.status, 'published'))
      .orderBy(asc(s.products.name), asc(s.products.id));
    return this.catalogRows(rows, admin);
  }
  private async catalogRows(
    rows: Array<typeof s.products.$inferSelect>,
    admin: boolean,
  ) {
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id);
    const [variants, photos] = await Promise.all([
      this.db
        .select({ sku: s.skus, stock: s.stocks })
        .from(s.skus)
        .innerJoin(s.stocks, eq(s.skus.id, s.stocks.skuId))
        .where(
          and(
            inArray(s.skus.productId, ids),
            admin ? undefined : eq(s.skus.active, true),
          ),
        )
        .orderBy(asc(s.skus.id)),
      this.db
        .select({
          id: s.images.id,
          productId: s.images.productId,
          alt: s.images.alt,
          variants: s.images.variants,
        })
        .from(s.images)
        .where(inArray(s.images.productId, ids))
        .orderBy(asc(s.images.position), asc(s.images.id)),
    ]);
    return rows.map((p) => ({
      ...p,
      images: photos
        .filter((i) => i.productId === p.id)
        .map((i) => ({
          id: i.id,
          alt: i.alt,
          variants: i.variants.map((v) => ({
            ...v,
            url: publicImageUrl(v.key),
          })),
        })),
      skus: variants
        .filter((v) => v.sku.productId === p.id && (admin || v.sku.active))
        .map(({ sku, stock }) => ({
          ...sku,
          priceMinor: sku.priceMinor.toString(),
          netWeightGrams: sku.netWeightGrams?.toString() ?? null,
          ...(admin
            ? {
                stock: stock.quantity.toString(),
                stockVersion: stock.version,
                minimum: stock.minimum.toString(),
              }
            : {}),
          maxSelectable: Number(
            sku.saleUnit === 'kg'
              ? stock.quantity / 1000n > 5n
                ? 5n
                : stock.quantity / 1000n
              : stock.quantity > 999n
                ? 999n
                : stock.quantity,
          ),
        })),
    }));
  }
  async lines(
    db: QueryDb,
    items: Array<{ skuId: string; quantity: number; unitPriceMinor?: string }>,
    publicOnly: boolean,
    checkStock: boolean,
    old: Line[] = [],
  ): Promise<Line[]> {
    const consolidated = new Map<
      string,
      { quantity: number; unitPriceMinor?: string }
    >();
    for (const item of items) {
      const prev = consolidated.get(item.skuId);
      consolidated.set(item.skuId, {
        ...item,
        quantity: item.quantity + (prev?.quantity ?? 0),
      });
    }
    const result: Line[] = [];
    for (const [skuId, item] of [...consolidated].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const [row] = await db
        .select({ sku: s.skus, product: s.products, stock: s.stocks })
        .from(s.skus)
        .innerJoin(s.products, eq(s.products.id, s.skus.productId))
        .innerJoin(s.stocks, eq(s.stocks.skuId, s.skus.id))
        .where(eq(s.skus.id, skuId));
      ensure(row, 'CATALOG_CHANGED');
      ensure(
        !publicOnly || (row.sku.active && row.product.status === 'published'),
        'CATALOG_CHANGED',
      );
      ensure(
        Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= (row.sku.saleUnit === 'kg' ? 5 : 999),
        'INVALID_QUANTITY',
        422,
      );
      const inventory =
        BigInt(item.quantity) * (row.sku.saleUnit === 'kg' ? 1000n : 1n);
      ensure(
        !checkStock || row.stock.quantity >= inventory,
        'STOCK_INSUFFICIENT',
      );
      const price = item.unitPriceMinor
        ? BigInt(item.unitPriceMinor)
        : row.sku.priceMinor;
      result.push({
        effectiveLineId:
          old.find((l) => l.skuId === skuId)?.effectiveLineId ?? randomUUID(),
        skuId,
        name: row.product.name,
        label: row.sku.label,
        code: row.sku.code,
        saleUnit: row.sku.saleUnit as 'unit' | 'kg',
        quantity: item.quantity,
        inventoryQuantity: inventory.toString(),
        unitPriceMinor: price.toString(),
        lineTotalMinor: (price * BigInt(item.quantity)).toString(),
      });
    }
    ensure(total(result) <= 999999999999n, 'LIMIT_EXCEEDED', 422);
    return result;
  }
  async quote(input: {
    items: Array<{ skuId: string; quantity: number }>;
    deliveryMode: 'pickup' | 'shipping';
  }) {
    return this.db.transaction(async (tx) => {
      const settings = await this.settings(tx);
      const lines = await this.lines(tx, input.items, true, true);
      const expiresAt = new Date(Date.now() + 600000);
      const [quote] = await tx
        .insert(s.quotes)
        .values({
          lines,
          deliveryMode: input.deliveryMode,
          storeVersion: settings.version,
          expiresAt,
        })
        .returning();
      return {
        quoteId: quote!.id,
        expiresAt,
        lines,
        subtotalMinor: total(lines).toString(),
        shippingMinor: input.deliveryMode === 'shipping' ? null : '0',
        currency: 'UYU',
        whatsappNumber: settings.data.whatsappNumber,
      };
    });
  }
  async create(
    tx: Transaction,
    input: {
      quoteId?: string;
      items: Array<{ skuId: string; quantity: number }>;
      deliveryMode: 'pickup' | 'shipping';
      customer?: { name: string; phone: string } | undefined;
      channel?: 'local' | 'whatsapp_manual';
    },
    adminId?: string,
  ) {
    const settings = await this.settings(tx);
    let lines: Line[];
    if (!adminId) {
      ensure(settings.data.whatsappNumber, 'STORE_NOT_CONFIGURED', 503);
      const [quote] = await tx
        .select()
        .from(s.quotes)
        .where(eq(s.quotes.id, input.quoteId!));
      ensure(quote && quote.expiresAt > new Date(), 'QUOTE_EXPIRED');
      ensure(quote.storeVersion === settings.version, 'STORE_CHANGED');
      ensure(quote.deliveryMode === input.deliveryMode, 'QUOTE_MISMATCH');
      // Order catalogue updates against the snapshots used to create the purchase.
      await tx
        .select()
        .from(s.products)
        .orderBy(asc(s.products.id))
        .for('share');
      await tx
        .select()
        .from(s.skus)
        .where(
          inArray(
            s.skus.id,
            quote.lines.map((l) => l.skuId),
          ),
        )
        .orderBy(asc(s.skus.id))
        .for('share');
      const current = await this.lines(
        tx,
        input.items,
        true,
        true,
        quote.lines,
      );
      ensure(
        canonical(current.map((l) => [l.skuId, l.quantity])) ===
          canonical(quote.lines.map((l) => [l.skuId, l.quantity])),
        'QUOTE_MISMATCH',
      );
      ensure(canonical(current) === canonical(quote.lines), 'PRICE_CHANGED');
      lines = quote.lines;
    } else lines = await this.lines(tx, input.items, false, false);
    const now = new Date();
    const [purchase] = await tx
      .insert(s.purchases)
      .values({
        reference: 'SP-' + randomUUID().toUpperCase(),
        channel: adminId ? (input.channel ?? 'local') : 'web',
        customerName: input.customer?.name ?? null,
        customerPhone: input.customer?.phone ?? null,
        deliveryMode: input.deliveryMode,
        shippingMinor: input.deliveryMode === 'pickup' ? 0n : null,
        lines,
        effectiveLines: lines,
        subtotalMinor: total(lines),
        effectiveSubtotalMinor: total(lines),
        createdAt: now,
      })
      .returning();
    await this.event(tx, purchase!.id, adminId ?? null, 'created', '', {});
    return adminId
      ? purchase
      : {
          reference: purchase!.reference,
          creationStatus: 'pending',
          createdAt: now,
        };
  }
  async purchase(tx: QueryDb, id: string, expectedVersion?: number) {
    const [p] = await tx
      .select()
      .from(s.purchases)
      .where(eq(s.purchases.id, id))
      .for('update');
    ensure(p, 'NOT_FOUND', 404);
    if (expectedVersion !== undefined)
      ensure(p.version === expectedVersion, 'VERSION_CONFLICT');
    return p;
  }
  async event(
    tx: Transaction,
    purchaseId: string,
    adminId: string | null,
    kind: string,
    reason: string,
    detail: Record<string, unknown>,
  ) {
    const [event] = await tx
      .insert(s.events)
      .values({ purchaseId, adminId, kind, reason, detail: json(detail) })
      .returning();
    return event!;
  }
  async move(
    tx: Transaction,
    adminId: string,
    kind: string,
    reason: string,
    deltas: Map<string, bigint>,
    purchaseId?: string,
    detail: Record<string, unknown> = {},
  ) {
    const changes = [...deltas]
      .filter(([, delta]) => delta !== 0n)
      .sort(([a], [b]) => a.localeCompare(b));
    if (!changes.length) return null;
    const locked = await tx
      .select()
      .from(s.stocks)
      .where(
        inArray(
          s.stocks.skuId,
          changes.map(([id]) => id),
        ),
      )
      .orderBy(asc(s.stocks.skuId))
      .for('update');
    for (const [id, delta] of changes) {
      const stock = locked.find((r) => r.skuId === id);
      ensure(stock, 'NOT_FOUND', 404);
      ensure(stock.quantity + delta >= 0n, 'STOCK_INSUFFICIENT');
      ensure(stock.quantity + delta <= 999999999999n, 'LIMIT_EXCEEDED', 422);
    }
    const [op] = await tx
      .insert(s.operations)
      .values({
        adminId,
        kind,
        reason,
        purchaseId: purchaseId ?? null,
        detail: json(detail),
      })
      .returning();
    for (const [id, delta] of changes) {
      const stock = locked.find((r) => r.skuId === id)!;
      const balanceAfter = stock.quantity + delta;
      await tx
        .update(s.stocks)
        .set({ quantity: balanceAfter, version: stock.version + 1 })
        .where(eq(s.stocks.skuId, id));
      await tx
        .insert(s.movements)
        .values({ operationId: op!.id, skuId: id, delta, balanceAfter });
    }
    return op!.id;
  }
  async transition(
    tx: Transaction,
    id: string,
    version: number,
    adminId: string,
    action: 'complete' | 'cancel',
    reason = '',
  ) {
    const p = await this.purchase(tx, id, version);
    ensure(p.status === 'pending', 'INVALID_STATE');
    if (action === 'complete')
      await this.move(
        tx,
        adminId,
        'sale',
        'Venta realizada',
        new Map(p.lines.map((l) => [l.skuId, -BigInt(l.inventoryQuantity)])),
        id,
      );
    const [updated] = await tx
      .update(s.purchases)
      .set({
        status: action === 'complete' ? 'completed' : 'cancelled',
        completedAt: action === 'complete' ? new Date() : null,
        version: p.version + 1,
      })
      .where(eq(s.purchases.id, id))
      .returning();
    await this.event(tx, id, adminId, action, reason, {
      previousVersion: p.version,
      nextVersion: p.version + 1,
    });
    return updated;
  }
  async edit(
    tx: Transaction,
    id: string,
    input: {
      expectedVersion: number;
      items: Array<{ skuId: string; quantity: number }>;
      deliveryMode: 'pickup' | 'shipping';
      shippingMinor: string | null;
      notes: string;
    },
    adminId: string,
  ) {
    const p = await this.purchase(tx, id, input.expectedVersion);
    ensure(p.status === 'pending', 'INVALID_STATE');
    const lines = await this.lines(tx, input.items, false, false, p.lines);
    const [updated] = await tx
      .update(s.purchases)
      .set({
        lines,
        effectiveLines: lines,
        subtotalMinor: total(lines),
        effectiveSubtotalMinor: total(lines),
        deliveryMode: input.deliveryMode,
        shippingMinor:
          input.deliveryMode === 'pickup'
            ? 0n
            : input.shippingMinor === null
              ? null
              : BigInt(input.shippingMinor),
        notes: input.notes,
        version: p.version + 1,
      })
      .where(eq(s.purchases.id, id))
      .returning();
    await this.event(tx, id, adminId, 'edited', '', {
      before: p.lines,
      after: lines,
    });
    return updated;
  }
  async correction(
    tx: Transaction,
    id: string,
    input: {
      expectedVersion: number;
      reason: string;
      desiredLines: Array<{
        skuId: string;
        quantity: number;
        unitPriceMinor: string;
      }>;
    },
    adminId: string,
    preview = false,
  ) {
    const p = await this.purchase(tx, id, input.expectedVersion);
    ensure(p.status === 'completed', 'INVALID_STATE');
    ensure(
      new Set(input.desiredLines.map((l) => l.skuId)).size ===
        input.desiredLines.length,
      'INVALID_LINES',
      422,
    );
    const after = await this.lines(
      tx,
      input.desiredLines,
      false,
      false,
      p.effectiveLines,
    );
    const before = p.effectiveLines.filter((l) => l.quantity > 0);
    const quantityChange =
      canonical(before.map((l) => [l.skuId, l.quantity]).sort()) !==
      canonical(after.map((l) => [l.skuId, l.quantity]).sort());
    const returned = await tx
      .select()
      .from(s.returns)
      .where(eq(s.returns.purchaseId, id));
    ensure(!quantityChange || !returned.length, 'CORRECTION_AFTER_RETURN');
    const deltas = new Map(
      before.map((l) => [l.skuId, BigInt(l.inventoryQuantity)]),
    );
    for (const l of after)
      deltas.set(
        l.skuId,
        (deltas.get(l.skuId) ?? 0n) - BigInt(l.inventoryQuantity),
      );
    ensure(
      quantityChange ||
        canonical(before.map((l) => [l.skuId, l.unitPriceMinor]).sort()) !==
          canonical(after.map((l) => [l.skuId, l.unitPriceMinor]).sort()),
      'NO_CHANGES',
      422,
    );
    const result = {
      before,
      after,
      differenceMinor: (total(after) - total(before)).toString(),
      stockDeltas: [...deltas].map(([skuId, delta]) => ({
        skuId,
        delta: delta.toString(),
      })),
      subtotalAfterMinor: total(after).toString(),
    };
    if (preview) return result;
    const inventoryOperationId = await this.move(
      tx,
      adminId,
      'correction',
      input.reason,
      deltas,
      id,
    );
    const retained = p.effectiveLines
      .filter((l) => !after.some((a) => a.skuId === l.skuId))
      .map((l) => ({
        ...l,
        quantity: 0,
        inventoryQuantity: '0',
        lineTotalMinor: '0',
      }));
    await tx
      .update(s.purchases)
      .set({
        effectiveLines: [...after, ...retained],
        effectiveSubtotalMinor: total(after),
        version: p.version + 1,
      })
      .where(eq(s.purchases.id, id));
    const event = await this.event(
      tx,
      id,
      adminId,
      'record_correction',
      input.reason,
      result,
    );
    return {
      correctionId: event.id,
      purchaseId: id,
      nextVersion: p.version + 1,
      inventoryOperationId,
      ...result,
    };
  }
  async returnItems(
    tx: Transaction,
    id: string,
    input: {
      expectedVersion: number;
      reason: string;
      lines: Array<{
        effectiveLineId: string;
        returnedQuantity: number;
        restockQuantity: number;
        disposition: string;
      }>;
    },
    adminId: string,
  ) {
    const p = await this.purchase(tx, id, input.expectedVersion);
    ensure(p.status === 'completed', 'INVALID_STATE');
    ensure(
      new Set(input.lines.map((l) => l.effectiveLineId)).size ===
        input.lines.length,
      'INVALID_LINES',
      422,
    );
    const previous = await tx
      .select()
      .from(s.returns)
      .where(eq(s.returns.purchaseId, id));
    const deltas = new Map<string, bigint>();
    for (const l of input.lines) {
      const sold = p.effectiveLines.find(
        (x) => x.effectiveLineId === l.effectiveLineId,
      );
      ensure(sold, 'INVALID_LINES', 422);
      const accumulated = previous
        .filter((x) => x.effectiveLineId === l.effectiveLineId)
        .reduce((n, x) => n + x.quantity, 0);
      ensure(
        accumulated + l.returnedQuantity <= sold.quantity,
        'RETURN_EXCEEDS_SALE',
      );
      ensure(l.restockQuantity <= l.returnedQuantity, 'INVALID_LINES', 422);
      ensure(
        (l.disposition === 'restock' &&
          l.restockQuantity === l.returnedQuantity) ||
          (l.disposition === 'discard' && l.restockQuantity === 0) ||
          (l.disposition === 'mixed' &&
            l.restockQuantity > 0 &&
            l.restockQuantity < l.returnedQuantity),
        'INVALID_DISPOSITION',
        422,
      );
      deltas.set(
        sold.skuId,
        BigInt(l.restockQuantity) * (sold.saleUnit === 'kg' ? 1000n : 1n),
      );
    }
    const event = await this.event(tx, id, adminId, 'return', input.reason, {
      lines: input.lines,
      snapshot: p.effectiveLines,
    });
    await tx.insert(s.returns).values(
      input.lines.map((l) => ({
        purchaseId: id,
        eventId: event.id,
        effectiveLineId: l.effectiveLineId,
        quantity: l.returnedQuantity,
        restockQuantity: l.restockQuantity,
      })),
    );
    await this.move(tx, adminId, 'return', input.reason, deltas, id);
    await tx
      .update(s.purchases)
      .set({ version: p.version + 1 })
      .where(eq(s.purchases.id, id));
    return { correctionId: event.id, nextVersion: p.version + 1 };
  }
  async listPurchases(status?: string, offset = 0) {
    return this.db
      .select()
      .from(s.purchases)
      .where(status ? eq(s.purchases.status, status) : undefined)
      .orderBy(desc(s.purchases.createdAt))
      .offset(offset)
      .limit(101);
  }
}

import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Transaction } from '../db/database.js';
import * as s from '../db/schema.js';
import type { productSales } from './validation.js';
import { ensure } from './errors.js';

// The caller locks the product. Retain SKU IDs so stock and historical sales survive edits.
export async function configureProductSales(
  tx: Transaction,
  productId: string,
  input: z.infer<typeof productSales>,
) {
  const rows = await tx
    .select()
    .from(s.skus)
    .where(eq(s.skus.productId, productId))
    .for('update');
  const units = rows.filter((row) => row.saleUnit === 'unit');
  ensure(units.length <= 1, 'PRODUCT_REQUIRES_SPLIT', 409);
  async function save(saleUnit: 'unit' | 'kg', price: string, active: boolean) {
    const existing = rows.find((row) => row.saleUnit === saleUnit);
    const data = {
      label: saleUnit === 'kg' ? 'Kilo suelto' : 'Bolsa / unidad',
      priceMinor: BigInt(price),
      active,
      netWeightGrams:
        saleUnit === 'unit' && input.bagWeightGrams
          ? BigInt(input.bagWeightGrams)
          : null,
    };
    if (existing) {
      const [updated] = await tx
        .update(s.skus)
        .set({ ...data, version: existing.version + 1 })
        .where(eq(s.skus.id, existing.id))
        .returning();
      return updated!;
    }
    for (;;) {
      const [created] = await tx
        .insert(s.skus)
        .values({
          ...data,
          saleUnit,
          productId,
          code: 'SP-' + randomUUID().replaceAll('-', '').toUpperCase(),
        })
        .onConflictDoNothing({ target: s.skus.code })
        .returning();
      if (!created) continue;
      await tx.insert(s.stocks).values({ skuId: created.id });
      return created;
    }
  }
  const unit = await save('unit', input.unitPriceMinor, true);
  const oldLoose = rows.find((row) => row.saleUnit === 'kg');
  if (input.looseEnabled) {
    const loose = await save('kg', input.kiloPriceMinor!, true);
    await tx
      .insert(s.bulkConfigs)
      .values({
        sourceSkuId: unit.id,
        targetSkuId: loose.id,
        gramsPerBag: BigInt(input.bagWeightGrams!),
        active: true,
      })
      .onConflictDoUpdate({
        target: [s.bulkConfigs.sourceSkuId, s.bulkConfigs.targetSkuId],
        set: {
          gramsPerBag: BigInt(input.bagWeightGrams!),
          active: true,
          version: sql`${s.bulkConfigs.version}+1`,
        },
      });
  } else if (oldLoose) {
    await tx
      .update(s.skus)
      .set({ active: false, version: oldLoose.version + 1 })
      .where(eq(s.skus.id, oldLoose.id));
    await tx
      .update(s.bulkConfigs)
      .set({ active: false, version: sql`${s.bulkConfigs.version}+1` })
      .where(
        and(
          eq(s.bulkConfigs.sourceSkuId, unit.id),
          eq(s.bulkConfigs.targetSkuId, oldLoose.id),
        ),
      );
  }
}

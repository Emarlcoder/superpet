import { z } from 'zod';
export const id = z.uuid();
export const version = z.number().int().positive().safe();
export const text = (max: number) =>
  z
    .string()
    .trim()
    .normalize()
    .min(1)
    .max(max)
    .refine(
      (v) =>
        [...v].every(
          (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
        ),
      'No se permiten caracteres de control',
    );
export const money = z.string().regex(/^(0|[1-9]\d{0,11})$/);
export const positiveMoney = money.refine(
  (v) => BigInt(v) > 0n && BigInt(v) <= 999999999n,
);
export const quantity = z.number().int().min(1).max(999);
export const deliveryMode = z.enum(['pickup', 'shipping']);
export const customer = z.strictObject({
  name: text(120),
  phone: z
    .string()
    .transform((v) => v.replace(/[ ()-]/g, ''))
    .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)),
});
export const items = z
  .array(z.strictObject({ skuId: id, quantity }))
  .min(1)
  .max(50);
export const quoteInput = z.strictObject({ items, deliveryMode });
export const purchaseInput = quoteInput.extend({ quoteId: id, customer });
export const productInput = z.strictObject({
  name: text(160),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  description: z.string().max(10000),
  categoryId: id,
  brandId: id.nullable(),
  species: z
    .array(z.enum(['dog', 'cat']))
    .min(1)
    .max(2)
    .refine((v) => new Set(v).size === v.length),
});
export const skuInput = z.strictObject({
  code: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  label: text(160),
  saleUnit: z.enum(['unit', 'kg']),
  priceMinor: positiveMoney,
  netWeightGrams: money.nullable(),
});
export const storeInput = z.strictObject({
  name: text(100),
  whatsappNumber: z.union([
    z.literal(''),
    z.string().regex(/^\+[1-9]\d{7,14}$/),
  ]),
  address: z.string().max(500),
  hours: z.string().max(1000),
  deliveryAreaText: text(1000),
  deliveryConditions: z.string().max(2000),
  expectedVersion: version,
});
export const correctionInput = z.strictObject({
  expectedVersion: version,
  reason: text(500),
  desiredLines: z
    .array(
      z.strictObject({ skuId: id, quantity, unitPriceMinor: positiveMoney }),
    )
    .max(50),
});
export const returnInput = z.strictObject({
  expectedVersion: version,
  reason: text(500),
  lines: z
    .array(
      z.strictObject({
        effectiveLineId: id,
        returnedQuantity: quantity,
        restockQuantity: z.number().int().min(0).max(999),
        disposition: z.enum(['restock', 'discard', 'mixed']),
      }),
    )
    .min(1)
    .max(50),
});
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connectDatabase } from '../dist/db/database.js';
import * as s from '../dist/db/schema.js';
import { Commerce } from '../dist/domain/commerce.js';
import { Auth, passwordHash, digest } from '../dist/domain/auth.js';
import { createApp } from '../dist/app.js';
import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
try {
  loadEnvFile('.env');
} catch {
  /* CI supplies TEST_DATABASE_URL. */
}
const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
describe.skipIf(!connectionString)(
  'PostgreSQL commercial invariants and HTTP security',
  () => {
    let management,
      connection,
      commerce,
      app,
      base,
      admin,
      sku,
      bulk,
      product,
      cookie,
      csrf;
    let mediaDir;
    const dbName = 'superpet_test_' + randomBytes(8).toString('hex');
    const origin = 'http://localhost:3000';
    const secret = randomBytes(32).toString('hex');
    const password = randomBytes(24).toString('base64url');
    const epoch = randomUUID();
    const command = (scope, body, fn, key = randomUUID()) =>
      commerce.mutate(scope, key, body, fn);
    const stock = async (id) =>
      (
        await connection.db
          .select()
          .from(s.stocks)
          .where(eq(s.stocks.skuId, id))
      )[0].quantity;
    async function manual(quantity = 1, id = sku) {
      return connection.db.transaction((tx) =>
        commerce.create(
          tx,
          { items: [{ skuId: id, quantity }], deliveryMode: 'pickup' },
          admin,
        ),
      );
    }
    async function request(
      path,
      body,
      headers = {},
      method = body ? 'POST' : 'GET',
    ) {
      const response = await fetch(base + '/api/v1' + path, {
        method,
        headers: {
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      return {
        status: response.status,
        body:
          response.status === 204
            ? null
            : response.headers.get('content-type')?.includes('application/json')
              ? await response.json()
              : await response.text(),
        headers: response.headers,
      };
    }
    beforeAll(async () => {
      mediaDir = await mkdtemp(join(tmpdir(), 'superpet-test-media-'));
      process.env.MEDIA_DIR = mediaDir;
      const url = new URL(connectionString);
      management = new Pool({ connectionString });
      await management.query('CREATE DATABASE ' + dbName);
      url.pathname = '/' + dbName;
      connection = connectDatabase(url.toString());
      await migrate(connection.db, { migrationsFolder: 'drizzle' });
      commerce = new Commerce(connection.db, epoch, secret);
      [admin] = (
        await connection.db
          .insert(s.admins)
          .values({
            username: 'test-admin',
            passwordHash: await passwordHash(password),
            email: 'test@example.invalid',
            emailVerified: true,
          })
          .returning()
      ).map((x) => x.id);
      const [category] = await connection.db
        .insert(s.taxonomies)
        .values({ kind: 'category', name: 'Test', slug: 'test' })
        .returning();
      [product] = (
        await connection.db
          .insert(s.products)
          .values({
            name: 'Test food',
            slug: 'test-food',
            categoryId: category.id,
            species: ['dog'],
            status: 'published',
          })
          .returning()
      ).map((x) => x.id);
      const variants = await connection.db
        .insert(s.skus)
        .values([
          {
            productId: product,
            code: 'BAG',
            label: 'Bolsa 10 kg',
            saleUnit: 'unit',
            priceMinor: 100000n,
            netWeightGrams: 10000n,
          },
          {
            productId: product,
            code: 'BULK',
            label: 'Suelto',
            saleUnit: 'kg',
            priceMinor: 15000n,
          },
        ])
        .returning();
      sku = variants.find((x) => x.code === 'BAG').id;
      bulk = variants.find((x) => x.code === 'BULK').id;
      await connection.db.insert(s.stocks).values([
        { skuId: sku, quantity: 10n },
        { skuId: bulk, quantity: 2800n },
      ]);
      await connection.db.insert(s.store).values({
        id: 1,
        data: {
          name: 'Test',
          whatsappNumber: '+59899000000',
          address: '',
          hours: '',
          deliveryAreaText: 'Test',
          deliveryConditions: '',
        },
      });
      app = await createApp({
        host: '127.0.0.1',
        port: 0,
        webOrigin: origin,
        databaseUrl: url.toString(),
        secret,
        operationEpoch: epoch,
      });
      await app.listen(0, '127.0.0.1');
      base = await app.getUrl();
    }, 30000);
    afterAll(async () => {
      await app?.close();
      await connection?.pool.end();
      // Only the fresh randomly named test database created above is removed.
      if (management) {
        await management.query(
          'DROP DATABASE IF EXISTS ' + dbName + ' WITH (FORCE)',
        );
        await management.end();
      }
      if (
        mediaDir &&
        mediaDir.startsWith(join(tmpdir(), 'superpet-test-media-'))
      )
        await rm(mediaDir, { recursive: true, force: true });
    });
    it('protects admin routes, rejects foreign origins and rotates the pre-session', async () => {
      expect((await request('/admin/products')).status).toBe(401);
      expect(
        (
          await request('/auth/csrf', undefined, {
            Origin: 'https://foreign.invalid',
          })
        ).status,
      ).toBe(403);
      const pre = await request('/auth/csrf');
      csrf = pre.body.csrfToken;
      const prior = cookie;
      expect(
        (
          await request(
            '/auth/login',
            { username: 'test-admin', password },
            { 'X-CSRF-Token': 'bad' },
          )
        ).status,
      ).toBe(403);
      const login = await request(
        '/auth/login',
        { username: 'test-admin', password },
        { 'X-CSRF-Token': csrf },
      );
      expect(login.status, JSON.stringify(login.body)).toBe(200);
      expect(cookie).not.toBe(prior);
      csrf = login.body.csrfToken;
      expect((await request('/auth/me')).body.operationEpoch).toBe(epoch);
      expect((await request('/admin/products')).status).toBe(200);
      expect(
        (await request('/admin/products', {}, { 'X-CSRF-Token': csrf }, 'POST'))
          .status,
      ).toBe(422);
    });
    it('generates distinct URLs concurrently, replays creation and preserves URLs on rename', async () => {
      const [existing] = await connection.db
        .select()
        .from(s.products)
        .where(eq(s.products.id, product));
      const input = {
        name: 'Aliménto automático',
        description: '',
        categoryId: existing.categoryId,
        brandId: null,
        species: ['cat'],
      };
      const headers = () => ({
        'X-CSRF-Token': csrf,
        'Idempotency-Key': randomUUID(),
        'X-Operation-Epoch': epoch,
      });
      const firstHeaders = headers();
      const results = await Promise.all([
        request('/admin/products', input, firstHeaders),
        request('/admin/products', input, headers()),
      ]);
      expect(results.map((r) => r.status)).toEqual([201, 201]);
      expect(results.map((r) => r.body.slug).sort()).toEqual([
        'alimento-automatico',
        'alimento-automatico-2',
      ]);
      const replay = await request('/admin/products', input, firstHeaders);
      expect(replay.body.id).toBe(results[0].body.id);
      const edited = await request(
        '/admin/products/' + results[0].body.id,
        {
          ...input,
          name: 'Nombre nuevo',
          expectedVersion: results[0].body.version,
        },
        headers(),
        'PATCH',
      );
      expect(edited.status).toBe(200);
      expect(edited.body.slug).toBe(results[0].body.slug);
    });
    it('expired anonymous presessions still cannot log in', async () => {
      const raw = randomBytes(32).toString('base64url');
      const expiredCsrf = randomBytes(32).toString('base64url');
      await connection.db.insert(s.sessions).values({
        tokenHash: digest(raw),
        csrf: expiredCsrf,
        expiresAt: new Date(0),
      });
      const response = await request(
        '/auth/login',
        { username: 'test-admin', password },
        { Cookie: 'superpet_session=' + raw, 'X-CSRF-Token': expiredCsrf },
      );
      expect(response.status).toBe(401);
      expect((await request('/auth/me')).status).toBe(200);
    });
    it('bulk quantities consolidate and floor grams without promising 3kg from 2800g', async () => {
      const catalog = await commerce.catalog();
      expect(catalog[0].skus.find((x) => x.id === bulk).maxSelectable).toBe(2);
      await expect(
        commerce.quote({
          items: [{ skuId: bulk, quantity: 3 }],
          deliveryMode: 'pickup',
        }),
      ).rejects.toMatchObject({ code: 'STOCK_INSUFFICIENT' });
      await expect(
        commerce.quote({
          items: [
            { skuId: bulk, quantity: 3 },
            { skuId: bulk, quantity: 3 },
          ],
          deliveryMode: 'pickup',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
      await expect(
        commerce.quote({
          items: [{ skuId: bulk, quantity: 1.5 }],
          deliveryMode: 'pickup',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
    });
    it('uploads real WebP derivatives once, rejects invalid images and protects private originals', async () => {
      const bytes = await sharp({
        create: { width: 350, height: 400, channels: 4, background: '#c7050e' },
      })
        .png()
        .toBuffer();
      const key = randomUUID();
      async function upload(buffer = bytes) {
        const form = new FormData();
        form.set('alt', 'Envase de prueba');
        form.set('expectedVersion', '1');
        form.set('file', new Blob([buffer], { type: 'image/png' }), 'test.png');
        const response = await fetch(
          base + '/api/v1/admin/products/' + product + '/images',
          {
            method: 'POST',
            headers: {
              Origin: origin,
              Cookie: cookie,
              'X-CSRF-Token': csrf,
              'X-Operation-Epoch': epoch,
              'Idempotency-Key': key,
            },
            body: form,
          },
        );
        return { status: response.status, body: await response.json() };
      }
      expect((await upload(Buffer.from('not an image'))).status).toBe(422);
      const first = await upload();
      expect(first.status, JSON.stringify(first.body)).toBe(201);
      expect(first.body.variants).toHaveLength(3);
      expect((await upload()).body).toEqual(first.body);
      expect(
        await connection.db
          .select()
          .from(s.images)
          .where(eq(s.images.productId, product)),
      ).toHaveLength(1);
      const derivative = await fetch(
        base + '/api/v1/media/' + first.body.variants[0].key,
      );
      expect(derivative.status).toBe(200);
      expect(derivative.headers.get('content-type')).toContain('image/webp');
      const [image] = await connection.db
        .select()
        .from(s.images)
        .where(eq(s.images.productId, product));
      expect(
        (await fetch(base + '/api/v1/media/' + image.originalKey)).status,
      ).toBe(404);
      const forbidden = await request(
        '/admin/products/' + product + '/images/' + image.id,
        { expectedVersion: 2 },
        {
          'X-CSRF-Token': csrf,
          'X-Operation-Epoch': epoch,
          'Idempotency-Key': randomUUID(),
        },
        'DELETE',
      );
      expect(forbidden.body.code).toBe('LAST_PUBLISHED_IMAGE');
    });
    it('creates pending before WhatsApp, never reserves, and replays after quote expiration', async () => {
      const quote = await commerce.quote({
        items: [{ skuId: sku, quantity: 1 }],
        deliveryMode: 'shipping',
      });
      const payload = {
        quoteId: quote.quoteId,
        items: [{ skuId: sku, quantity: 1 }],
        deliveryMode: 'shipping',
        customer: { name: 'Test customer', phone: '+59899000000' },
      };
      const key = randomUUID(),
        headers = { 'Idempotency-Key': key, 'X-Operation-Epoch': epoch };
      const before = await stock(sku);
      const first = await request('/purchases', payload, headers);
      expect(first.status).toBe(201);
      expect(first.body.creationStatus).toBe('pending');
      expect(await stock(sku)).toBe(before);
      await connection.db
        .update(s.quotes)
        .set({ expiresAt: new Date(0) })
        .where(eq(s.quotes.id, quote.quoteId));
      const replay = await request('/purchases', payload, headers);
      expect(replay.body).toEqual(first.body);
      expect(replay.headers.get('Idempotency-Replayed')).toBe('true');
      expect(
        (
          await request(
            '/purchases',
            { ...payload, deliveryMode: 'pickup' },
            headers,
          )
        ).body.code,
      ).toBe('IDEMPOTENCY_CONFLICT');
      expect(
        (
          await request('/purchases', payload, {
            ...headers,
            'X-Operation-Epoch': 'old',
          })
        ).body.code,
      ).toBe('RECOVERY_REVIEW_REQUIRED');
    });
    it('serializes simultaneous confirmation, deducting once with one receipt', async () => {
      const purchase = await manual(2),
        before = await stock(sku),
        key = randomUUID(),
        body = { expectedVersion: 1 };
      const call = () =>
        command(
          'complete:' + purchase.id,
          body,
          (tx) => commerce.transition(tx, purchase.id, 1, admin, 'complete'),
          key,
        );
      const results = await Promise.all([call(), call()]);
      expect(results.every((x) => x.status === 200)).toBe(true);
      expect(results.filter((x) => x.replayed)).toHaveLength(1);
      expect(await stock(sku)).toBe(before - 2n);
      expect(
        (
          await command('complete:' + purchase.id, body, (tx) =>
            commerce.transition(tx, purchase.id, 1, admin, 'complete'),
          )
        ).body.code,
      ).toBe('VERSION_CONFLICT');
    });
    it('rolls back all lines on stock failure and cancellation leaves stock unchanged', async () => {
      const before = await stock(sku),
        p = await manual(999);
      const result = await command('complete:' + p.id, {}, (tx) =>
        commerce.transition(tx, p.id, 1, admin, 'complete'),
      );
      expect(result.body.code).toBe('STOCK_INSUFFICIENT');
      expect(await stock(sku)).toBe(before);
      const [row] = await connection.db
        .select()
        .from(s.purchases)
        .where(eq(s.purchases.id, p.id));
      expect(row.status).toBe('pending');
      await command('cancel:' + p.id, {}, (tx) =>
        commerce.transition(tx, p.id, 1, admin, 'cancel', 'Sin stock'),
      );
      expect(await stock(sku)).toBe(before);
      const bulkBefore = await stock(bulk);
      const failed = await command('atomic-fail', {}, (tx) =>
        commerce.move(
          tx,
          admin,
          'test',
          'test',
          new Map([
            [sku, 1n],
            [bulk, -99999999n],
          ]),
        ),
      );
      expect(failed.status).toBe(409);
      expect(await stock(sku)).toBe(before);
      expect(await stock(bulk)).toBe(bulkBefore);
    });
    it('opening a bag transfers inventory atomically and replays safely', async () => {
      const before = await stock(sku),
        beforeBulk = await stock(bulk),
        key = randomUUID();
      const run = () =>
        command(
          'opening',
          {},
          (tx) =>
            commerce.move(
              tx,
              admin,
              'bag_opening',
              'Test',
              new Map([
                [sku, -1n],
                [bulk, 10000n],
              ]),
            ),
          key,
        );
      await run();
      await run();
      expect(await stock(sku)).toBe(before - 1n);
      expect(await stock(bulk)).toBe(beforeBulk + 10000n);
    });
    it('corrections retain original snapshots; returns use effective quantities', async () => {
      const p = await manual(2);
      await command('complete:' + p.id, {}, (tx) =>
        commerce.transition(tx, p.id, 1, admin, 'complete'),
      );
      const before = await stock(sku);
      const price = {
        expectedVersion: 2,
        reason: 'Precio mal registrado',
        desiredLines: [{ skuId: sku, quantity: 2, unitPriceMinor: '90000' }],
      };
      expect(
        (
          await command('price:' + p.id, price, (tx) =>
            commerce.correction(tx, p.id, price, admin),
          )
        ).status,
      ).toBe(200);
      expect(await stock(sku)).toBe(before);
      const quantity = {
        ...price,
        expectedVersion: 3,
        desiredLines: [{ skuId: sku, quantity: 1, unitPriceMinor: '90000' }],
      };
      const preview = await connection.db.transaction((tx) =>
        commerce.correction(tx, p.id, quantity, admin, true),
      );
      expect(preview.stockDeltas[0].delta).toBe('1');
      expect(await stock(sku)).toBe(before);
      await command('qty:' + p.id, quantity, (tx) =>
        commerce.correction(tx, p.id, quantity, admin),
      );
      expect(await stock(sku)).toBe(before + 1n);
      const [changed] = await connection.db
        .select()
        .from(s.purchases)
        .where(eq(s.purchases.id, p.id));
      expect(changed.lines[0].quantity).toBe(2);
      expect(changed.lines[0].unitPriceMinor).toBe('100000');
      const returned = {
        expectedVersion: 4,
        reason: 'Devolución',
        lines: [
          {
            effectiveLineId: changed.effectiveLines[0].effectiveLineId,
            returnedQuantity: 1,
            restockQuantity: 0,
            disposition: 'discard',
          },
        ],
      };
      await command('return:' + p.id, returned, (tx) =>
        commerce.returnItems(tx, p.id, returned, admin),
      );
      expect(await stock(sku)).toBe(before + 1n);
      const again = { ...returned, expectedVersion: 5 };
      expect(
        (
          await command('return:' + p.id, again, (tx) =>
            commerce.returnItems(tx, p.id, again, admin),
          )
        ).body.code,
      ).toBe('RETURN_EXCEEDS_SALE');
      const forbidden = { ...quantity, expectedVersion: 5, desiredLines: [] };
      expect(
        (
          await command('correct:' + p.id, forbidden, (tx) =>
            commerce.correction(tx, p.id, forbidden, admin),
          )
        ).body.code,
      ).toBe('CORRECTION_AFTER_RETURN');
    });
    it('two different purchases cannot both consume the last unit', async () => {
      const [last] = await connection.db
        .insert(s.skus)
        .values({
          productId: product,
          code: 'LAST-UNIT',
          label: 'Última unidad',
          saleUnit: 'unit',
          priceMinor: 100n,
        })
        .returning();
      await connection.db
        .insert(s.stocks)
        .values({ skuId: last.id, quantity: 1n });
      const orders = await Promise.all([
        manual(1, last.id),
        manual(1, last.id),
      ]);
      const results = await Promise.all(
        orders.map((p) =>
          command('last-unit:' + p.id, {}, (tx) =>
            commerce.transition(tx, p.id, 1, admin, 'complete'),
          ),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(results.find((r) => r.status === 409).body.code).toBe(
        'STOCK_INSUFFICIENT',
      );
      expect(await stock(last.id)).toBe(0n);
      const statuses = await Promise.all(
        orders.map(
          async (p) =>
            (
              await connection.db
                .select()
                .from(s.purchases)
                .where(eq(s.purchases.id, p.id))
            )[0].status,
        ),
      );
      expect(statuses.sort()).toEqual(['completed', 'pending']);
      expect(
        await connection.db
          .select()
          .from(s.movements)
          .where(eq(s.movements.skuId, last.id)),
      ).toHaveLength(1);
    });
    it('rejects client prices and missing contacts without creating purchases', async () => {
      const before = (await connection.db.select().from(s.purchases)).length;
      const quote = await commerce.quote({
        items: [{ skuId: sku, quantity: 1 }],
        deliveryMode: 'pickup',
      });
      const payload = {
        quoteId: quote.quoteId,
        items: [{ skuId: sku, quantity: 1 }],
        deliveryMode: 'pickup',
      };
      const headers = {
        'Idempotency-Key': randomUUID(),
        'X-Operation-Epoch': epoch,
      };
      expect((await request('/purchases', payload, headers)).status).toBe(422);
      expect(
        (
          await request(
            '/purchases',
            {
              ...payload,
              customer: { name: 'Test', phone: '+59899000000' },
              unitPriceMinor: '1',
            },
            headers,
          )
        ).status,
      ).toBe(422);
      expect(
        (
          await request('/cart/quote', {
            items: [{ skuId: sku, quantity: 1, unitPriceMinor: '1' }],
            deliveryMode: 'pickup',
          })
        ).status,
      ).toBe(422);
      expect((await connection.db.select().from(s.purchases)).length).toBe(
        before,
      );
    });
    it('does not expose purchase data publicly or allow unauthenticated mutations', async () => {
      const p = await manual();
      const before = await stock(sku);
      for (const path of ['/admin/purchases', '/admin/purchases/' + p.id]) {
        const response = await request(path, undefined, { Cookie: '' });
        expect(response.status).toBe(401);
        expect(JSON.stringify(response.body)).not.toContain(p.reference);
      }
      expect(
        (await request('/purchases/' + p.reference, undefined, { Cookie: '' }))
          .status,
      ).toBe(404);
      expect(
        (
          await request(
            '/admin/purchases/' + p.id + '/complete',
            { expectedVersion: 1 },
            {
              Cookie: '',
              'Idempotency-Key': randomUUID(),
              'X-Operation-Epoch': epoch,
            },
          )
        ).status,
      ).toBe(401);
      expect(await stock(sku)).toBe(before);
    });
    it('authenticated sessions survive inactivity and former time limits', async () => {
      const [session] = await connection.db
        .select()
        .from(s.sessions)
        .where(eq(s.sessions.adminId, admin));
      const idle = new Date(Date.now() - 10 * 60000);
      try {
        await connection.db
          .update(s.sessions)
          .set({ lastActivityAt: idle })
          .where(eq(s.sessions.id, session.id));
        expect((await request('/auth/me')).status).toBe(200);
        const [after] = await connection.db
          .select()
          .from(s.sessions)
          .where(eq(s.sessions.id, session.id));
        expect(after.lastActivityAt.getTime()).toBe(idle.getTime());
        await connection.db
          .update(s.sessions)
          .set({ lastActivityAt: new Date(Date.now() - 31 * 60000) })
          .where(eq(s.sessions.id, session.id));
        expect((await request('/admin/products')).status).toBe(200);
        await connection.db
          .update(s.sessions)
          .set({ lastActivityAt: new Date(), expiresAt: new Date(0) })
          .where(eq(s.sessions.id, session.id));
        expect((await request('/admin/products')).status).toBe(200);
      } finally {
        await connection.db
          .update(s.sessions)
          .set({ lastActivityAt: new Date(), expiresAt: session.expiresAt })
          .where(eq(s.sessions.id, session.id));
      }
    });
    it('accepts bulk endpoints 1 and 5 kg and rejects zero, negatives and 6 kg', async () => {
      for (const quantity of [1, 5]) {
        const result = await request('/cart/quote', {
          items: [{ skuId: bulk, quantity }],
          deliveryMode: 'pickup',
        });
        expect(result.status).toBe(200);
        expect(result.body.lines[0].quantity).toBe(quantity);
      }
      for (const quantity of [0, -1, 1.5, 6]) {
        const result = await request('/cart/quote', {
          items: [{ skuId: bulk, quantity }],
          deliveryMode: 'pickup',
        });
        expect(result.status).toBe(422);
      }
    });
    it('rejects a stale quoted price before creating a pending purchase', async () => {
      const [variant] = await connection.db
        .select()
        .from(s.skus)
        .where(eq(s.skus.id, sku));
      const quote = await commerce.quote({
        items: [{ skuId: sku, quantity: 1 }],
        deliveryMode: 'pickup',
      });
      const before = (await connection.db.select().from(s.purchases)).length;
      try {
        await connection.db
          .update(s.skus)
          .set({ priceMinor: variant.priceMinor + 100n })
          .where(eq(s.skus.id, sku));
        const result = await request(
          '/purchases',
          {
            quoteId: quote.quoteId,
            items: [{ skuId: sku, quantity: 1 }],
            deliveryMode: 'pickup',
            customer: { name: 'Test', phone: '+59899000000' },
          },
          { 'Idempotency-Key': randomUUID(), 'X-Operation-Epoch': epoch },
        );
        expect(result.status).toBe(409);
        expect(result.body.code).toBe('PRICE_CHANGED');
        expect((await connection.db.select().from(s.purchases)).length).toBe(
          before,
        );
      } finally {
        await connection.db
          .update(s.skus)
          .set({ priceMinor: variant.priceMinor })
          .where(eq(s.skus.id, sku));
      }
    });
    it('concurrent pending edits keep one version and cancellation never moves stock', async () => {
      const p = await manual();
      const before = await stock(sku);
      const headers = () => ({
        'X-CSRF-Token': csrf,
        'X-Operation-Epoch': epoch,
        'Idempotency-Key': randomUUID(),
      });
      const edits = [2, 3].map((quantity) => ({
        expectedVersion: 1,
        items: [{ skuId: sku, quantity }],
        deliveryMode: 'shipping',
        shippingMinor: null,
        notes: 'Test edit ' + quantity,
      }));
      const results = await Promise.all(
        edits.map((body) =>
          request('/admin/purchases/' + p.id, body, headers(), 'PATCH'),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(results.find((r) => r.status === 409).body.code).toBe(
        'VERSION_CONFLICT',
      );
      const winner = results.find((r) => r.status === 200).body;
      const current = (await request('/admin/purchases/' + p.id)).body;
      expect(current.version).toBe(2);
      expect(current.lines).toEqual(winner.lines);
      expect(current.shippingMinor).toBeNull();
      expect(await stock(sku)).toBe(before);
      const cancellation = {
        expectedVersion: 2,
        reason: 'Prueba de cancelación',
      };
      const cancelHeaders = headers();
      const cancelled = await request(
        '/admin/purchases/' + p.id + '/cancel',
        cancellation,
        cancelHeaders,
      );
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.status).toBe('cancelled');
      const replay = await request(
        '/admin/purchases/' + p.id + '/cancel',
        cancellation,
        cancelHeaders,
      );
      expect(replay.body).toEqual(cancelled.body);
      expect(replay.headers.get('Idempotency-Replayed')).toBe('true');
      const complete = await request(
        '/admin/purchases/' + p.id + '/complete',
        { expectedVersion: 3 },
        headers(),
      );
      expect(complete.body.code).toBe('INVALID_STATE');
      expect(await stock(sku)).toBe(before);
      expect(
        await connection.db
          .select()
          .from(s.movements)
          .innerJoin(s.operations, eq(s.operations.id, s.movements.operationId))
          .where(eq(s.operations.purchaseId, p.id)),
      ).toHaveLength(0);
    });
    it('a valid login alone cannot mutate without CSRF or the current operation epoch', async () => {
      const p = await manual();
      const before = await stock(sku);
      const path = '/admin/purchases/' + p.id + '/complete';
      const body = { expectedVersion: 1 };
      expect(
        (
          await request(path, body, {
            'Idempotency-Key': randomUUID(),
            'X-Operation-Epoch': epoch,
          })
        ).status,
      ).toBe(403);
      const stale = await request(path, body, {
        'Idempotency-Key': randomUUID(),
        'X-CSRF-Token': csrf,
        'X-Operation-Epoch': randomUUID(),
      });
      expect(stale.body.code).toBe('RECOVERY_REVIEW_REQUIRED');
      expect((await request('/admin/purchases/' + p.id)).body.status).toBe(
        'pending',
      );
      expect(await stock(sku)).toBe(before);
    });
    it('expired receipts remain tombstones, preventing recreation', async () => {
      const key = randomUUID();
      let calls = 0;
      const run = () =>
        command(
          'expired',
          {},
          async () => {
            calls++;
            return { ok: true };
          },
          key,
        );
      await run();
      await connection.db.execute(
        sql`update attempts set expires_at=now()-interval '1 day' where scope='expired'`,
      );
      expect((await run()).body.code).toBe('IDEMPOTENCY_EXPIRED');
      expect(calls).toBe(1);
    });
    it('verifies a new recovery email only on POST and invalidates older links', async () => {
      let sent;
      const auth = new Auth(
        connection.db,
        origin,
        secret,
        false,
        async (message) => {
          sent = message;
          return { status: 'accepted' };
        },
      );
      await auth.deliver(admin, 'verify', 'new@example.invalid');
      const [before] = await connection.db
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, admin));
      expect(before.email).toBe('test@example.invalid');
      const raw = sent.text.split('#')[1].split('\n')[0];
      const verified = await request(
        '/auth/email/verify',
        { token: raw },
        { 'X-CSRF-Token': csrf },
      );
      expect(verified.status).toBe(200);
      const [after] = await connection.db
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, admin));
      expect(after.email).toBe('new@example.invalid');
      expect(
        (
          await request(
            '/auth/email/verify',
            { token: raw },
            { 'X-CSRF-Token': csrf },
          )
        ).body.code,
      ).toBe('EMAIL_TOKEN_INVALID');
    });
    it('reset tokens are single-use and invalidate existing sessions', async () => {
      const auth = new Auth(connection.db, origin, secret, false);
      const { raw } = await auth.issue(admin, 'reset');
      const oldCookie = cookie;
      csrf = (await request('/auth/csrf')).body.csrfToken;
      const body = {
        token: raw,
        newPassword: randomBytes(24).toString('base64url'),
      };
      expect(
        (await request('/auth/password/reset', body, { 'X-CSRF-Token': csrf }))
          .status,
      ).toBe(200);
      expect(
        (await request('/auth/me', undefined, { Cookie: oldCookie })).status,
      ).toBe(401);
      expect(
        (await request('/auth/password/reset', body, { 'X-CSRF-Token': csrf }))
          .body.code,
      ).toBe('RESET_TOKEN_INVALID');
    });
  },
);

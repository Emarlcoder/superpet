import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Req,
  Res,
  Inject,
  HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Commerce } from '../domain/commerce.js';
import { Auth } from '../domain/auth.js';
import { ensure, json } from '../domain/errors.js';
import * as v from '../domain/validation.js';
import * as s from '../db/schema.js';
import type { Transaction } from '../db/database.js';
import { productSlug } from '../domain/product-slug.js';
import { randomUUID } from 'node:crypto';
import { configureProductSales } from '../domain/product-sales.js';

@Controller()
export class CommerceController {
  constructor(
    @Inject(Commerce) private c: Commerce,
    @Inject(Auth) private auth: Auth,
  ) {}
  private async command(
    req: Request,
    res: Response,
    action: string,
    body: unknown,
    fn: (tx: Transaction, adminId: string) => Promise<unknown>,
    admin = true,
    created = false,
  ) {
    this.auth.requireOrigin(req);
    const principal = admin ? await this.auth.session(req, true, true) : null;
    ensure(
      req.header('X-Operation-Epoch') === this.c.epoch,
      'RECOVERY_REVIEW_REQUIRED',
    );
    const key = req.header('Idempotency-Key') ?? '';
    await this.auth.limit(
      (admin ? 'admin:' : 'public:') + req.ip,
      admin ? 120 : 30,
      60,
    );
    const result = await this.c.mutate(
      action + ':' + (principal?.adminId ?? 'public'),
      key,
      body,
      (tx) => fn(tx, principal?.adminId ?? ''),
    );
    res.setHeader('Idempotency-Replayed', String(result.replayed));
    res.status(result.status === 200 && created ? 201 : result.status);
    return json(result.body);
  }
  @Get('store') async store() {
    return this.c.publicStore();
  }
  @Get('products') async products(@Query() query: Record<string, string>) {
    const q = z
      .strictObject({
        q: z.string().max(100).optional(),
        species: z.enum(['dog', 'cat']).optional(),
        category: v.id.optional(),
        brand: v.id.optional(),
        sort: z.enum(['name_asc', 'price_asc', 'price_desc']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().max(2048).optional(),
      })
      .parse(query);
    return this.c.catalogPage(q);
  }
  @Get('products/:slug') async product(@Param('slug') slug: string) {
    return this.c.catalogProduct(slug);
  }
  @Get('catalog/filters') async filters() {
    const rows = await this.c.db
      .select()
      .from(s.taxonomies)
      .where(eq(s.taxonomies.active, true));
    return {
      species: [
        { code: 'dog', name: 'Perros' },
        { code: 'cat', name: 'Gatos' },
      ],
      categories: rows.filter((x) => x.kind === 'category'),
      brands: rows.filter((x) => x.kind === 'brand'),
    };
  }
  @Post('cart/quote') @HttpCode(200) async quote(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    this.auth.requireOrigin(req);
    await this.auth.limit('quote:' + req.ip, 30, 60);
    return this.c.quote(v.parse(v.quoteInput, body));
  }
  @Post('purchases') async purchase(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = v.parse(v.purchaseInput, body);
    return this.command(
      req,
      res,
      'purchase.create',
      input,
      (tx) => this.c.create(tx, input),
      false,
      true,
    );
  }
  @Get('auth/csrf') csrf(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.preSession(req, res);
  }
  @Post('auth/csrf') @HttpCode(200) createPreSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.preSession(req, res);
  }
  @Post('auth/login') @HttpCode(200) login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        username: v.text(120),
        password: z.string().min(1).max(512),
      })
      .parse(body);
    return this.auth.login(req, res, input.username, input.password);
  }
  @Get('auth/me') async me(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const p = await this.auth.session(req);
    this.auth.refreshSessionCookie(req, res);
    const [admin] = await this.c.db
      .select({ username: s.admins.username })
      .from(s.admins)
      .where(eq(s.admins.id, p.adminId));
    return {
      id: p.adminId,
      username: admin!.username,
      csrfToken: p.csrf,
      expiresAt: p.expiresAt,
      lastActivityAt: p.lastActivityAt,
      operationEpoch: this.c.epoch,
    };
  }
  @Post('auth/email/verify') @HttpCode(200) verifyEmail(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.auth.verifyEmail(
      req,
      z.strictObject({ token: z.string().min(32).max(100) }).parse(body).token,
    );
  }
  @Post('auth/keepalive') @HttpCode(200) async keepalive(@Req() req: Request) {
    await this.auth.session(req, true, true);
    return { active: true };
  }
  @Post('auth/logout') @HttpCode(204) logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }
  @Post('auth/password/change') @HttpCode(200) change(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        currentPassword: z.string().max(512),
        newPassword: z.string().max(512),
      })
      .parse(body);
    return this.auth.change(req, input.currentPassword, input.newPassword);
  }
  @Post('auth/password/forgot') @HttpCode(202) forgot(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.auth.forgot(
      req,
      z.strictObject({ username: v.text(120) }).parse(body).username,
    );
  }
  @Post('auth/password/reset') @HttpCode(200) reset(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        token: z.string().min(32).max(100),
        newPassword: z.string().max(512),
      })
      .parse(body);
    return this.auth.reset(req, input.token, input.newPassword);
  }

  @Get('admin/products') async adminProducts(@Req() req: Request) {
    await this.auth.session(req);
    return { items: await this.c.catalog(true) };
  }
  @Post('admin/products') createProduct(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = v.productInput.parse(body);
    return this.command(
      req,
      res,
      'product.create',
      input,
      async (tx) => {
        const { sales, ...data } = input;
        await this.validateTaxonomy(tx, input.categoryId, input.brandId);
        if (input.slug) {
          const [p] = await tx
            .insert(s.products)
            .values({ ...data, slug: input.slug })
            .returning();
          if (sales) await configureProductSales(tx, p!.id, sales);
          return p;
        }
        for (let sequence = 1; ; sequence++) {
          const [p] = await tx
            .insert(s.products)
            .values({ ...data, slug: productSlug(input.name, sequence) })
            .onConflictDoNothing({ target: s.products.slug })
            .returning();
          if (p) {
            if (sales) await configureProductSales(tx, p.id, sales);
            return p;
          }
        }
      },
      true,
      true,
    );
  }
  private async validateTaxonomy(
    tx: Transaction,
    categoryId: string,
    brandId: string | null,
  ) {
    const [category] = await tx
      .select()
      .from(s.taxonomies)
      .where(eq(s.taxonomies.id, categoryId))
      .for('share');
    ensure(
      category?.kind === 'category' && category.active,
      'INVALID_CATEGORY',
      422,
    );
    if (brandId) {
      const [brand] = await tx
        .select()
        .from(s.taxonomies)
        .where(eq(s.taxonomies.id, brandId))
        .for('share');
      ensure(brand?.kind === 'brand' && brand.active, 'INVALID_BRAND', 422);
    }
  }
  @Patch('admin/products/:id') editProduct(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = v.productInput
      .extend({ expectedVersion: v.version })
      .parse(body);
    return this.command(req, res, 'product.edit:' + id, input, async (tx) => {
      await this.validateTaxonomy(tx, input.categoryId, input.brandId);
      const { expectedVersion, sales, ...data } = input;
      const [p] = await tx
        .update(s.products)
        .set({ ...data, version: expectedVersion + 1 })
        .where(
          and(eq(s.products.id, id), eq(s.products.version, expectedVersion)),
        )
        .returning();
      ensure(p, 'VERSION_CONFLICT');
      if (sales) await configureProductSales(tx, p.id, sales);
      return p;
    });
  }
  @Post([
    'admin/products/:id/publish',
    'admin/products/:id/archive',
    'admin/products/:id/draft',
  ])
  productAction(
    @Param('id') id: string,
    @Param('action') action: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const pathParts = req.path.split('/');
    action = pathParts[pathParts.length - 1]!;
    z.enum(['publish', 'archive', 'draft']).parse(action);
    const input = z.strictObject({ expectedVersion: v.version }).parse(body);
    return this.command(
      req,
      res,
      'product.' + action + ':' + id,
      input,
      async (tx) => {
        const [p] = await tx
          .select()
          .from(s.products)
          .where(eq(s.products.id, id))
          .for('update');
        ensure(p && p.version === input.expectedVersion, 'VERSION_CONFLICT');
        if (action === 'publish') {
          const [sku] = await tx
            .select()
            .from(s.skus)
            .where(and(eq(s.skus.productId, id), eq(s.skus.active, true)));
          const [image] = await tx
            .select()
            .from(s.images)
            .where(eq(s.images.productId, id));
          ensure(sku && image, 'PRODUCT_INCOMPLETE', 422);
          await this.validateTaxonomy(tx, p.categoryId, p.brandId);
        }
        const [updated] = await tx
          .update(s.products)
          .set({
            status:
              action === 'publish'
                ? 'published'
                : action === 'archive'
                  ? 'archived'
                  : 'draft',
            version: p.version + 1,
          })
          .where(eq(s.products.id, id))
          .returning();
        return updated;
      },
    );
  }
  @Post('admin/products/:id/skus') sku(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = v.skuInput.parse(body);
    return this.command(
      req,
      res,
      'sku.create:' + id,
      input,
      async (tx) => {
        for (;;) {
          const [sku] = await tx
            .insert(s.skus)
            .values({
              ...input,
              code:
                input.code ??
                'SP-' + randomUUID().replaceAll('-', '').toUpperCase(),
              productId: id,
              priceMinor: BigInt(input.priceMinor),
              netWeightGrams: input.netWeightGrams
                ? BigInt(input.netWeightGrams)
                : null,
            })
            .onConflictDoNothing({ target: s.skus.code })
            .returning();
          if (!sku) {
            ensure(!input.code, 'ALREADY_EXISTS', 409);
            continue;
          }
          await tx.insert(s.stocks).values({ skuId: sku!.id });
          return sku;
        }
      },
      true,
      true,
    );
  }
  @Patch('admin/skus/:id') editSku(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z
      .strictObject({
        label: v.text(160),
        priceMinor: v.positiveMoney,
        active: z.boolean(),
        expectedVersion: v.version,
      })
      .parse(body);
    return this.command(req, res, 'sku.edit:' + id, input, async (tx) => {
      const [prior] = await tx.select().from(s.skus).where(eq(s.skus.id, id));
      ensure(prior, 'NOT_FOUND', 404);
      const [product] = await tx
        .select()
        .from(s.products)
        .where(eq(s.products.id, prior.productId))
        .for('update');
      if (!input.active && product?.status === 'published') {
        const active = await tx
          .select()
          .from(s.skus)
          .where(
            and(
              eq(s.skus.productId, prior.productId),
              eq(s.skus.active, true),
              sql`${s.skus.id}<>${id}`,
            ),
          );
        ensure(active.length, 'PRODUCT_INCOMPLETE', 422);
      }
      const [sku] = await tx
        .update(s.skus)
        .set({
          label: input.label,
          priceMinor: BigInt(input.priceMinor),
          active: input.active,
          version: input.expectedVersion + 1,
        })
        .where(
          and(eq(s.skus.id, id), eq(s.skus.version, input.expectedVersion)),
        )
        .returning();
      ensure(sku, 'VERSION_CONFLICT');
      return sku;
    });
  }
  @Get('admin/taxonomies') async taxonomies(@Req() req: Request) {
    await this.auth.session(req);
    return this.c.db
      .select()
      .from(s.taxonomies)
      .orderBy(asc(s.taxonomies.name));
  }
  @Post('admin/taxonomies') taxonomy(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        kind: z.enum(['category', 'brand']),
        name: v.text(100),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(160)
          .optional(),
      })
      .parse(body);
    return this.command(
      req,
      res,
      'taxonomy.create',
      input,
      async (tx) => {
        if (input.slug)
          return (
            await tx
              .insert(s.taxonomies)
              .values({ ...input, slug: input.slug })
              .returning()
          )[0];
        for (let sequence = 1; ; sequence++) {
          const [created] = await tx
            .insert(s.taxonomies)
            .values({
              ...input,
              slug: productSlug(
                input.name,
                sequence,
                input.kind === 'brand' ? 'marca' : 'categoria',
              ),
            })
            .onConflictDoNothing({
              target: [s.taxonomies.kind, s.taxonomies.slug],
            })
            .returning();
          if (created) return created;
        }
      },
      true,
      true,
    );
  }
  @Patch('admin/taxonomies/:id') editTaxonomy(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z
      .strictObject({
        name: v.text(100),
        active: z.boolean(),
        expectedVersion: v.version,
      })
      .parse(body);
    return this.command(req, res, 'taxonomy.edit:' + id, input, async (tx) => {
      await tx
        .select()
        .from(s.taxonomies)
        .where(eq(s.taxonomies.id, id))
        .for('update');
      if (!input.active) {
        const referenced = await tx
          .select()
          .from(s.products)
          .where(
            and(
              eq(s.products.status, 'published'),
              sql`(${s.products.categoryId}=${id} or ${s.products.brandId}=${id})`,
            ),
          );
        ensure(!referenced.length, 'CATALOG_IN_USE');
      }
      const [updated] = await tx
        .update(s.taxonomies)
        .set({
          name: input.name,
          active: input.active,
          version: input.expectedVersion + 1,
        })
        .where(
          and(
            eq(s.taxonomies.id, id),
            eq(s.taxonomies.version, input.expectedVersion),
          ),
        )
        .returning();
      ensure(updated, 'VERSION_CONFLICT');
      return updated;
    });
  }
  @Get('admin/store') async adminStore(@Req() req: Request) {
    await this.auth.session(req);
    return this.c.publicStore();
  }
  @Patch('admin/store') updateStore(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = v.storeInput.parse(body);
    return this.command(req, res, 'store.edit', input, async (tx) => {
      const { expectedVersion, ...data } = input;
      const [updated] = await tx
        .update(s.store)
        .set({ data, version: expectedVersion + 1 })
        .where(and(eq(s.store.id, 1), eq(s.store.version, expectedVersion)))
        .returning();
      ensure(updated, 'VERSION_CONFLICT');
      return updated;
    });
  }
  @Get('admin/purchases') async list(
    @Req() req: Request,
    @Query() query: unknown,
  ) {
    await this.auth.session(req);
    const input = z
      .strictObject({
        status: z.enum(['pending', 'completed', 'cancelled']).optional(),
        offset: z.coerce.number().int().min(0).max(1000000).default(0),
      })
      .parse(query);
    const items = await this.c.listPurchases(input.status, input.offset);
    return json({
      items: items.slice(0, 100),
      nextOffset: items.length > 100 ? input.offset + 100 : null,
    });
  }
  @Get('admin/purchases/:id') async detail(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.auth.session(req);
    v.id.parse(id);
    const [p] = await this.c.db
      .select()
      .from(s.purchases)
      .where(eq(s.purchases.id, id));
    ensure(p, 'NOT_FOUND', 404);
    return json({
      ...p,
      events: await this.c.db
        .select()
        .from(s.events)
        .where(eq(s.events.purchaseId, id))
        .orderBy(desc(s.events.createdAt)),
      returns: await this.c.db
        .select()
        .from(s.returns)
        .where(eq(s.returns.purchaseId, id)),
    });
  }
  @Post('admin/purchases') manual(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = v.quoteInput
      .extend({
        channel: z.enum(['local', 'whatsapp_manual']),
        customer: v.customer.optional(),
      })
      .parse(body);
    return this.command(
      req,
      res,
      'purchase.manual',
      input,
      (tx, admin) => this.c.create(tx, input, admin),
      true,
      true,
    );
  }
  @Patch('admin/purchases/:id') editPurchase(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = v.quoteInput
      .extend({
        expectedVersion: v.version,
        shippingMinor: v.money.nullable(),
        notes: z.string().max(2000),
      })
      .parse(body);
    return this.command(req, res, 'purchase.edit:' + id, input, (tx, admin) =>
      this.c.edit(tx, id, input, admin),
    );
  }
  @Post('admin/purchases/:id/complete') complete(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z.strictObject({ expectedVersion: v.version }).parse(body);
    return this.command(
      req,
      res,
      'purchase.complete:' + id,
      input,
      (tx, admin) =>
        this.c.transition(tx, id, input.expectedVersion, admin, 'complete'),
    );
  }
  @Post('admin/purchases/:id/cancel') cancel(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z
      .strictObject({ expectedVersion: v.version, reason: v.text(500) })
      .parse(body);
    return this.command(req, res, 'purchase.cancel:' + id, input, (tx, admin) =>
      this.c.transition(
        tx,
        id,
        input.expectedVersion,
        admin,
        'cancel',
        input.reason,
      ),
    );
  }
  @Post('admin/purchases/:id/corrections/preview') async preview(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const admin = await this.auth.session(req, true, true);
    v.id.parse(id);
    const input = v.correctionInput.parse(body);
    return this.c.db.transaction((tx) =>
      this.c.correction(tx, id, input, admin.adminId, true),
    );
  }
  @Post('admin/purchases/:id/corrections') correct(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = v.correctionInput.parse(body);
    return this.command(
      req,
      res,
      'purchase.correct:' + id,
      input,
      (tx, admin) => this.c.correction(tx, id, input, admin),
      true,
      true,
    );
  }
  @Post('admin/purchases/:id/returns') returnItems(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = v.returnInput.parse(body);
    return this.command(
      req,
      res,
      'purchase.return:' + id,
      input,
      (tx, admin) => this.c.returnItems(tx, id, input, admin),
      true,
      true,
    );
  }
  @Get('admin/stock') async stock(@Req() req: Request) {
    await this.auth.session(req);
    return json(
      await this.c.db
        .select({ sku: s.skus, stock: s.stocks, product: s.products.name })
        .from(s.stocks)
        .innerJoin(s.skus, eq(s.skus.id, s.stocks.skuId))
        .innerJoin(s.products, eq(s.products.id, s.skus.productId)),
    );
  }
  @Patch('admin/stock/:id/minimum') minimum(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z
      .strictObject({ minimum: v.money, expectedVersion: v.version })
      .parse(body);
    return this.command(req, res, 'stock.minimum:' + id, input, async (tx) => {
      const [updated] = await tx
        .update(s.stocks)
        .set({
          minimum: BigInt(input.minimum),
          version: input.expectedVersion + 1,
        })
        .where(
          and(
            eq(s.stocks.skuId, id),
            eq(s.stocks.version, input.expectedVersion),
          ),
        )
        .returning();
      ensure(updated, 'VERSION_CONFLICT');
      return updated;
    });
  }
  @Patch('admin/bulk-configs/:id') toggleBulk(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z
      .strictObject({ active: z.boolean(), expectedVersion: v.version })
      .parse(body);
    return this.command(req, res, 'bulk.toggle:' + id, input, async (tx) => {
      const [updated] = await tx
        .update(s.bulkConfigs)
        .set({ active: input.active, version: input.expectedVersion + 1 })
        .where(
          and(
            eq(s.bulkConfigs.id, id),
            eq(s.bulkConfigs.version, input.expectedVersion),
          ),
        )
        .returning();
      ensure(updated, 'VERSION_CONFLICT');
      return updated;
    });
  }
  @Post('admin/purchases/:id/notes') addNote(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const input = z
      .strictObject({ expectedVersion: v.version, note: v.text(2000) })
      .parse(body);
    return this.command(
      req,
      res,
      'purchase.note:' + id,
      input,
      async (tx, admin) => {
        const p = await this.c.purchase(tx, id, input.expectedVersion);
        await tx
          .update(s.purchases)
          .set({ version: p.version + 1 })
          .where(eq(s.purchases.id, id));
        return this.c.event(tx, id, admin, 'note', input.note, {});
      },
    );
  }
  @Get('admin/stock/:id/movements') async movements(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.auth.session(req);
    v.id.parse(id);
    return json(
      await this.c.db
        .select({ movement: s.movements, operation: s.operations })
        .from(s.movements)
        .innerJoin(s.operations, eq(s.operations.id, s.movements.operationId))
        .where(eq(s.movements.skuId, id))
        .orderBy(desc(s.movements.createdAt))
        .limit(100),
    );
  }
  @Post('admin/inventory/receipts') receipt(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        lines: z
          .array(
            z.strictObject({
              skuId: v.id,
              quantity: v.money,
              expectedVersion: v.version,
            }),
          )
          .min(1)
          .max(50),
        reason: v.text(500),
        kind: z.enum(['initial', 'receipt']),
      })
      .parse(body);
    return this.command(
      req,
      res,
      'inventory.receipt',
      input,
      async (tx, admin) => {
        ensure(
          new Set(input.lines.map((l) => l.skuId)).size === input.lines.length,
          'INVALID_LINES',
          422,
        );
        for (const l of [...input.lines].sort((a, b) =>
          a.skuId.localeCompare(b.skuId),
        )) {
          const [stock] = await tx
            .select()
            .from(s.stocks)
            .where(eq(s.stocks.skuId, l.skuId))
            .for('update');
          ensure(stock?.version === l.expectedVersion, 'VERSION_CONFLICT');
          const [sku] = await tx
            .select()
            .from(s.skus)
            .where(eq(s.skus.id, l.skuId));
          ensure(
            input.kind === 'initial' || sku?.saleUnit === 'unit',
            'BULK_REQUIRES_OPENING',
            422,
          );
          if (input.kind === 'initial') {
            const prior = await tx
              .select()
              .from(s.movements)
              .where(eq(s.movements.skuId, l.skuId))
              .limit(1);
            ensure(!prior.length, 'INITIAL_ALREADY_RECORDED');
          }
          ensure(BigInt(l.quantity) > 0n, 'INVALID_QUANTITY', 422);
        }
        return {
          operationId: await this.c.move(
            tx,
            admin,
            input.kind,
            input.reason,
            new Map(input.lines.map((l) => [l.skuId, BigInt(l.quantity)])),
          ),
        };
      },
    );
  }
  @Post('admin/inventory/adjustments') adjust(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        skuId: v.id,
        expectedVersion: v.version,
        mode: z.enum(['count', 'delta']),
        quantity: z.string().regex(/^-?(0|[1-9]\d{0,11})$/),
        reason: v.text(500),
      })
      .parse(body);
    return this.command(
      req,
      res,
      'inventory.adjust',
      input,
      async (tx, admin) => {
        const [stock] = await tx
          .select()
          .from(s.stocks)
          .where(eq(s.stocks.skuId, input.skuId))
          .for('update');
        ensure(stock?.version === input.expectedVersion, 'VERSION_CONFLICT');
        const amount = BigInt(input.quantity);
        ensure(input.mode !== 'count' || amount >= 0n, 'INVALID_QUANTITY', 422);
        const delta = input.mode === 'count' ? amount - stock.quantity : amount;
        ensure(delta !== 0n, 'NO_CHANGES', 422);
        return {
          operationId: await this.c.move(
            tx,
            admin,
            'adjustment',
            input.reason,
            new Map([[input.skuId, delta]]),
            undefined,
            {
              observed: input.quantity,
              previous: stock.quantity.toString(),
              mode: input.mode,
            },
          ),
        };
      },
    );
  }
  @Get('admin/bulk-configs') async bulk(@Req() req: Request) {
    await this.auth.session(req);
    return json(await this.c.db.select().from(s.bulkConfigs));
  }
  @Post('admin/bulk-configs') createBulk(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        sourceSkuId: v.id,
        targetSkuId: v.id,
        gramsPerBag: v.money,
      })
      .parse(body);
    return this.command(
      req,
      res,
      'bulk.create',
      input,
      async (tx) => {
        const rows = await tx
          .select()
          .from(s.skus)
          .where(inArray(s.skus.id, [input.sourceSkuId, input.targetSkuId]));
        const source = rows.find((r) => r.id === input.sourceSkuId),
          target = rows.find((r) => r.id === input.targetSkuId);
        ensure(
          source &&
            target &&
            source.saleUnit === 'unit' &&
            target.saleUnit === 'kg' &&
            source.productId === target.productId &&
            source.netWeightGrams === BigInt(input.gramsPerBag),
          'INVALID_BULK_CONFIG',
          422,
        );
        return (
          await tx
            .insert(s.bulkConfigs)
            .values({ ...input, gramsPerBag: BigInt(input.gramsPerBag) })
            .returning()
        )[0];
      },
      true,
      true,
    );
  }
  @Post('admin/bag-openings') opening(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const input = z
      .strictObject({
        configId: v.id,
        expectedConfigVersion: v.version,
        bagCount: z.number().int().positive().max(999999),
      })
      .parse(body);
    return this.command(req, res, 'bag.open', input, async (tx, admin) => {
      const [config] = await tx
        .select()
        .from(s.bulkConfigs)
        .where(eq(s.bulkConfigs.id, input.configId))
        .for('share');
      ensure(
        config?.active && config.version === input.expectedConfigVersion,
        'VERSION_CONFLICT',
      );
      return {
        operationId: await this.c.move(
          tx,
          admin,
          'bag_opening',
          'Apertura de bolsas',
          new Map([
            [config.sourceSkuId, -BigInt(input.bagCount)],
            [config.targetSkuId, BigInt(input.bagCount) * config.gramsPerBag],
          ]),
          undefined,
          { ...config, bagCount: input.bagCount },
        ),
      };
    });
  }
}

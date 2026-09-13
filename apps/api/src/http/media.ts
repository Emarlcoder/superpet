import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Req,
  Res,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Injectable,
  Inject,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Auth } from '../domain/auth.js';
import { Commerce } from '../domain/commerce.js';
import { DomainError, ensure, json } from '../domain/errors.js';
import * as s from '../db/schema.js';
import * as v from '../domain/validation.js';
import type { Transaction } from '../db/database.js';

@Injectable()
export class MediaGuard implements CanActivate {
  constructor(@Inject(Auth) private auth: Auth) {}
  async canActivate(context: ExecutionContext) {
    await this.auth.session(
      context.switchToHttp().getRequest<Request>(),
      true,
      true,
    );
    return true;
  }
}
@Controller()
export class MediaController {
  constructor(
    @Inject(Commerce) private c: Commerce,
    @Inject(Auth) private auth: Auth,
  ) {}
  private async edit(
    req: Request,
    res: Response,
    scope: string,
    body: unknown,
    fn: (tx: Transaction) => Promise<unknown>,
  ) {
    const principal = await this.auth.session(req, true, true);
    ensure(
      req.header('X-Operation-Epoch') === this.c.epoch,
      'RECOVERY_REVIEW_REQUIRED',
    );
    const result = await this.c.mutate(
      scope + ':' + principal.adminId,
      req.header('Idempotency-Key') ?? '',
      body,
      fn,
    );
    res.status(result.status);
    res.setHeader('Idempotency-Replayed', String(result.replayed));
    return result.body;
  }
  private async put(key: string, bytes: Buffer, privateFile = false) {
    // Commit the object journal before storage I/O so crashes remain recoverable.
    await this.c.db
      .insert(s.mediaObjects)
      .values({ key, privateFile })
      .onConflictDoNothing();
    if (process.env.R2_ENDPOINT) {
      ensure(
        process.env.R2_ACCESS_KEY &&
          process.env.R2_SECRET_KEY &&
          process.env.R2_PRIVATE_BUCKET &&
          process.env.R2_PUBLIC_BUCKET,
        'MEDIA_NOT_CONFIGURED',
        503,
      );
      const client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY,
          secretAccessKey: process.env.R2_SECRET_KEY,
        },
      });
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: privateFile
              ? process.env.R2_PRIVATE_BUCKET
              : process.env.R2_PUBLIC_BUCKET,
            Key: key,
            Body: bytes,
            ContentType: privateFile
              ? 'application/octet-stream'
              : 'image/webp',
            CacheControl: privateFile
              ? 'private, no-store'
              : 'public, max-age=86400',
          }),
          { abortSignal: AbortSignal.timeout(8000) },
        );
      } finally {
        client.destroy();
      }
    } else {
      ensure(
        process.env.NODE_ENV !== 'production',
        'MEDIA_NOT_CONFIGURED',
        503,
      );
      const folder = resolve(
        process.env.MEDIA_DIR ?? '../../.local/media',
        privateFile ? 'originals' : 'public',
      );
      await mkdir(folder, { recursive: true });
      await writeFile(resolve(folder, key), bytes);
    }
  }
  @Post('admin/products/:id/images')
  @UseGuards(MediaGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 3 },
    }),
  )
  async upload(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @UploadedFile() file: { buffer: Buffer; mimetype: string },
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    const principal = await this.auth.session(req, true, true);
    await this.auth.limit('image:' + principal.adminId, 10, 60);
    ensure(
      req.header('X-Operation-Epoch') === this.c.epoch,
      'RECOVERY_REVIEW_REQUIRED',
    );
    const input = z
      .strictObject({
        alt: v.text(160),
        expectedVersion: z.coerce.number().int().positive(),
      })
      .parse(body);
    ensure(
      file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype),
      'IMAGE_TYPE_UNSUPPORTED',
      415,
    );
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const meta = await sharp(file.buffer, {
      limitInputPixels: 16000000,
    })
      .metadata()
      .catch(() => {
        throw new DomainError('IMAGE_INVALID', 422);
      });
    ensure(
      ['jpeg', 'png', 'webp'].includes(meta.format ?? '') &&
        (meta.pages ?? 1) === 1,
      'IMAGE_TYPE_UNSUPPORTED',
      415,
    );
    ensure(
      meta.width &&
        meta.height &&
        meta.width >= 300 &&
        meta.height >= 300 &&
        meta.width <= 6000 &&
        meta.height <= 6000,
      'IMAGE_DIMENSIONS_INVALID',
      422,
    );
    const attemptKey = req.header('Idempotency-Key') ?? '';
    ensure(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        attemptKey,
      ),
      'INVALID_IDEMPOTENCY_KEY',
      400,
    );
    const keyHash = createHash('sha256')
      .update(principal.adminId + ':' + id + ':' + attemptKey)
      .digest('hex');
    const payloadHash = createHash('sha256')
      .update(JSON.stringify([hash, input.alt, input.expectedVersion]))
      .digest('hex');
    const claim = await this.c.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${principal.adminId + ':image'},0))`,
      );
      const [old] = await tx
        .select()
        .from(s.imageUploads)
        .where(eq(s.imageUploads.keyHash, keyHash))
        .for('update');
      if (old) {
        if (old.expiresAt <= new Date()) {
          const result = { status: 409, body: { code: 'IDEMPOTENCY_EXPIRED' } };
          await tx
            .update(s.imageUploads)
            .set({ payloadHash: null, result })
            .where(eq(s.imageUploads.keyHash, keyHash));
          return { result };
        }
        ensure(old.payloadHash === payloadHash, 'IDEMPOTENCY_CONFLICT');
        if (old.result) return { result: old.result };
        ensure(old.leaseUntil <= new Date(), 'IDEMPOTENCY_IN_PROGRESS');
      }
      const active = await tx
        .select()
        .from(s.imageUploads)
        .where(
          and(
            eq(s.imageUploads.adminId, principal.adminId),
            sql`${s.imageUploads.result} is null and ${s.imageUploads.leaseUntil}>now()`,
          ),
        );
      ensure(!active.length, 'RATE_LIMITED', 429);
      const [product] = await tx
        .select()
        .from(s.products)
        .where(eq(s.products.id, id))
        .for('update');
      ensure(product?.version === input.expectedVersion, 'VERSION_CONFLICT');
      const photos = await tx
        .select()
        .from(s.images)
        .where(eq(s.images.productId, id));
      const reserved = await tx
        .select()
        .from(s.imageUploads)
        .where(
          and(
            eq(s.imageUploads.productId, id),
            sql`${s.imageUploads.result} is null and ${s.imageUploads.leaseUntil}>now()`,
          ),
        );
      ensure(photos.length + reserved.length < 8, 'IMAGE_LIMIT_REACHED');
      const job = {
        keyHash,
        payloadHash,
        adminId: principal.adminId,
        productId: id,
        imageId: randomUUID(),
        generation: (old?.generation ?? 0) + 1,
        leaseUntil: new Date(Date.now() + 120000),
        expiresAt: old?.expiresAt ?? new Date(Date.now() + 30 * 86400000),
        result: null,
      };
      await tx
        .insert(s.imageUploads)
        .values(job)
        .onConflictDoUpdate({ target: s.imageUploads.keyHash, set: job });
      return { job };
    });
    if (claim.result) {
      res.status(claim.result.status);
      res.setHeader('Idempotency-Replayed', 'true');
      return claim.result.body;
    }
    const job = claim.job!;
    const imageId = job.imageId;
    const prefix = imageId + '-' + hash.slice(0, 12);
    const variants: Array<{ key: string; width: number; height: number }> = [];
    const buffers: Array<{ key: string; data: Buffer }> = [];
    for (const size of [320, 640, 1280]) {
      const { data, info } = await sharp(file.buffer, {
        limitInputPixels: 16000000,
      })
        .rotate()
        .resize({
          width: size,
          height: size,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toColorspace('srgb')
        .webp({ quality: 82 })
        .timeout({ seconds: 10 })
        .toBuffer({ resolveWithObject: true });
      const key = prefix + '-' + size + '.webp';
      buffers.push({ key, data });
      variants.push({ key, width: info.width, height: info.height });
    }
    let result: { status: number; body: unknown };
    try {
      await this.put(prefix + '.original', file.buffer, true);
      for (const item of buffers) await this.put(item.key, item.data);
      await this.auth.session(req, true, true);
      result = await this.c.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(s.imageUploads)
          .where(eq(s.imageUploads.keyHash, keyHash))
          .for('update');
        ensure(
          current?.generation === job.generation &&
            current.leaseUntil > new Date() &&
            !current.result,
          'RETRY_SAME_ATTEMPT',
        );
        const [p] = await tx
          .select()
          .from(s.products)
          .where(eq(s.products.id, id))
          .for('update');
        ensure(p?.version === input.expectedVersion, 'VERSION_CONFLICT');
        const photos = await tx
          .select()
          .from(s.images)
          .where(eq(s.images.productId, id));
        ensure(photos.length < 8, 'IMAGE_LIMIT_REACHED');
        await tx.insert(s.images).values({
          id: imageId,
          productId: id,
          alt: input.alt,
          position: photos.length,
          originalKey: prefix + '.original',
          variants,
        });
        await tx
          .update(s.products)
          .set({ version: p.version + 1 })
          .where(eq(s.products.id, id));
        const receipt = {
          status: 201,
          body: {
            imageId,
            status: 'ready',
            variants,
            productVersion: p.version + 1,
          },
        };
        await tx
          .update(s.imageUploads)
          .set({ result: json(receipt), leaseUntil: new Date(0) })
          .where(eq(s.imageUploads.keyHash, keyHash));
        return receipt;
      });
    } catch (error) {
      if (error instanceof DomainError && error.code !== 'RETRY_SAME_ATTEMPT') {
        result = { status: error.statusCode, body: { code: error.code } };
        await this.c.db
          .update(s.imageUploads)
          .set({ result, leaseUntil: new Date(0) })
          .where(
            and(
              eq(s.imageUploads.keyHash, keyHash),
              eq(s.imageUploads.generation, job.generation),
            ),
          );
      } else {
        await this.c.db
          .update(s.imageUploads)
          .set({ leaseUntil: new Date(0) })
          .where(
            and(
              eq(s.imageUploads.keyHash, keyHash),
              eq(s.imageUploads.generation, job.generation),
            ),
          );
        throw new DomainError('IMAGE_STORAGE_UNAVAILABLE', 503);
      }
    }
    res.status(result.status);
    res.setHeader('Idempotency-Replayed', 'false');
    return result.body;
  }
  @Get('media/:key') async get(
    @Param('key') key: string,
    @Res() res: Response,
  ) {
    ensure(/^[a-f0-9-]+-(320|640|1280)\.webp$/.test(key), 'NOT_FOUND', 404);
    ensure(!process.env.R2_ENDPOINT, 'NOT_FOUND', 404);
    try {
      const bytes = await readFile(
        resolve(process.env.MEDIA_DIR ?? '../../.local/media', 'public', key),
      );
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(bytes);
    } catch {
      res.status(404).json({ code: 'NOT_FOUND' });
    }
  }
  @Delete('admin/products/:id/images/:imageId') async remove(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    v.id.parse(imageId);
    await this.auth.session(req, true, true);
    ensure(
      req.header('X-Operation-Epoch') === this.c.epoch,
      'RECOVERY_REVIEW_REQUIRED',
    );
    const input = z.strictObject({ expectedVersion: v.version }).parse(body);
    return this.edit(
      req,
      res,
      'image.remove:' + id + ':' + imageId,
      input,
      async (tx) => {
        const [p] = await tx
          .select()
          .from(s.products)
          .where(eq(s.products.id, id))
          .for('update');
        ensure(p?.version === input.expectedVersion, 'VERSION_CONFLICT');
        const photos = await tx
          .select()
          .from(s.images)
          .where(eq(s.images.productId, id));
        ensure(
          p.status !== 'published' || photos.length > 1,
          'LAST_PUBLISHED_IMAGE',
        );
        const result = await tx
          .delete(s.images)
          .where(and(eq(s.images.id, imageId), eq(s.images.productId, id)))
          .returning();
        ensure(result.length, 'NOT_FOUND', 404);
        for (const key of [
          result[0]!.originalKey,
          ...result[0]!.variants.map((v) => v.key),
        ])
          await tx
            .update(s.mediaObjects)
            .set({ eligibleAt: new Date(Date.now() + 7 * 86400000) })
            .where(eq(s.mediaObjects.key, key));
        await tx
          .update(s.products)
          .set({ version: p.version + 1 })
          .where(eq(s.products.id, id));
        return { version: p.version + 1 };
      },
    );
  }
  @Patch('admin/products/:id/images/order') async order(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    await this.auth.session(req, true, true);
    ensure(
      req.header('X-Operation-Epoch') === this.c.epoch,
      'RECOVERY_REVIEW_REQUIRED',
    );
    const input = z
      .strictObject({
        expectedVersion: v.version,
        imageIds: z.array(v.id).max(8),
      })
      .parse(body);
    return this.edit(req, res, 'image.order:' + id, input, async (tx) => {
      const [p] = await tx
        .select()
        .from(s.products)
        .where(eq(s.products.id, id))
        .for('update');
      ensure(p?.version === input.expectedVersion, 'VERSION_CONFLICT');
      const photos = await tx
        .select()
        .from(s.images)
        .where(eq(s.images.productId, id));
      ensure(
        input.imageIds.length === photos.length &&
          new Set(input.imageIds).size === photos.length &&
          input.imageIds.every((id) => photos.some((p) => p.id === id)),
        'INVALID_IMAGES',
        422,
      );
      for (const [position, imageId] of input.imageIds.entries())
        await tx
          .update(s.images)
          .set({ position })
          .where(eq(s.images.id, imageId));
      await tx
        .update(s.products)
        .set({ version: p.version + 1 })
        .where(eq(s.products.id, id));
      return { version: p.version + 1 };
    });
  }
  @Patch('admin/products/:id/images/:imageId') metadata(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    v.id.parse(id);
    v.id.parse(imageId);
    const input = z
      .strictObject({ expectedVersion: v.version, alt: v.text(160) })
      .parse(body);
    return this.edit(
      req,
      res,
      'image.metadata:' + id + ':' + imageId,
      input,
      async (tx) => {
        const [product] = await tx
          .select()
          .from(s.products)
          .where(eq(s.products.id, id))
          .for('update');
        ensure(product?.version === input.expectedVersion, 'VERSION_CONFLICT');
        const rows = await tx
          .update(s.images)
          .set({ alt: input.alt })
          .where(and(eq(s.images.id, imageId), eq(s.images.productId, id)))
          .returning();
        ensure(rows.length, 'NOT_FOUND', 404);
        await tx
          .update(s.products)
          .set({ version: product.version + 1 })
          .where(eq(s.products.id, id));
        return { version: product.version + 1 };
      },
    );
  }
  async cleanup(limit = 100) {
    const candidates = await this.c.db
      .select()
      .from(s.mediaObjects)
      .where(
        sql`${s.mediaObjects.eligibleAt}<now() and not exists (select 1 from images where images.original_key=${s.mediaObjects.key} or images.variants @> jsonb_build_array(jsonb_build_object('key',${s.mediaObjects.key})))`,
      )
      .limit(limit);
    for (const object of candidates) {
      const referenced = await this.c.db
        .select({ id: s.images.id })
        .from(s.images)
        .where(
          sql`${s.images.originalKey}=${object.key} or ${s.images.variants} @> ${JSON.stringify([{ key: object.key }])}::jsonb`,
        )
        .limit(1);
      if (referenced.length) continue;
      if (process.env.R2_ENDPOINT) {
        ensure(
          process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY,
          'MEDIA_NOT_CONFIGURED',
          503,
        );
        const client = new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY,
            secretAccessKey: process.env.R2_SECRET_KEY,
          },
        });
        try {
          await client.send(
            new DeleteObjectCommand({
              Bucket: object.privateFile
                ? process.env.R2_PRIVATE_BUCKET
                : process.env.R2_PUBLIC_BUCKET,
              Key: object.key,
            }),
            { abortSignal: AbortSignal.timeout(8000) },
          );
        } finally {
          client.destroy();
        }
      } else {
        try {
          await unlink(
            resolve(
              process.env.MEDIA_DIR ?? '../../.local/media',
              object.privateFile ? 'originals' : 'public',
              object.key,
            ),
          );
        } catch (e) {
          if (!(
            e &&
            typeof e === 'object' &&
            'code' in e &&
            e.code === 'ENOENT'
          ))
            throw e;
        }
      }
      await this.c.db
        .delete(s.mediaObjects)
        .where(eq(s.mediaObjects.key, object.key));
    }
  }
}

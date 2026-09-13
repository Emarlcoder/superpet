import {
  randomBytes,
  randomUUID,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { hash, verify, argon2id, needsRehash } from 'argon2';
import { readFileSync } from 'node:fs';
import { and, eq, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import type { Database } from '../db/database.js';
import * as s from '../db/schema.js';
import { ensure } from './errors.js';
import type { Principal } from './types.js';
import { sendMail, type MailSender } from './mail.js';
import { DomainError } from './errors.js';

export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const options = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;
const blocked = new Set([
  'passwordpassword',
  '123456789012345',
  'superpetsuperpet',
  'contraseñacontraseña',
]);
const commonHashes = new Set(
  readFileSync(
    new URL('../../data/common-passwords.sha256', import.meta.url),
    'utf8',
  )
    .trim()
    .split('\n'),
);
let hashing = 0;
const hashQueue: Array<() => void> = [];
async function boundedHash<T>(fn: () => Promise<T>): Promise<T> {
  if (hashing >= 2) {
    ensure(hashQueue.length < 4, 'AUTH_BUSY', 503);
    await new Promise<void>((resolve) => hashQueue.push(resolve));
  } else hashing++;
  try {
    return await fn();
  } finally {
    const next = hashQueue.shift();
    if (next) next();
    else hashing--;
  }
}
export async function passwordVerify(encoded: string, value: string) {
  ensure(
    /^\$argon2id\$v=19\$(?:[mtp]=\d+,){2}[mtp]=\d+\$/.test(encoded),
    'AUTH_UNAVAILABLE',
    503,
  );
  const parameters = Object.fromEntries(
    encoded
      .split('$')[3]!
      .split(',')
      .map((pair) => pair.split('=')),
  );
  const { m: memory, t: iterations, p: parallelism } = parameters;
  ensure(
    Number(memory) >= 8192 &&
      Number(memory) <= 262144 &&
      Number(iterations) >= 1 &&
      Number(iterations) <= 10 &&
      Number(parallelism) >= 1 &&
      Number(parallelism) <= 4,
    'AUTH_UNAVAILABLE',
    503,
  );
  return boundedHash(() => verify(encoded, value));
}
export function passwordPolicy(value: string, username = '') {
  ensure(
    [...value].length >= 8 &&
      [...value].length <= 128 &&
      Buffer.byteLength(value) <= 512,
    'PASSWORD_POLICY_VIOLATION',
    422,
  );
  ensure(
    !blocked.has(value.toLowerCase()) &&
      !commonHashes.has(digest(value)) &&
      value.toLowerCase() !== username.toLowerCase(),
    'PASSWORD_POLICY_VIOLATION',
    422,
  );
}
export async function passwordHash(value: string) {
  return boundedHash(() => hash(value, options));
}
export class Auth {
  private dummy: Promise<string> = passwordHash(
    randomBytes(32).toString('hex'),
  );
  constructor(
    public db: Database,
    private origin: string,
    private secret: string,
    private production: boolean,
    private mail: MailSender = sendMail,
  ) {}
  private cookieName() {
    return this.production ? '__Host-superpet_session' : 'superpet_session';
  }
  private cookie(req: Request) {
    return (
      req.headers.cookie
        ?.split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith(this.cookieName() + '='))
        ?.slice(this.cookieName().length + 1) ?? ''
    );
  }
  private setCookie(res: Response, value: string, maxAge: number) {
    res.cookie(this.cookieName(), value, {
      httpOnly: true,
      secure: this.production,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
  requireOrigin(req: Request) {
    ensure(req.headers.origin === this.origin, 'ORIGIN_REJECTED', 403);
  }
  async limit(name: string, max: number, seconds: number) {
    const key = createHmac('sha256', this.secret).update(name).digest('hex');
    const result = await this.db.execute(
      sql`insert into rate_limits (key,count,expires_at) values (${key},1,now()+${seconds}*interval '1 second') on conflict (key) do update set count=case when rate_limits.expires_at<=now() then 1 else rate_limits.count+1 end, expires_at=case when rate_limits.expires_at<=now() then now()+${seconds}*interval '1 second' else rate_limits.expires_at end returning count`,
    );
    ensure(Number(result.rows[0]?.count) <= max, 'RATE_LIMITED', 429);
  }
  async preSession(req: Request, res: Response) {
    this.requireOrigin(req);
    await this.limit('csrf:' + req.ip, 60, 600);
    const raw = token(),
      csrf = token();
    await this.db.insert(s.sessions).values({
      tokenHash: digest(raw),
      csrf,
      expiresAt: new Date(Date.now() + 600000),
    });
    this.setCookie(res, raw, 600000);
    return { csrfToken: csrf };
  }
  async session(
    req: Request,
    adminRequired = true,
    csrfRequired = false,
  ): Promise<Principal> {
    const raw = this.cookie(req);
    ensure(raw, 'UNAUTHENTICATED', 401);
    const [session] = await this.db
      .select()
      .from(s.sessions)
      .where(eq(s.sessions.tokenHash, digest(raw)));
    ensure(
      session &&
        session.expiresAt > new Date() &&
        session.lastActivityAt > new Date(Date.now() - 1800000),
      'UNAUTHENTICATED',
      401,
    );
    if (csrfRequired) {
      this.requireOrigin(req);
      const candidate = req.header('X-CSRF-Token') ?? '';
      ensure(
        Buffer.byteLength(candidate) === Buffer.byteLength(session.csrf) &&
          timingSafeEqual(Buffer.from(candidate), Buffer.from(session.csrf)),
        'CSRF_REJECTED',
        403,
      );
    }
    if (adminRequired) {
      ensure(session.adminId, 'UNAUTHENTICATED', 401);
      const [admin] = await this.db
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, session.adminId));
      ensure(admin?.active, 'UNAUTHENTICATED', 401);
    }
    if (adminRequired && req.path !== '/api/v1/auth/me')
      await this.db
        .update(s.sessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(s.sessions.id, session.id));
    return {
      adminId: session.adminId ?? '',
      sessionId: session.id,
      csrf: session.csrf,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
    };
  }
  async login(req: Request, res: Response, username: string, password: string) {
    const prior = await this.session(req, false, true);
    const normalized = username.trim().toLowerCase();
    await this.limit('login-ip:' + req.ip, 20, 900);
    await this.limit('login-user:' + normalized, 10, 900);
    const [admin] = await this.db
      .select()
      .from(s.admins)
      .where(eq(s.admins.username, normalized));
    const failureKey = createHmac('sha256', this.secret)
      .update('failure:' + normalized)
      .digest('hex');
    const [failures] = await this.db
      .select()
      .from(s.loginFailures)
      .where(eq(s.loginFailures.key, failureKey));
    ensure(
      !failures || failures.blockedUntil <= new Date(),
      'RATE_LIMITED',
      429,
    );
    const valid = await passwordVerify(
      admin?.passwordHash ?? (await this.dummy),
      password,
    );
    if (!valid || !admin?.active) {
      await this.db.execute(
        sql`insert into login_failures (key,failures,window_start,blocked_until) values (${failureKey},1,now(),now()) on conflict(key) do update set failures=case when login_failures.window_start<now()-interval '15 minutes' then 1 else login_failures.failures+1 end, blocked_until=case when login_failures.window_start<now()-interval '15 minutes' or login_failures.failures<4 then now() else now()+least(300,30*power(2,least(login_failures.failures-4,4)))*interval '1 second' end, window_start=case when login_failures.window_start<now()-interval '15 minutes' then now() else login_failures.window_start end`,
      );
      ensure(false, 'INVALID_CREDENTIALS', 401);
    }
    const upgraded = needsRehash(admin.passwordHash, options)
      ? await passwordHash(password)
      : null;
    const raw = token(),
      csrf = token(),
      expiresAt = new Date(Date.now() + 43200000);
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, admin.id))
        .for('update');
      ensure(
        current?.active && current.passwordVersion === admin.passwordVersion,
        'INVALID_CREDENTIALS',
        401,
      );
      if (upgraded)
        await tx
          .update(s.admins)
          .set({ passwordHash: upgraded })
          .where(eq(s.admins.id, admin.id));
      await tx
        .delete(s.loginFailures)
        .where(eq(s.loginFailures.key, failureKey));
      await tx.delete(s.sessions).where(eq(s.sessions.id, prior.sessionId));
      await tx
        .insert(s.sessions)
        .values({ adminId: admin.id, tokenHash: digest(raw), csrf, expiresAt });
    });
    this.setCookie(res, raw, 43200000);
    return {
      id: admin.id,
      username: admin.username,
      csrfToken: csrf,
      expiresAt,
    };
  }
  async logout(req: Request, res: Response) {
    const principal = await this.session(req, true, true);
    await this.db
      .delete(s.sessions)
      .where(eq(s.sessions.id, principal.sessionId));
    this.setCookie(res, '', 0);
  }
  async change(req: Request, currentPassword: string, newPassword: string) {
    const p = await this.session(req, true, true);
    await this.limit('change:' + p.adminId, 10, 900);
    const [admin] = await this.db
      .select()
      .from(s.admins)
      .where(eq(s.admins.id, p.adminId));
    ensure(
      admin && (await passwordVerify(admin.passwordHash, currentPassword)),
      'INVALID_CREDENTIALS',
      401,
    );
    passwordPolicy(newPassword, admin.username);
    const nextHash = await passwordHash(newPassword);
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, p.adminId))
        .for('update');
      ensure(
        current?.passwordVersion === admin.passwordVersion,
        'VERSION_CONFLICT',
      );
      await tx
        .update(s.admins)
        .set({
          passwordHash: nextHash,
          passwordVersion: admin.passwordVersion + 1,
        })
        .where(eq(s.admins.id, admin.id));
      await tx.delete(s.sessions).where(eq(s.sessions.adminId, admin.id));
      await tx
        .update(s.tokens)
        .set({ consumed: true })
        .where(eq(s.tokens.adminId, admin.id));
    });
    return { changed: true };
  }
  async issue(
    adminId: string,
    purpose: 'reset' | 'verify',
    targetEmail?: string,
  ) {
    const raw = token();
    const record = await this.db.transaction(async (tx) => {
      const [admin] = await tx
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, adminId))
        .for('update');
      ensure(admin?.active, 'INVALID_ACCOUNT', 422);
      if (purpose === 'verify')
        await tx
          .update(s.tokens)
          .set({ consumed: true })
          .where(
            and(eq(s.tokens.adminId, adminId), eq(s.tokens.purpose, 'verify')),
          );
      const [record] = await tx
        .insert(s.tokens)
        .values({
          adminId,
          purpose,
          email: targetEmail ?? admin.email,
          tokenHash: digest(raw),
          expiresAt: new Date(
            Date.now() + (purpose === 'reset' ? 900000 : 1800000),
          ),
        })
        .returning();
      return record!;
    });
    return { raw, record };
  }
  async deliver(
    adminId: string,
    purpose: 'reset' | 'verify',
    targetEmail?: string,
  ) {
    const { raw, record } = await this.issue(adminId, purpose, targetEmail);
    ensure(record.email, 'MAIL_NOT_CONFIGURED', 503);
    const deliveryId = randomUUID();
    await this.db.insert(s.deliveries).values({
      id: deliveryId,
      adminId,
      tokenId: record.id,
      status: 'sending',
    });
    const link =
      this.origin +
      (purpose === 'reset'
        ? '/admin/restablecer-clave#'
        : '/admin/verificar-correo#') +
      raw;
    const result = await this.mail({
      id: deliveryId,
      to: record.email,
      subject:
        purpose === 'reset'
          ? 'Recuperá tu acceso a SuperPet'
          : 'Verificá tu correo de SuperPet',
      text:
        purpose === 'reset'
          ? 'Creá una nueva contraseña: ' +
            link +
            '\nVálido por 15 minutos. Si no solicitaste este cambio, podés ignorar este correo.'
          : 'Confirmá tu correo de recuperación: ' +
            link +
            '\nVálido por 30 minutos. Si no solicitaste este cambio, ignorá este mensaje.',
    });
    await this.db
      .update(s.deliveries)
      .set(result)
      .where(eq(s.deliveries.id, deliveryId));
    return { status: result.status };
  }
  async verifyEmail(req: Request, raw: string) {
    await this.session(req, false, true);
    await this.limit('verify-ip:' + req.ip, 10, 900);
    await this.db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(s.tokens)
        .where(eq(s.tokens.tokenHash, digest(raw)));
      ensure(record?.purpose === 'verify', 'EMAIL_TOKEN_INVALID', 422);
      const [admin] = await tx
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, record.adminId))
        .for('update');
      const [fresh] = await tx
        .select()
        .from(s.tokens)
        .where(eq(s.tokens.id, record.id))
        .for('update');
      ensure(
        admin?.active &&
          fresh &&
          !fresh.consumed &&
          fresh.expiresAt > new Date() &&
          fresh.email,
        'EMAIL_TOKEN_INVALID',
        422,
      );
      await tx
        .update(s.admins)
        .set({ email: fresh.email, emailVerified: true })
        .where(eq(s.admins.id, admin.id));
      await tx
        .update(s.tokens)
        .set({ consumed: true })
        .where(eq(s.tokens.adminId, admin.id));
    });
    return { verified: true };
  }
  async forgot(req: Request, username: string) {
    await this.session(req, false, true);
    await this.limit('forgot-ip:' + req.ip, 5, 900);
    const start = Date.now();
    const normalized = username.trim().toLowerCase();
    try {
      await this.limit('forgot-account:' + normalized, 3, 900);
      await this.limit('forgot-hour:' + normalized, 6, 3600);
      await this.limit('forgot-spacing:' + normalized, 1, 60);
      const [admin] = await this.db
        .select()
        .from(s.admins)
        .where(eq(s.admins.username, normalized));
      if (admin?.active && admin.emailVerified && admin.email)
        await this.deliver(admin.id, 'reset');
    } catch (error) {
      if (!(error instanceof DomainError && error.code === 'RATE_LIMITED'))
        throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 9000 - (Date.now() - start))),
    );
    return {
      message:
        'Si los datos corresponden a una cuenta habilitada, recibirás instrucciones para recuperar el acceso.',
    };
  }
  async reset(req: Request, raw: string, newPassword: string) {
    await this.session(req, false, true);
    await this.limit('reset-ip:' + req.ip, 10, 900);
    passwordPolicy(newPassword);
    const hashed = await passwordHash(newPassword);
    await this.db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(s.tokens)
        .where(eq(s.tokens.tokenHash, digest(raw)));
      ensure(record && record.purpose === 'reset', 'RESET_TOKEN_INVALID', 422);
      const [admin] = await tx
        .select()
        .from(s.admins)
        .where(eq(s.admins.id, record.adminId))
        .for('update');
      const [fresh] = await tx
        .select()
        .from(s.tokens)
        .where(eq(s.tokens.id, record.id))
        .for('update');
      ensure(
        admin?.active &&
          admin.emailVerified &&
          fresh?.email === admin.email &&
          fresh &&
          !fresh.consumed &&
          fresh.expiresAt > new Date(),
        'RESET_TOKEN_INVALID',
        422,
      );
      passwordPolicy(newPassword, admin.username);
      await tx
        .update(s.admins)
        .set({
          passwordHash: hashed,
          passwordVersion: admin.passwordVersion + 1,
        })
        .where(eq(s.admins.id, admin.id));
      await tx
        .update(s.tokens)
        .set({ consumed: true })
        .where(eq(s.tokens.adminId, admin.id));
      await tx.delete(s.sessions).where(eq(s.sessions.adminId, admin.id));
    });
    return { changed: true };
  }
  async cleanup() {
    await this.db.delete(s.sessions).where(sql`${s.sessions.expiresAt}<now()`);
    await this.db
      .delete(s.rates)
      .where(sql`${s.rates.expiresAt}<now()-interval '1 day'`);
    await this.db
      .delete(s.loginFailures)
      .where(sql`${s.loginFailures.windowStart}<now()-interval '1 day'`);
    await this.db
      .update(s.deliveries)
      .set({ status: 'unknown' })
      .where(
        sql`${s.deliveries.status}='sending' and ${s.deliveries.createdAt}<now()-interval '2 minutes'`,
      );
    await this.db
      .delete(s.deliveries)
      .where(sql`${s.deliveries.createdAt}<now()-interval '30 days'`);
    await this.db
      .delete(s.tokens)
      .where(
        sql`${s.tokens.expiresAt}<now()-interval '24 hours' and not exists(select 1 from email_deliveries where token_id=${s.tokens.id})`,
      );
    await this.db
      .delete(s.quotes)
      .where(sql`${s.quotes.expiresAt}<now()-interval '24 hours'`);
    await this.db
      .update(s.attempts)
      .set({ payloadHash: null, result: null })
      .where(
        sql`${s.attempts.expiresAt}<now() and ${s.attempts.result} is not null`,
      );
    await this.db
      .update(s.imageUploads)
      .set({
        payloadHash: null,
        result: { status: 409, body: { code: 'IDEMPOTENCY_EXPIRED' } },
      })
      .where(
        sql`${s.imageUploads.expiresAt}<now() and ${s.imageUploads.payloadHash} is not null`,
      );
  }
}

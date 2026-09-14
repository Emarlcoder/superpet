import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Auth } from '../dist/domain/auth.js';
import { Commerce } from '../dist/domain/commerce.js';
import { CommerceController } from '../dist/http/controller.js';
import { ErrorFilter } from '../dist/http/error-filter.js';

describe('CSRF HTTP transport for the same-origin proxy', () => {
  const origin = 'https://superpet-web.vercel.app';
  const sessions = [];
  let app;
  let base;
  beforeAll(async () => {
    // Stub only persistence; exercise the real controller, origin check and cookie.
    const db = {
      execute: async () => ({ rows: [{ count: 1 }] }),
      insert: () => ({
        values: async (session) => sessions.push(session),
      }),
    };
    class TestModule {}
    Module({
      controllers: [CommerceController],
      providers: [
        { provide: Commerce, useValue: {} },
        {
          provide: Auth,
          useValue: new Auth(db, origin, 'test-secret'.repeat(4), true),
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix('/api/v1');
    app.useGlobalFilters(new ErrorFilter());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });

  it.each(['POST', 'GET'])(
    '%s issues a JSON token and secure host-only cookie',
    async (method) => {
      const response = await fetch(base + '/api/v1/auth/csrf', {
        method,
        headers: { Origin: origin },
      });
      expect(response.status).toBe(200);
      expect((await response.json()).csrfToken).toMatch(/^[\w-]{43}$/);
      const cookie = response.headers.get('set-cookie');
      expect(cookie).toMatch(/^__Host-superpet_session=/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
      expect(cookie).not.toContain('Domain=');
    },
  );

  it.each([undefined, 'https://foreign.invalid'])(
    'rejects POST with untrusted or absent Origin %s',
    async (untrustedOrigin) => {
      const before = sessions.length;
      const response = await fetch(base + '/api/v1/auth/csrf', {
        method: 'POST',
        headers: untrustedOrigin ? { Origin: untrustedOrigin } : {},
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'ORIGIN_REJECTED' });
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(sessions).toHaveLength(before);
    },
  );
});

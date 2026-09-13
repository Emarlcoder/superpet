import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// Test emitted JavaScript so Nest receives TypeScript decorator metadata.
import { createApp } from '../dist/app.js';
import { readConfig } from '../dist/config.js';

describe('API bootstrap', () => {
  let app;
  let base;
  beforeAll(async () => {
    app = await createApp({
      port: 0,
      host: '127.0.0.1',
      webOrigin: 'http://localhost:3000',
    });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('boots real Nest dependency injection and serves versioned liveness', async () => {
    const response = await fetch(base + '/api/v1/health', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:3000',
    );
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'superpet-api',
    });
  });

  it('does not reflect an arbitrary CORS origin', async () => {
    const response = await fetch(base + '/api/v1/health', {
      headers: { Origin: 'https://untrusted.invalid' },
    });
    expect(response.headers.get('access-control-allow-origin')).not.toBe(
      'https://untrusted.invalid',
    );
  });

  it('has no unprotected administrative endpoint', async () => {
    expect((await fetch(base + '/api/v1/admin/purchases')).status).toBe(404);
  });
});

describe('environment validation', () => {
  it.each(['0', '-1', '3001junk', '65536', '1.5'])(
    'rejects invalid port %s',
    (PORT) => {
      expect(() => readConfig({ PORT })).toThrow();
    },
  );
  it('rejects paths and non-HTTPS production origins', () => {
    expect(() =>
      readConfig({ WEB_ORIGIN: 'http://localhost:3000/path' }),
    ).toThrow();
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow();
  });
});

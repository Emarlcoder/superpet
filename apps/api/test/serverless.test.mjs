import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import handler from '../api/index.mjs';

describe('Vercel handler using the emitted Nest application', () => {
  let server;
  let base;
  beforeAll(async () => {
    vi.stubEnv('PORT', '/tmp/vercel-internal.sock');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEB_ORIGIN', 'https://superpet-web.vercel.app');
    vi.stubEnv('DATABASE_URL', undefined);
    server = createServer((req, res) => {
      handler(req, res).catch(() => {
        res.statusCode = 500;
        res.end('Handler bootstrap failed');
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    vi.unstubAllEnvs();
  });

  it('ignores the platform socket and serves JSON with real dependency injection', async () => {
    const responses = await Promise.all([
      fetch(base + '/api/v1/health'),
      fetch(base + '/api/v1/health'),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
      expect(await response.json()).toEqual({
        status: 'ok',
        service: 'superpet-api',
      });
    }
  });

  it('routes missing endpoints through the JSON error filter', async () => {
    const response = await fetch(base + '/api/v1/missing');
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});

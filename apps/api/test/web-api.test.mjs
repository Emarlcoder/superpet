import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../../web/lib/api.ts';
import nextConfig from '../../web/next.config.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Web API responses and admin session requests', () => {
  it.each([
    [404, 'text/html', '<!DOCTYPE html><h1>Not Found</h1>'],
    [500, 'text/plain', 'Internal Server Error'],
    [200, 'application/json', '{"incomplete":'],
    [200, 'application/json', 'null'],
  ])(
    'reports a readable service error for status %i and %s',
    async (status, contentType, body) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(body, {
            status,
            headers: { 'Content-Type': contentType },
          }),
        ),
      );

      const error = await api('/auth/login').catch((cause) => cause);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: 'API_UNAVAILABLE',
        status,
        message:
          'No pudimos conectar con el servicio. Intentá nuevamente en unos minutos.',
      });
      expect(error.message).not.toContain(body);
      expect(error.message).not.toContain('<');
    },
  );

  it('preserves the user-facing message for invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
            { status: 401 },
          ),
        ),
    );

    await expect(api('/auth/login')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
      message: 'Usuario o contraseña incorrectos.',
    });
  });

  it('accepts a successful empty response and sends session cookies on the same origin', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await expect(
      api('/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': 'test-csrf' },
        signal,
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'test-csrf' },
      signal,
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('returns JSON success data unchanged', async () => {
    const session = { username: 'test-admin', csrfToken: 'test-token' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(session)));

    await expect(api('/auth/session')).resolves.toEqual(session);
  });
});

describe('Web API reverse proxy', () => {
  it('forwards API paths to the configured backend and preserves the API prefix', async () => {
    vi.stubEnv('API_ORIGIN', 'https://api.example.invalid/');

    await expect(nextConfig.rewrites()).resolves.toEqual([
      {
        source: '/api/v1/:path*',
        destination: 'https://api.example.invalid/api/v1/:path*',
      },
    ]);
  });

  it('uses the local API when an origin is not configured', async () => {
    vi.stubEnv('API_ORIGIN', undefined);

    await expect(nextConfig.rewrites()).resolves.toEqual([
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3001/api/v1/:path*',
      },
    ]);
  });

  it.each([
    'not-a-url',
    'ftp://api.example.invalid',
    'https://user:password@api.example.invalid',
    'https://api.example.invalid/api/v1',
    'https://api.example.invalid?target=other',
    'https://api.example.invalid#fragment',
  ])('rejects an invalid API origin: %s', async (origin) => {
    vi.stubEnv('API_ORIGIN', origin);

    await expect(nextConfig.rewrites()).rejects.toThrow();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  passwordPolicy,
  passwordHash,
  passwordVerify,
} from '../dist/domain/auth.js';
import { sendMail } from '../dist/domain/mail.js';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('Password boundaries and bounded email adapter', () => {
  it('accepts Unicode and spaces exactly, rejects invalid length and common passwords', async () => {
    expect(() => passwordPolicy('a'.repeat(14))).toThrow();
    expect(() => passwordPolicy('a'.repeat(129))).toThrow();
    expect(() => passwordPolicy('passwordpassword')).toThrow();
    const phrase = '  Frase 🐾 única de prueba  ';
    expect(() => passwordPolicy(phrase)).not.toThrow();
    const hash = await passwordHash(phrase);
    expect(await passwordVerify(hash, phrase)).toBe(true);
    expect(await passwordVerify(hash, phrase.trim())).toBe(false);
  });
  it('retries transient mail failures with an identical payload and idempotency key', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'test@example.invalid');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'test-provider-id' }), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const result = await sendMail({
      id: 'test-delivery',
      to: 'recipient@example.invalid',
      subject: 'Test',
      text: 'Test-only message',
    });
    expect(result.status).toBe('accepted');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(
      'email/test-delivery',
    );
  });
  it('does not retry a rejected destination or configuration', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'test@example.invalid');
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 422 }));
    vi.stubGlobal('fetch', fetch);
    expect(
      (
        await sendMail({
          id: 'rejected',
          to: 'recipient@example.invalid',
          subject: 'Test',
          text: 'Test',
        })
      ).status,
    ).toBe('failed');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

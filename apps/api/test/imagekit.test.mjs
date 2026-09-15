import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  putImagekit,
  deleteImagekit,
  imagekitUrl,
} from '../dist/http/imagekit.js';

const key = 'ik-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-abcdef012345';
beforeEach(() => {
  vi.stubEnv('IMAGEKIT_PRIVATE_KEY', 'test-only-key');
  vi.stubEnv('IMAGEKIT_URL_ENDPOINT', 'https://ik.imagekit.io/test/');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('ImageKit storage', () => {
  it('only serves generated public variants and never originals or arbitrary paths', () => {
    expect(imagekitUrl(key + '-320.webp')).toBe(
      'https://ik.imagekit.io/test/superpet/public/' + key + '-320.webp',
    );
    for (const invalid of [
      key + '.original',
      '../secret',
      'https://evil.test/a',
    ]) {
      expect(() => imagekitUrl(invalid)).toThrow();
    }
  });
  it('uploads private originals and public variants with deterministic names', async () => {
    const fetchMock = vi.fn(
      async (_url, options) =>
        new Response(
          JSON.stringify({
            filePath:
              options.body.get('folder') + '/' + options.body.get('fileName'),
            isPrivateFile: options.body.get('isPrivateFile') === 'true',
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await putImagekit(key + '.original', Buffer.from('test'), true);
    await putImagekit(key + '-320.webp', Buffer.from('test'), false);
    expect(fetchMock.mock.calls[0][1].body.get('folder')).toBe(
      '/superpet/originals',
    );
    expect(fetchMock.mock.calls[0][1].body.get('useUniqueFileName')).toBe(
      'false',
    );
    expect(fetchMock.mock.calls[1][1].body.get('folder')).toBe(
      '/superpet/public',
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Basic ' + Buffer.from('test-only-key:').toString('base64'),
    );
  });
  it('rejects a provider response that failed to keep the original private', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              filePath: '/superpet/originals/' + key + '.original',
              isPrivateFile: false,
            }),
          ),
      ),
    );
    await expect(
      putImagekit(key + '.original', Buffer.from('test'), true),
    ).rejects.toThrow();
  });
  it('does not leak provider errors or credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('test-only-key', { status: 401 })),
    );
    await expect(
      putImagekit(key + '-320.webp', Buffer.from('test'), false),
    ).rejects.toMatchObject({ code: 'IMAGE_STORAGE_UNAVAILABLE' });
  });
  it('only deletes exact paths and accepts an already-deleted file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              fileId: 'ours',
              filePath: '/superpet/public/' + key + '-320.webp',
            },
            { fileId: 'other', filePath: '/other/' + key + '-320.webp' },
          ]),
        ),
      )
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await deleteImagekit(key + '-320.webp', false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.imagekit.io/v1/files/ours',
    );
  });
});

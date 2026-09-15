import { ensure } from '../domain/errors.js';

const keyPattern = /^ik-[a-f0-9-]+(?:\.original|-(?:320|640|1280)\.webp)$/;
const publicPattern = /^ik-[a-f0-9-]+-(?:320|640|1280)\.webp$/;

function authorization() {
  ensure(process.env.IMAGEKIT_PRIVATE_KEY, 'MEDIA_NOT_CONFIGURED', 503);
  return (
    'Basic ' +
    Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')
  );
}

export function imagekitUrl(key: string) {
  ensure(publicPattern.test(key), 'NOT_FOUND', 404);
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  ensure(
    endpoint &&
      /^https:\/\/ik\.imagekit\.io\/[a-zA-Z0-9_-]+\/?$/.test(endpoint),
    'MEDIA_NOT_CONFIGURED',
    503,
  );
  return endpoint.replace(/\/$/, '') + '/superpet/public/' + key;
}

export async function putImagekit(
  key: string,
  bytes: Buffer,
  privateFile: boolean,
) {
  ensure(
    keyPattern.test(key) && privateFile === key.endsWith('.original'),
    'IMAGE_INVALID',
    422,
  );
  // Validate delivery configuration before creating any remote objects.
  imagekitUrl(key.replace(/\.original$/, '-320.webp'));
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(bytes)]), key);
  form.set('fileName', key);
  form.set('folder', '/superpet/' + (privateFile ? 'originals' : 'public'));
  form.set('useUniqueFileName', 'false');
  form.set('overwriteFile', 'true');
  form.set('isPrivateFile', String(privateFile));
  form.set('responseFields', 'isPrivateFile');
  const response = await fetch(
    'https://upload.imagekit.io/api/v1/files/upload',
    {
      method: 'POST',
      headers: { Authorization: authorization() },
      body: form,
      signal: AbortSignal.timeout(12000),
    },
  );
  ensure(response.ok, 'IMAGE_STORAGE_UNAVAILABLE', 503);
  const result = (await response.json()) as {
    filePath?: string;
    isPrivateFile?: boolean;
  };
  ensure(
    result.filePath === form.get('folder') + '/' + key &&
      result.isPrivateFile === privateFile,
    'IMAGE_STORAGE_UNAVAILABLE',
    503,
  );
}

export async function deleteImagekit(key: string, privateFile: boolean) {
  ensure(
    keyPattern.test(key) && privateFile === key.endsWith('.original'),
    'IMAGE_INVALID',
    422,
  );
  const folder = '/superpet/' + (privateFile ? 'originals' : 'public');
  const query = new URLSearchParams({
    path: folder,
    searchQuery: 'name="' + key + '"',
    limit: '100',
  });
  const headers = { Authorization: authorization() };
  const response = await fetch('https://api.imagekit.io/v1/files?' + query, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  ensure(response.ok, 'IMAGE_STORAGE_UNAVAILABLE', 503);
  const files = (await response.json()) as Array<{
    fileId: string;
    filePath: string;
  }>;
  ensure(Array.isArray(files), 'IMAGE_STORAGE_UNAVAILABLE', 503);
  for (const file of files) {
    // Never delete a fuzzy match or an object outside this application's folder.
    if (file.filePath !== folder + '/' + key) continue;
    ensure(
      typeof file.fileId === 'string' && file.fileId.length > 0,
      'IMAGE_STORAGE_UNAVAILABLE',
      503,
    );
    const removed = await fetch(
      'https://api.imagekit.io/v1/files/' + encodeURIComponent(file.fileId),
      {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(8000),
      },
    );
    ensure(
      removed.ok || removed.status === 404,
      'IMAGE_STORAGE_UNAVAILABLE',
      503,
    );
  }
}

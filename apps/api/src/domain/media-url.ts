// Only public derivatives receive delivery URLs. Never expose originals or credentials.
export function publicImageUrl(key: string): string | undefined {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (
    !/^ik-[a-f0-9-]+-(320|640|1280)\.webp$/.test(key) ||
    !endpoint ||
    !/^https:\/\/ik\.imagekit\.io\/[a-zA-Z0-9_-]+\/?$/.test(endpoint)
  )
    return undefined;
  return endpoint.replace(/\/$/, '') + '/superpet/public/' + key;
}

export function productSlug(name: string, sequence = 1) {
  const base =
    name
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  const suffix = sequence > 1 ? `-${sequence}` : '';
  return base.slice(0, 160 - suffix.length).replace(/-+$/g, '') + suffix;
}

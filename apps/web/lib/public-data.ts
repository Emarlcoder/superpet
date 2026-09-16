import 'server-only';
import type { Product, Promotion } from './api';

export type CatalogFilters = {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
};
export function apiOrigin() {
  const url = new URL(process.env.API_ORIGIN ?? 'http://localhost:3001');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid API_ORIGIN');
  return url.origin;
}
async function readPublic<T>(
  path: string,
  tag?: string,
  seconds = 60,
): Promise<T> {
  const response = await fetch(apiOrigin() + '/api/v1' + path, {
    ...(tag
      ? {
          cache: 'force-cache' as const,
          next: { revalidate: seconds, tags: [tag] },
        }
      : { cache: 'no-store' as const }),
    signal: AbortSignal.timeout(8000),
    // Public reads intentionally never forward cookies or authentication headers.
  });
  if (!response.ok) throw new Error('Public data unavailable');
  return response.json() as Promise<T>;
}
export const getPromotions = () =>
  readPublic<Promotion[]>('/promotions', 'public-promotions');
export const getFilters = () =>
  readPublic<CatalogFilters>('/catalog/filters', 'public-filters', 300);
export const getHomeProducts = () =>
  readPublic<{ items: Product[] }>('/products?limit=8');

'use server';
import { cookies } from 'next/headers';
import { updateTag } from 'next/cache';
import { apiOrigin } from '../../lib/public-data';

export async function refreshPublicContent() {
  const cookie = (await cookies()).toString();
  if (!cookie) return false;
  const response = await fetch(apiOrigin() + '/api/v1/auth/me', {
    headers: { Cookie: cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return false;
  updateTag('public-promotions');
  updateTag('public-filters');
  return true;
}
